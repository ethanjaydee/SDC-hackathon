import { Router } from "express";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { demoSites } from "./demoSites.js";
import { candidateEligibility, classifyRepair, seedWorkshopDemo } from "./workshopDemo.js";
import { analyzeRepair, recommendWorkshopTechnicians, summarizeCustomerReviews } from "./dispatchIntelligence.js";
import { isOfferStale } from "./offerFreshness.js";
import { prepareTelegramStorage, createTelegramStorage } from "./telegramStore.js";
import { sendTelegramMessage, TelegramDeliveryError } from "./telegramTransport.js";
import {
  AnalyzeRequestBody,
  AnalyzeRequestResponse,
  RecommendTechniciansResponse,
  ApproveDispatchBody,
  ApproveDispatchResponse,
  CompleteDispatchBody,
  CompleteDispatchResponse,
  ResetTechnicianAvailabilityBody,
  ResetTechnicianAvailabilityResponse,
  GetHubDataResponse,
  ListSupplierCatalogProvidersResponse,
  ListSupplierQuotesQueryParams,
  ListSupplierQuotesResponse,
  SearchSupplierCatalogQueryParams,
  SearchSupplierCatalogResponse,
  SaveSupplierQuoteBody,
  SaveSupplierQuoteResponse,
  ListReorderDraftsResponse,
  CreateReorderDraftBody,
  CreateReorderDraftResponse,
  ApproveReorderDraftBody,
  ApproveReorderDraftResponse,
  ListConversationsResponse,
  GetConversationThreadParams,
  GetConversationThreadResponse,
  SendTelegramReplyBody,
  SendTelegramReplyResponse,
  SendConversationMessageBody,
  SendConversationMessageResponse,
  AnalyzeConversationResponse,
  SetConversationSiteBody,
  CreateWorkshopReviewBody,
  CreateWorkshopReviewResponse,
  ListWorkshopReviewsResponse,
  SummarizeWorkshopReviewsResponse,
} from "@workspace/api-zod";

// The managed Express service mounts this router at /api.
// SQLite is intentionally local for this synthetic MVP; use persistent storage
// and access control before treating this as a production multi-user system.
const dataDirectory = resolve(process.cwd(), "data");
mkdirSync(dataDirectory, { recursive: true });
const db = new Database(resolve(dataDirectory, "dispatch-hub.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
db.exec(`
  CREATE TABLE IF NOT EXISTS technicians (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Available', 'Busy')),
    zone TEXT NOT NULL,
    van_id INTEGER NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY,
    van_id INTEGER NOT NULL REFERENCES technicians(van_id),
    part_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity >= 0),
    UNIQUE(van_id, part_name)
  );
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    action_details TEXT NOT NULL,
    approved_by TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS dispatches (
    activity_id INTEGER PRIMARY KEY REFERENCES activity_log(id),
    tech_id INTEGER NOT NULL REFERENCES technicians(id),
    technician_name TEXT NOT NULL,
    van_id INTEGER NOT NULL,
    parts_json TEXT NOT NULL,
    customer_site_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS conversation_threads (
    id INTEGER PRIMARY KEY,
    customer_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    customer_site_id TEXT CHECK(customer_site_id IN ('north', 'central', 'south')),
    technician_id INTEGER REFERENCES technicians(id),
    mock_summary TEXT NOT NULL DEFAULT '',
    analysis_json TEXT,
    analysis_message_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS conversation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversation_threads(id),
    sender_role TEXT NOT NULL CHECK(sender_role IN ('Customer', 'Technician', 'Staff')),
    sender_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS conversation_messages_thread
    ON conversation_messages(conversation_id, id);
  CREATE TABLE IF NOT EXISTS customer_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL CHECK(length(trim(comment)) BETWEEN 3 AND 1000),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS customer_reviews_recent
    ON customer_reviews(id DESC);
  CREATE TABLE IF NOT EXISTS supplier_quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_term TEXT NOT NULL,
    part_name TEXT NOT NULL,
    part_number TEXT,
    product_name TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    product_url TEXT NOT NULL,
    price_myr REAL NOT NULL CHECK(price_myr > 0),
    quality_rating INTEGER NOT NULL CHECK(quality_rating BETWEEN 1 AND 5),
    quality_evidence_note TEXT NOT NULL,
    package_quantity INTEGER NOT NULL DEFAULT 1 CHECK(package_quantity > 0),
    minimum_order_packs INTEGER NOT NULL DEFAULT 1 CHECK(minimum_order_packs > 0),
    shipping_myr REAL CHECK(shipping_myr IS NULL OR shipping_myr >= 0),
    checked_at TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'captured_quote' CHECK(source_type = 'captured_quote'),
    availability_note TEXT NOT NULL,
    trust_evidence_url TEXT,
    trust_evidence_note TEXT
  );
  CREATE TABLE IF NOT EXISTS reorder_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL REFERENCES inventory(id),
    van_id INTEGER NOT NULL,
    part_name TEXT NOT NULL,
    quantity_on_hand INTEGER NOT NULL CHECK(quantity_on_hand >= 0),
    source_type TEXT NOT NULL CHECK(source_type IN ('captured_quote', 'live_catalog')),
    source_offer_id TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_url TEXT NOT NULL,
    unit_price_myr REAL NOT NULL CHECK(unit_price_myr > 0),
    pack_price_myr REAL NOT NULL CHECK(pack_price_myr > 0),
    package_quantity INTEGER CHECK(package_quantity IS NULL OR package_quantity > 0),
    minimum_order_packs INTEGER CHECK(minimum_order_packs IS NULL OR minimum_order_packs > 0),
    shipping_myr REAL CHECK(shipping_myr IS NULL OR shipping_myr >= 0),
    availability_note TEXT NOT NULL CHECK(availability_note IN ('In stock', 'Limited stock', 'Out of stock', 'Not checked')),
    offer_checked_at TEXT NOT NULL,
    offer_stale INTEGER NOT NULL CHECK(offer_stale IN (0, 1)),
    requested_quantity INTEGER NOT NULL CHECK(requested_quantity > 0),
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Approved')),
    approved_at TEXT,
    approved_by TEXT
  );
  CREATE INDEX IF NOT EXISTS reorder_drafts_status_created
    ON reorder_drafts(status, created_at DESC, id DESC);
  CREATE TRIGGER IF NOT EXISTS activity_log_no_update
    BEFORE UPDATE ON activity_log BEGIN
      SELECT RAISE(ABORT, 'Activity log is immutable');
    END;
  CREATE TRIGGER IF NOT EXISTS activity_log_no_delete
    BEFORE DELETE ON activity_log BEGIN
      SELECT RAISE(ABORT, 'Activity log is immutable');
    END;
`);

prepareTelegramStorage(db);

// Add lifecycle metadata without rewriting any historical audit entries.
db.transaction(() => {
  const columns = db.prepare("PRAGMA table_info(dispatches)").all();
  if (!columns.some((column) => column.name === "status")) {
    db.exec(`
      ALTER TABLE dispatches ADD COLUMN status TEXT NOT NULL DEFAULT 'Unknown'
        CHECK(status IN ('Active', 'Completed', 'Unknown'));
      ALTER TABLE dispatches ADD COLUMN completion_activity_id INTEGER REFERENCES activity_log(id);
      UPDATE dispatches SET status = 'Active'
      WHERE tech_id IN (SELECT id FROM technicians WHERE status = 'Busy')
        AND tech_id IN (SELECT tech_id FROM dispatches GROUP BY tech_id HAVING COUNT(*) = 1);
    `);
  }
  if (!columns.some((column) => column.name === "conversation_id")) {
    db.exec("ALTER TABLE dispatches ADD COLUMN conversation_id INTEGER REFERENCES conversation_threads(id)");
  }
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_dispatch_per_tech
      ON dispatches(tech_id) WHERE status = 'Active';
    CREATE UNIQUE INDEX IF NOT EXISTS one_dispatch_per_completion
      ON dispatches(completion_activity_id) WHERE completion_activity_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS one_dispatch_per_conversation
      ON dispatches(conversation_id) WHERE conversation_id IS NOT NULL;
  `);
}).immediate();

db.transaction(() => {
  if (db.prepare("SELECT id FROM technicians LIMIT 1").get()) return;
  const insertTechnician = db.prepare(
    "INSERT INTO technicians (id, name, status, zone, van_id) VALUES (?, ?, ?, ?, ?)",
  );
  insertTechnician.run(1, "Tech A", "Available", "North Zone", 1);
  insertTechnician.run(2, "Tech B", "Available", "Central Zone", 2);
  insertTechnician.run(3, "Tech C", "Busy", "South Zone", 3);
  const insertPart = db.prepare(
    "INSERT INTO inventory (van_id, part_name, quantity) VALUES (?, ?, ?)",
  );
  for (const row of [
    [1, "100uF Capacitor", 8],
    [1, "NPN Transistor", 5],
    [1, "Wix 57356 Filter", 2],
    [2, "100uF Capacitor", 3],
    [2, "NPN Transistor", 1],
    [2, "12V Relay", 6],
    [3, "Wix 57356 Filter", 7],
    [3, "100uF Capacitor", 0],
    [3, "NPN Transistor", 4],
  ]) insertPart.run(...row);
}).immediate();

const seedDemoConversations = db.transaction(() => {
  if (db.prepare("SELECT 1 FROM conversation_threads LIMIT 1").get()) return;
  const now = Date.now();
  const insertThread = db.prepare(`
    INSERT INTO conversation_threads
      (id, customer_name, subject, customer_site_id, technician_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMessage = db.prepare(`
    INSERT INTO conversation_messages (conversation_id, sender_role, sender_name, text, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const demos = [
    {
      id: 1, customer: "North Demo Customer", subject: "Instrument cluster loses power",
      site: "north", technicianId: 1, technician: "Tech A",
      messages: [
        ["Customer", "The instrument cluster went dark during our last trip. The speedometer needle stopped and there was a warm smell near the panel."],
        ["Technician", "I checked the accessible connector and fuse. The display still loses power, so the board needs a closer inspection."],
        ["Customer", "Please let me know what parts may be needed before the morning booking."],
      ],
    },
    {
      id: 2, customer: "Central Demo Customer", subject: "Oil filter housing is seeping",
      site: "central", technicianId: 3, technician: "Tech C",
      messages: [
        ["Customer", "There is fresh oil around the Wix 57356 filter housing after today's run. The pressure gauge looks normal."],
        ["Technician", "I can see a small seep near the filter seal. I will verify the housing and filter fit before replacing anything."],
        ["Customer", "Understood. Please check the filter stock before scheduling a visit."],
      ],
    },
    {
      id: 3, customer: "South Demo Customer", subject: "Accessory power cuts in and out",
      site: "south", technicianId: 2, technician: "Tech B",
      messages: [
        ["Customer", "Cockpit accessory power drops out whenever the navigation lights are switched on."],
        ["Technician", "The 12V relay clicks intermittently. The terminals look worn, but I have not replaced the relay yet."],
        ["Customer", "Please confirm a suitable replacement and dispatch when it is available."],
      ],
    },
  ];
  for (const demo of demos) {
    const firstAt = new Date(now - (demos.length - demo.id) * 60 * 60 * 1000).toISOString();
    insertThread.run(demo.id, demo.customer, demo.subject, demo.site, demo.technicianId, firstAt, firstAt);
    demo.messages.forEach(([role, text], index) => {
      const senderName = role === "Customer" ? demo.customer : demo.technician;
      const createdAt = new Date(Date.parse(firstAt) + (index + 1) * 60 * 1000).toISOString();
      insertMessage.run(demo.id, role, senderName, text, createdAt);
    });
    db.prepare("UPDATE conversation_threads SET mock_summary = ?, updated_at = ? WHERE id = ?")
      .run(buildMockSummary(demo.messages.map(([role, text]) => ({ sender_role: role, text }))), new Date(now - (demos.length - demo.id) * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(), demo.id);
  }
});
seedDemoConversations.immediate();
seedWorkshopDemo(db);

function getHubData() {
  return {
    technicians: db.prepare(`
      SELECT t.id, t.name, t.status, t.zone, COALESCE(p.shared_van_id,t.van_id) AS van_id,
        p.level, p.experience_label, p.rating, p.demo_completed_jobs, p.specialty, p.lat, p.lng
      FROM technicians t LEFT JOIN technician_profiles p ON p.technician_id = t.id ORDER BY t.id
    `).all().map((tech) => tech.level == null
      ? { id: tech.id, name: tech.name, status: tech.status, zone: tech.zone, van_id: tech.van_id }
      : tech),
    inventory: db.prepare("SELECT * FROM inventory ORDER BY van_id, id").all(),
    activity_log: db.prepare(`
      SELECT a.*, d.tech_id, d.technician_name, d.van_id, d.parts_json, d.customer_site_json, d.conversation_id,
        d.status AS dispatch_status, completed.timestamp AS completed_at,
        original.activity_id AS completion_dispatch_id
      FROM activity_log a LEFT JOIN dispatches d ON d.activity_id = a.id
      LEFT JOIN activity_log completed ON completed.id = d.completion_activity_id
      LEFT JOIN dispatches original ON original.completion_activity_id = a.id
      ORDER BY a.id DESC
    `).all().map(({ tech_id, technician_name, van_id, parts_json, customer_site_json, conversation_id, dispatch_status, completed_at, ...activity }) => ({
      ...activity,
      dispatch: tech_id == null ? null : {
        tech_id, technician_name, van_id,
        status: dispatch_status,
        completed_at,
        parts: JSON.parse(parts_json),
        customer_site: JSON.parse(customer_site_json),
        conversation_id,
      },
    })),
  };
}

function buildMockSummary(messages) {
  const customerMessage = [...messages].reverse().find((item) => item.sender_role === "Customer");
  const technicianMessage = [...messages].reverse().find((item) => item.sender_role === "Technician");
  const excerpt = (text) => {
    const compact = text.trim().replace(/\s+/g, " ");
    return compact.length > 150 ? `${compact.slice(0, 147)}…` : compact;
  };
  const lines = [];
  if (customerMessage) lines.push(`Customer: ${excerpt(customerMessage.text)}`);
  if (technicianMessage) lines.push(`Technician: ${excerpt(technicianMessage.text)}`);
  return lines.join(" ");
}

function listConversationSummaries() {
  return db.prepare(`
    SELECT c.id, c.customer_name, c.subject, c.customer_site_id, c.source, c.technician_id,
      t.name AS technician_name, c.mock_summary, c.updated_at,
      COUNT(m.id) AS message_count, d.activity_id AS dispatch_activity_id
    FROM conversation_threads c
    LEFT JOIN technicians t ON t.id = c.technician_id
    LEFT JOIN conversation_messages m ON m.conversation_id = c.id
    LEFT JOIN dispatches d ON d.conversation_id = c.id
    GROUP BY c.id
    ORDER BY c.updated_at DESC, c.id DESC
  `).all().map((thread) => ({
    ...thread,
    complexity: classifyRepair(`${thread.subject} ${db.prepare("SELECT text FROM conversation_messages WHERE conversation_id = ? AND sender_role = 'Customer' ORDER BY id").all(thread.id).map((item) => item.text).join(" ")}`),
    latest_message: db.prepare(`
      SELECT id, conversation_id, sender_role, sender_name, text, created_at
      FROM conversation_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1
    `).get(thread.id),
  }));
}

function getConversationThread(id) {
  const summary = listConversationSummaries().find((item) => item.id === id);
  if (!summary) return null;
  const messages = db.prepare(`
    SELECT id, conversation_id, sender_role, sender_name, text, created_at
    FROM conversation_messages WHERE conversation_id = ? ORDER BY id
  `).all(id);
  const thread = db.prepare("SELECT analysis_json, analysis_message_id FROM conversation_threads WHERE id = ?").get(id);
  return {
    ...summary,
    messages,
    latest_message_id: messages[messages.length - 1]?.id,
    analyzed_through_message_id: thread.analysis_message_id,
    analysis: thread.analysis_json ? JSON.parse(thread.analysis_json) : null,
    can_send_telegram_reply: telegramStorage.hasReplyAddress(id),
  };
}

class ConversationNotFound extends Error {}
class ConversationConflict extends Error {}
class ConversationInputError extends Error {}

const appendConversationMessage = db.transaction(({ id, sender_role, technician_id, text }) => {
  const thread = db.prepare("SELECT * FROM conversation_threads WHERE id = ?").get(id);
  if (!thread) throw new ConversationNotFound("Conversation not found.");

  let senderName = thread.customer_name;
  let updatedTechnicianId = thread.technician_id;
  if (sender_role === "Technician") {
    const participantId = technician_id ?? thread.technician_id;
    const technician = participantId == null ? null : db.prepare("SELECT id, name FROM technicians WHERE id = ?").get(participantId);
    if (!technician) throw new ConversationInputError("Choose an existing technician for the simulated reply.");
    senderName = technician.name;
    updatedTechnicianId = technician.id;
  } else if (technician_id != null) {
    throw new ConversationInputError("Customer messages cannot include a technician.");
  }

  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO conversation_messages (conversation_id, sender_role, sender_name, text, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, sender_role, senderName, text.trim(), createdAt);
  const allMessages = db.prepare(`
    SELECT sender_role, text FROM conversation_messages WHERE conversation_id = ? ORDER BY id
  `).all(id);
  db.prepare(`
    UPDATE conversation_threads
    SET technician_id = ?, mock_summary = ?, updated_at = ?, analysis_json = NULL, analysis_message_id = NULL
    WHERE id = ?
  `).run(updatedTechnicianId, buildMockSummary(allMessages), createdAt, id);
  return getConversationThread(id);
});

const appendTelegramReply = db.transaction(({ id, text }) => {
  const thread = db.prepare("SELECT * FROM conversation_threads WHERE id = ?").get(id);
  if (!thread) throw new ConversationNotFound("Conversation not found.");
  if (thread.source !== "Telegram") throw new ConversationConflict("Replies can only be sent to Telegram conversations.");

  const createdAt = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO conversation_messages (conversation_id, sender_role, sender_name, text, created_at)
    VALUES (?, 'Staff', 'Dispatch team', ?, ?)
  `).run(id, text.trim(), createdAt);
  db.prepare(`
    UPDATE conversation_threads
    SET updated_at = ?, analysis_message_id = CASE WHEN analysis_json IS NOT NULL THEN ? ELSE NULL END
    WHERE id = ?
  `).run(createdAt, Number(result.lastInsertRowid), id);
  return getConversationThread(id);
});

const telegramStorage = createTelegramStorage(db, (message) => appendConversationMessage(message));
export const ingestTelegramUpdate = (botId, update) => telegramStorage.ingest(botId, update);
export const getTelegramCheckpoint = (botId) => telegramStorage.checkpoint(botId);
const telegramReplyLocks = new Set();

export async function analyzeConversation(id) {
  const thread = db.prepare("SELECT id FROM conversation_threads WHERE id = ?").get(id);
  if (!thread) throw new ConversationNotFound("Conversation not found.");
  const messages = db.prepare(`
    SELECT id, sender_role, sender_name, text FROM conversation_messages
    WHERE conversation_id = ? ORDER BY id
  `).all(id);
  if (!messages.some((message) => message.sender_role === "Customer")) {
    throw new ConversationConflict("Add a customer message before analyzing this conversation.");
  }
  const analyzedThrough = messages[messages.length - 1]?.id;
  const transcript = messages.map((message) => `${message.sender_role} (${message.sender_name}): ${message.text}`).join("\n");
  const result = await callRunPodModel(transcript);
  const latest = db.prepare(`
    SELECT id FROM conversation_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1
  `).get(id);
  if (latest?.id !== analyzedThrough) {
    throw new ConversationConflict("This conversation changed during analysis. Analyze the latest messages again.");
  }
  const updatedAt = new Date().toISOString();
  db.prepare(`
    UPDATE conversation_threads
    SET analysis_json = ?, analysis_message_id = ?, updated_at = ?
    WHERE id = ?
  `).run(JSON.stringify(result), analyzedThrough, updatedAt, id);
  return getConversationThread(id);
}

export async function callRunPodModel(text) {
  const catalog = db.prepare("SELECT DISTINCT part_name FROM inventory").all().map((row) => row.part_name);
  return analyzeRepair(text, catalog);
}

class DispatchConflict extends Error {}

const dispatch = db.transaction(({ tech_id, van_id, parts, approved_by, customer_site_id, conversation_id }) => {
  let complexity = classifyRepair(parts.join(" "));
  if (conversation_id != null) {
    const source = db.prepare("SELECT * FROM conversation_threads WHERE id = ?").get(conversation_id);
    if (!source) throw new DispatchConflict("The selected conversation no longer exists. Refresh and review another request.");
    const latest = db.prepare(`
      SELECT id FROM conversation_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1
    `).get(conversation_id);
    const analyzed = source.analysis_json ? JSON.parse(source.analysis_json) : null;
    complexity = analyzed?.complexity ?? classifyRepair(source.subject);
    const sameParts = analyzed && Array.isArray(analyzed.parts) &&
      [...analyzed.parts].map((part) => part.trim().toLowerCase()).sort().join("\n") ===
      [...parts].map((part) => part.trim().toLowerCase()).sort().join("\n");
    if (!latest || source.analysis_message_id !== latest.id || !sameParts) {
      throw new DispatchConflict("The conversation or its analysis changed. Review the latest messages and analyze again.");
    }
    if (source.customer_site_id !== customer_site_id) {
      throw new DispatchConflict("The dispatch site does not match the selected customer conversation.");
    }
    if (db.prepare("SELECT 1 FROM dispatches WHERE conversation_id = ?").get(conversation_id)) {
      throw new DispatchConflict("This conversation already has a saved dispatch.");
    }
  }
  const currentHub = getHubData();
  const technician = currentHub.technicians.find((tech) => tech.id === tech_id && tech.van_id === van_id);
  if (!technician || technician.status !== "Available" ||
    db.prepare("SELECT 1 FROM dispatches WHERE tech_id = ? AND status = 'Active'").get(tech_id)) {
    throw new DispatchConflict("This technician is no longer available for this van. Refresh and choose another match.");
  }
  const ineligible = candidateEligibility(currentHub, technician, parts, complexity);
  if (ineligible) throw new DispatchConflict(ineligible);
  // Repeated part names represent multiple units; validate aggregated demand.
  const required = new Map();
  for (const part of parts) required.set(part, (required.get(part) ?? 0) + 1);
  for (const [part, quantity] of required) {
    const result = db.prepare(
      "UPDATE inventory SET quantity = quantity - ? WHERE van_id = ? AND part_name = ? AND quantity >= ?",
    ).run(quantity, van_id, part, quantity);
    if (result.changes !== 1) {
      throw new DispatchConflict(`Insufficient stock for ${part} in Van ${van_id}. No inventory was deducted.`);
    }
  }
  db.prepare("UPDATE technicians SET status = 'Busy' WHERE id = ?").run(tech_id);
  const activity = db.prepare(
    "INSERT INTO activity_log (timestamp, action_details, approved_by) VALUES (?, ?, ?)",
  ).run(
    new Date().toISOString(),
    `Dispatch approved: ${technician.name} · Van ${van_id} · ${Array.from(required, ([part, quantity]) => `${part} × ${quantity}`).join(", ")}. Technician set to Busy; stock allocated.`,
    approved_by,
  );
  db.prepare(`
    INSERT INTO dispatches (activity_id, tech_id, technician_name, van_id, parts_json, customer_site_json, status, conversation_id)
    VALUES (?, ?, ?, ?, ?, ?, 'Active', ?)
  `).run(activity.lastInsertRowid, tech_id, technician.name, van_id, JSON.stringify(parts), JSON.stringify(demoSites[customer_site_id]), conversation_id ?? null);
  if (conversation_id != null) {
    db.prepare("UPDATE conversation_threads SET technician_id = ?, updated_at = ? WHERE id = ?")
      .run(tech_id, new Date().toISOString(), conversation_id);
  }
  return getHubData();
});

class DispatchNotFound extends Error {}
class TechnicianNotFound extends Error {}

const completeDispatch = db.transaction(({ dispatch_id, completed_by }) => {
  const job = db.prepare("SELECT * FROM dispatches WHERE activity_id = ?").get(dispatch_id);
  if (!job) throw new DispatchNotFound("No tracked dispatch was found for this approval.");
  if (job.status !== "Active") {
    throw new DispatchConflict(job.status === "Completed"
      ? "This dispatch has already been completed. Refresh to see the current state."
      : "This legacy dispatch has no verified active assignment and cannot safely be completed.");
  }
  const technician = getHubData().technicians.find((tech) => tech.id === job.tech_id);
  if (!technician || technician.status !== "Busy" || technician.van_id !== job.van_id ||
    db.prepare("SELECT 1 FROM dispatches WHERE tech_id = ? AND status = 'Active' AND activity_id != ?").get(job.tech_id, dispatch_id)) {
    throw new DispatchConflict("The technician assignment has changed. Refresh before completing this job.");
  }
  const event = db.prepare(
    "INSERT INTO activity_log (timestamp, action_details, approved_by) VALUES (?, ?, ?)",
  ).run(new Date().toISOString(),
    `Job completed: Dispatch #${dispatch_id} · ${job.technician_name} · Van ${job.van_id}. Technician set to Available; consumed stock unchanged.`,
    completed_by);
  db.prepare("UPDATE dispatches SET status = 'Completed', completion_activity_id = ? WHERE activity_id = ? AND status = 'Active'")
    .run(event.lastInsertRowid, dispatch_id);
  db.prepare("UPDATE technicians SET status = 'Available' WHERE id = ?").run(job.tech_id);
  return getHubData();
});

const resetTechnicianAvailability = db.transaction(({ technician_id, reset_by }) => {
  const technician = db.prepare(
    "SELECT * FROM technicians WHERE id = ?",
  ).get(technician_id);
  if (!technician) throw new TechnicianNotFound("Technician not found.");
  if (technician.status !== "Busy") {
    throw new DispatchConflict("This technician is already Available.");
  }
  if (db.prepare("SELECT 1 FROM dispatches WHERE tech_id = ? AND status = 'Active'").get(technician_id)) {
    throw new DispatchConflict("This technician has an active dispatch. Complete that job instead of resetting availability.");
  }

  const updated = db.prepare(
    "UPDATE technicians SET status = 'Available' WHERE id = ? AND status = 'Busy'",
  ).run(technician_id);
  if (updated.changes !== 1) {
    throw new DispatchConflict("The technician's status changed. Refresh and try again.");
  }
  db.prepare(
    "INSERT INTO activity_log (timestamp, action_details, approved_by) VALUES (?, ?, ?)",
  ).run(
    new Date().toISOString(),
    `Technician availability reset: ${technician.name} set to Available. Previous dispatch history and inventory unchanged.`,
    reset_by,
  );
  return getHubData();
});

const router = Router();
const recommendationCache = new Map();

router.post("/conversations/:id/recommendations", async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: "Choose a valid conversation." }); return; }
  const thread = getConversationThread(id);
  if (!thread) { res.status(404).json({ error: "Conversation not found." }); return; }
  const site = demoSites[thread.customer_site_id];
  if (!thread.analysis || thread.analyzed_through_message_id !== thread.latest_message_id || !site || thread.dispatch_activity_id != null) {
    res.status(409).json({ error: "Analyze the latest messages and choose a customer site before requesting a recommendation." }); return;
  }
  const hub = getHubData();
  const fingerprint = JSON.stringify(hub);
  const key = `${id}:${thread.latest_message_id}:${thread.customer_site_id}:${JSON.stringify(thread.analysis)}:${fingerprint}`;
  try {
    for (const [cacheKey, item] of recommendationCache) if (item.expires < Date.now()) recommendationCache.delete(cacheKey);
    if (recommendationCache.size >= 100) recommendationCache.delete(recommendationCache.keys().next().value);
    let item = recommendationCache.get(key);
    if (!item) {
      item = { expires: Date.now() + 60_000, result: recommendWorkshopTechnicians(hub, thread, site) };
      recommendationCache.set(key, item);
    }
    const result = await item.result;
    const latest = getConversationThread(id);
    if (!latest || latest.latest_message_id !== thread.latest_message_id || latest.customer_site_id !== thread.customer_site_id ||
      latest.dispatch_activity_id != null || JSON.stringify(latest.analysis) !== JSON.stringify(thread.analysis) || JSON.stringify(getHubData()) !== fingerprint) {
      recommendationCache.delete(key);
      res.status(409).json({ error: "The request or team state changed. Refresh the recommendation." }); return;
    }
    res.json(RecommendTechniciansResponse.parse(result));
  } catch (error) {
    recommendationCache.delete(key);
    next(error);
  }
});

function listReorderDrafts() {
  return {
    reorders: db.prepare(`
      SELECT * FROM reorder_drafts
      ORDER BY created_at DESC, id DESC
    `).all().map((reorder) => ({
      ...reorder,
      offer_stale: Boolean(reorder.offer_stale),
    })),
  };
}

class ReorderNotFound extends Error {}
class ReorderConflict extends Error {}

const createReorderDraft = db.transaction((input) => {
  const stock = db.prepare("SELECT * FROM inventory WHERE id = ?").get(input.inventory_id);
  if (!stock) throw new ReorderNotFound("The selected stock line no longer exists.");
  if (stock.part_name.toLowerCase() !== input.part_name.trim().toLowerCase()) {
    throw new ReorderConflict("The selected supplier offer does not match this stock line.");
  }
  if (input.availability_note === "Out of stock") {
    throw new ReorderConflict("This supplier offer is marked out of stock. Choose another offer.");
  }

  let offerSnapshot = input;
  if (input.source_type === "captured_quote") {
    const match = /^quote-(\d+)$/.exec(input.source_offer_id);
    if (!match) throw new ReorderConflict("The selected captured quote could not be verified.");
    const quote = db.prepare(`
      SELECT * FROM supplier_quotes WHERE id = ? AND lower(part_name) = lower(?)
    `).get(Number(match[1]), stock.part_name);
    if (!quote) throw new ReorderConflict("The selected supplier quote no longer matches this stock line.");
    offerSnapshot = {
      ...input,
      supplier_name: quote.supplier_name,
      product_name: quote.product_name,
      product_url: quote.product_url,
      unit_price_myr: (quote.price_myr * quote.minimum_order_packs + (quote.shipping_myr ?? 0)) /
        (quote.package_quantity * quote.minimum_order_packs),
      pack_price_myr: quote.price_myr,
      package_quantity: quote.package_quantity,
      minimum_order_packs: quote.minimum_order_packs,
      shipping_myr: quote.shipping_myr,
      availability_note: quote.availability_note,
      offer_checked_at: quote.checked_at,
      offer_stale: Date.now() - new Date(quote.checked_at).getTime() > supplierCatalogStaleAfterMs,
    };
    if (offerSnapshot.availability_note === "Out of stock") {
      throw new ReorderConflict("This supplier offer is marked out of stock. Choose another offer.");
    }
  } else if (!input.source_offer_id.startsWith("live-")) {
    throw new ReorderConflict("The selected live supplier offer could not be verified.");
  }
  let productUrl;
  try {
    productUrl = new URL(offerSnapshot.product_url);
  } catch {
    throw new ReorderConflict("The selected supplier offer has an invalid product link.");
  }
  if (!["http:", "https:"].includes(productUrl.protocol) || productUrl.username || productUrl.password) {
    throw new ReorderConflict("The selected supplier offer has an invalid product link.");
  }

  const createdAt = new Date().toISOString();
  const offerCheckedAt = new Date(offerSnapshot.offer_checked_at).toISOString();
  const result = db.prepare(`
    INSERT INTO reorder_drafts (
      inventory_id, van_id, part_name, quantity_on_hand, source_type, source_offer_id,
      supplier_name, product_name, product_url, unit_price_myr, pack_price_myr,
      package_quantity, minimum_order_packs, shipping_myr, availability_note,
      offer_checked_at, offer_stale, requested_quantity, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    stock.id, stock.van_id, stock.part_name, stock.quantity,
    input.source_type, input.source_offer_id,
    offerSnapshot.supplier_name.trim(), offerSnapshot.product_name.trim(), productUrl.toString(),
    offerSnapshot.unit_price_myr, offerSnapshot.pack_price_myr, offerSnapshot.package_quantity ?? null,
    offerSnapshot.minimum_order_packs ?? null, offerSnapshot.shipping_myr ?? null,
    offerSnapshot.availability_note, offerCheckedAt, isOfferStale(offerCheckedAt, offerSnapshot.offer_stale) ? 1 : 0,
    input.requested_quantity, createdAt, "Demo Dispatcher",
  );
  return db.prepare("SELECT * FROM reorder_drafts WHERE id = ?").get(result.lastInsertRowid);
});

const approveReorderDraft = db.transaction(({ id, approved_by }) => {
  const current = db.prepare("SELECT * FROM reorder_drafts WHERE id = ?").get(id);
  if (!current) throw new ReorderNotFound("Reorder draft not found.");
  if (current.status !== "Draft") throw new ReorderConflict("This reorder has already been approved.");
  const approvedAt = new Date().toISOString();
  const updated = db.prepare(`
    UPDATE reorder_drafts
    SET status = 'Approved', approved_at = ?, approved_by = ?, offer_stale = ?
    WHERE id = ? AND status = 'Draft'
  `).run(approvedAt, approved_by, isOfferStale(current.offer_checked_at, Boolean(current.offer_stale)) ? 1 : 0, id);
  if (updated.changes !== 1) throw new ReorderConflict("This reorder has already been approved.");
  return db.prepare("SELECT * FROM reorder_drafts WHERE id = ?").get(id);
});

function reorderResponse(record) {
  return { ...record, offer_stale: isOfferStale(record.offer_checked_at, Boolean(record.offer_stale)) };
}

const supplierAvailability = new Set([
  "In stock",
  "Limited stock",
  "Out of stock",
  "Not checked",
]);
const supplierCatalogStaleAfterMs = 24 * 60 * 60 * 1000;

function getSupplierCatalogProviders() {
  const raw = process.env.SUPPLIER_CATALOG_FEEDS?.trim();
  if (!raw) return [];
  let configured;
  try {
    configured = JSON.parse(raw);
  } catch {
    throw new Error("Supplier feed configuration is not valid JSON.");
  }
  if (!Array.isArray(configured) || configured.length > 20) {
    throw new Error("Supplier feed configuration must be a list of at most 20 feeds.");
  }

  const seenIds = new Set();
  return configured.map((provider) => {
    if (!provider || typeof provider !== "object" ||
        typeof provider.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(provider.id) ||
        typeof provider.name !== "string" || provider.name.trim().length < 2 ||
        provider.name.trim().length > 120 || typeof provider.endpoint !== "string") {
      throw new Error("A supplier feed is missing a valid ID, name, or endpoint.");
    }
    const id = provider.id;
    if (seenIds.has(id)) throw new Error("Supplier feed IDs must be unique.");
    seenIds.add(id);
    let endpoint;
    try {
      endpoint = new URL(provider.endpoint);
    } catch {
      throw new Error(`Supplier feed "${id}" has an invalid endpoint URL.`);
    }
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
    if (!["http:", "https:"].includes(endpoint.protocol) ||
        (!isLoopback && endpoint.protocol !== "https:") ||
        endpoint.username || endpoint.password) {
      throw new Error(`Supplier feed "${id}" must use a public HTTPS endpoint.`);
    }
    let queryParam = "query";
    if (provider.query_param != null) {
      if (typeof provider.query_param !== "string" ||
          !/^[a-zA-Z0-9_-]{1,40}$/.test(provider.query_param)) {
        throw new Error(`Supplier feed "${id}" has an invalid query parameter name.`);
      }
      queryParam = provider.query_param;
    }
    return {
      id,
      name: provider.name.trim(),
      endpoint: endpoint.toString(),
      queryParam,
    };
  });
}

function parseSupplierFeedOffers(payload, supplierName, checkedAt) {
  const offers = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload.offers
    : null;
  if (!Array.isArray(offers) || offers.length > 20) {
    throw new Error("Supplier feed response must contain an offers list of at most 20 items.");
  }

  return offers.map((offer, index) => {
    if (!offer || typeof offer !== "object" || Array.isArray(offer) ||
        typeof offer.product_name !== "string" || !offer.product_name.trim() ||
        offer.product_name.trim().length > 200 ||
        typeof offer.product_url !== "string" ||
        typeof offer.price_myr !== "number" || !Number.isFinite(offer.price_myr) ||
        offer.price_myr <= 0 || offer.price_myr > 1_000_000) {
      throw new Error("Supplier feed contains an offer with invalid product, URL, or price data.");
    }
    let productUrl;
    try {
      productUrl = new URL(offer.product_url);
    } catch {
      throw new Error("Supplier feed contains an invalid product URL.");
    }
    if (!["http:", "https:"].includes(productUrl.protocol) ||
        productUrl.username || productUrl.password) {
      throw new Error("Supplier feed contains an invalid product URL.");
    }
    if (offer.availability_note != null && !supplierAvailability.has(offer.availability_note)) {
      throw new Error("Supplier feed contains an unsupported availability value.");
    }
    if (offer.package_quantity != null &&
        (!Number.isInteger(offer.package_quantity) || offer.package_quantity < 1 ||
          offer.package_quantity > 100_000)) {
      throw new Error("Supplier feed contains an invalid package quantity.");
    }
    if (offer.unit_label != null &&
        (typeof offer.unit_label !== "string" || offer.unit_label.length > 100)) {
      throw new Error("Supplier feed contains an invalid unit label.");
    }

    let sourceUpdatedAt = null;
    if (offer.source_updated_at != null) {
      if (typeof offer.source_updated_at !== "string") {
        throw new Error("Supplier feed contains an invalid source update time.");
      }
      const parsedUpdatedAt = new Date(offer.source_updated_at);
      if (Number.isNaN(parsedUpdatedAt.getTime())) {
        throw new Error("Supplier feed contains an invalid source update time.");
      }
      sourceUpdatedAt = parsedUpdatedAt.toISOString();
    }
    const id = typeof offer.id === "string" && offer.id.trim()
      ? offer.id.trim().slice(0, 120)
      : productUrl.toString();
    return {
      id: `${supplierName}:${id}:${index}`,
      supplier_name: supplierName,
      product_name: offer.product_name.trim(),
      product_url: productUrl.toString(),
      price_myr: offer.price_myr,
      availability_note: offer.availability_note ?? "Not checked",
      package_quantity: offer.package_quantity ?? null,
      unit_label: offer.unit_label?.trim() || null,
      checked_at: checkedAt,
      source_updated_at: sourceUpdatedAt,
      is_stale: sourceUpdatedAt != null &&
        checkedAt.getTime() - new Date(sourceUpdatedAt).getTime() > supplierCatalogStaleAfterMs,
    };
  });
}

async function searchSupplierFeed(provider, query) {
  const checkedAt = new Date();
  const result = {
    id: provider.id,
    name: provider.name,
    status: "ok",
    error: null,
    checked_at: checkedAt.toISOString(),
    offers: [],
  };
  const url = new URL(provider.endpoint);
  url.searchParams.set(provider.queryParam, query);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      throw new Error(`Supplier feed returned HTTP ${response.status}.`);
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Supplier feed response was not valid JSON.");
    }
    result.offers = parseSupplierFeedOffers(payload, provider.name, checkedAt);
  } catch (error) {
    result.status = "error";
    result.error = error?.name === "TimeoutError"
      ? "Supplier feed timed out."
      : error instanceof Error
        ? error.message
        : "Supplier feed could not be reached.";
    result.offers = [];
  }
  return result;
}
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
router.get("/hub-data", (_req, res) => {
  res.json(GetHubDataResponse.parse(getHubData()));
});
router.get("/workshop-reviews", (_req, res) => {
  const totals = db.prepare(`
    SELECT COUNT(*) AS review_count, AVG(rating) AS average_rating
    FROM customer_reviews
  `).get();
  const reviews = db.prepare(`
    SELECT id, rating, comment, created_at
    FROM customer_reviews
    ORDER BY id DESC
    LIMIT 100
  `).all();
  res.json(ListWorkshopReviewsResponse.parse({
    reviews,
    review_count: totals.review_count,
    average_rating: totals.average_rating == null ? null : Number(totals.average_rating),
  }));
});
router.post("/workshop-reviews", (req, res) => {
  const parsed = CreateWorkshopReviewBody.safeParse(req.body);
  const comment = parsed.success ? parsed.data.comment.trim() : "";
  if (!parsed.success || comment.length < 3) {
    res.status(400).json({ error: "Enter a 1–5 star rating and at least 3 characters of customer feedback." });
    return;
  }
  const createdAt = new Date().toISOString();
  const inserted = db.prepare(`
    INSERT INTO customer_reviews (rating, comment, created_at)
    VALUES (?, ?, ?)
  `).run(parsed.data.rating, comment, createdAt);
  res.status(201).json(CreateWorkshopReviewResponse.parse({
    id: inserted.lastInsertRowid,
    rating: parsed.data.rating,
    comment,
    created_at: createdAt,
  }));
});
router.post("/workshop-reviews/summary", async (_req, res) => {
  const recentReviews = db.prepare(`
    SELECT rating, comment FROM customer_reviews
    ORDER BY id DESC
    LIMIT 100
  `).all();
  if (recentReviews.length === 0) {
    res.status(400).json({ error: "Save at least one customer review before requesting an AI summary." });
    return;
  }
  try {
    const summary = await summarizeCustomerReviews(recentReviews);
    res.json(SummarizeWorkshopReviewsResponse.parse({
      ...summary,
      review_count: recentReviews.length,
      generated_at: new Date().toISOString(),
    }));
  } catch {
    res.status(503).json({ error: "AI review summary is unavailable. Your saved reviews are unchanged; try again later." });
  }
});
router.get("/conversations", (_req, res) => {
  res.json(ListConversationsResponse.parse({
    conversations: listConversationSummaries(),
  }));
});
router.patch("/conversations/:id/site", (req, res) => {
  const id = Number(req.params.id);
  const parsed = SetConversationSiteBody.safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) {
    res.status(400).json({ error: "Choose a valid sample customer site." });
    return;
  }
  const thread = getConversationThread(id);
  if (!thread) { res.status(404).json({ error: "Conversation not found." }); return; }
  if (thread.dispatch_activity_id != null || thread.source !== "Telegram") {
    res.status(409).json({ error: "Only an undispatched Telegram request can change its sample site." });
    return;
  }
  db.prepare("UPDATE conversation_threads SET customer_site_id = ?, updated_at = ? WHERE id = ?")
    .run(parsed.data.customer_site_id, new Date().toISOString(), id);
  res.json(getConversationThread(id));
});
router.get("/conversations/:id", (req, res) => {
  const parsed = GetConversationThreadParams.safeParse({ id: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: "Provide a valid conversation ID." });
    return;
  }
  const thread = getConversationThread(parsed.data.id);
  if (!thread) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }
  res.json(GetConversationThreadResponse.parse(thread));
});
router.post("/conversations/:id/reply", async (req, res, next) => {
  const params = GetConversationThreadParams.safeParse({ id: req.params.id });
  const body = SendTelegramReplyBody.safeParse(req.body);
  if (!params.success || !body.success || !body.data.text.trim()) {
    res.status(400).json({ error: "Enter a reply of 1 to 4,096 characters." });
    return;
  }

  const { id } = params.data;
  const thread = getConversationThread(id);
  if (!thread) { res.status(404).json({ error: "Conversation not found." }); return; }
  if (thread.source !== "Telegram") {
    res.status(409).json({ error: "Real replies are available only for Telegram conversations." });
    return;
  }
  if (!thread.can_send_telegram_reply) {
    res.status(409).json({ error: "Ask the customer to send one more Telegram message before replying to this older conversation." });
    return;
  }
  if (telegramReplyLocks.has(id)) {
    res.status(409).json({ error: "A reply is already being sent for this conversation." });
    return;
  }

  telegramReplyLocks.add(id);
  try {
    const address = telegramStorage.getReplyAddress(id);
    if (!address) {
      res.status(409).json({ error: "This conversation has no saved Telegram reply address." });
      return;
    }
    await sendTelegramMessage(address.botId, address.chatId, body.data.text.trim());
    const updated = appendTelegramReply.immediate({ id, text: body.data.text.trim() });
    res.json(SendTelegramReplyResponse.parse(updated));
  } catch (error) {
    if (error instanceof TelegramDeliveryError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof ConversationNotFound || error instanceof ConversationConflict) {
      res.status(error instanceof ConversationNotFound ? 404 : 409).json({ error: error.message });
      return;
    }
    next(error);
  } finally {
    telegramReplyLocks.delete(id);
  }
});
router.post("/conversations/:id/messages", (req, res, next) => {
  const params = GetConversationThreadParams.safeParse({ id: req.params.id });
  const body = SendConversationMessageBody.safeParse(req.body);
  if (!params.success || !body.success || !body.data.text.trim()) {
    res.status(400).json({ error: "Choose a customer or technician, then enter a message of 1 to 2,000 characters." });
    return;
  }
  try {
    const thread = appendConversationMessage.immediate({
      id: params.data.id,
      ...body.data,
      text: body.data.text.trim(),
    });
    res.json(SendConversationMessageResponse.parse(thread));
  } catch (error) {
    if (error instanceof ConversationNotFound || error instanceof ConversationInputError) {
      res.status(error instanceof ConversationNotFound ? 404 : 400).json({ error: error.message });
      return;
    }
    next(error);
  }
});
router.post("/conversations/:id/analyze", async (req, res, next) => {
  const parsed = GetConversationThreadParams.safeParse({ id: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: "Provide a valid conversation ID." });
    return;
  }
  try {
    res.json(AnalyzeConversationResponse.parse(await analyzeConversation(parsed.data.id)));
  } catch (error) {
    if (error instanceof ConversationNotFound || error instanceof ConversationConflict) {
      res.status(error instanceof ConversationNotFound ? 404 : 409).json({ error: error.message });
      return;
    }
    next(error);
  }
});
router.get("/reorder-drafts", (_req, res) => {
  res.json(ListReorderDraftsResponse.parse({
    reorders: listReorderDrafts().reorders.map(reorderResponse),
  }));
});
router.post("/reorder-drafts", (req, res, next) => {
  const parsed = CreateReorderDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide a valid stock line, supplier offer, quantity, and price." });
    return;
  }
  try {
    const input = parsed.data;
    if ([input.supplier_name, input.product_name, input.source_offer_id].some((value) => !value.trim()) ||
        Number.isNaN(new Date(input.offer_checked_at).getTime())) {
      res.status(400).json({ error: "Supplier offer details cannot be blank or have an invalid check time." });
      return;
    }
    let offeredProductUrl;
    try {
      offeredProductUrl = new URL(input.product_url);
    } catch {
      res.status(400).json({ error: "The supplier product link must be a public http(s) URL." });
      return;
    }
    if (!["http:", "https:"].includes(offeredProductUrl.protocol) ||
        offeredProductUrl.username || offeredProductUrl.password) {
      res.status(400).json({ error: "The supplier product link must be a public http(s) URL." });
      return;
    }
    const created = createReorderDraft.immediate(input);
    res.status(201).json(CreateReorderDraftResponse.parse(reorderResponse(created)));
  } catch (error) {
    if (error instanceof ReorderNotFound || error instanceof ReorderConflict) {
      res.status(error instanceof ReorderNotFound ? 404 : 409).json({ error: error.message });
      return;
    }
    next(error);
  }
});
router.post("/reorder-drafts/:id/approve", (req, res, next) => {
  const parsed = ApproveReorderDraftBody.safeParse(req.body);
  const id = Number(req.params.id);
  if (!parsed.success || !Number.isSafeInteger(id) || id < 1 || !parsed.data.approved_by.trim()) {
    res.status(400).json({ error: "Provide a valid reorder ID and approver name." });
    return;
  }
  try {
    const approved = approveReorderDraft.immediate({
      id,
      approved_by: parsed.data.approved_by.trim(),
    });
    res.json(ApproveReorderDraftResponse.parse(reorderResponse(approved)));
  } catch (error) {
    if (error instanceof ReorderNotFound || error instanceof ReorderConflict) {
      res.status(error instanceof ReorderNotFound ? 404 : 409).json({ error: error.message });
      return;
    }
    next(error);
  }
});

router.get("/supplier-catalog/providers", (_req, res) => {
  try {
    const providers = getSupplierCatalogProviders().map(({ id, name }) => ({ id, name }));
    res.json(ListSupplierCatalogProvidersResponse.parse({ providers }));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Supplier feed configuration is invalid.",
    });
  }
});

router.get("/supplier-catalog", async (req, res) => {
  const rawSupplierIds = Array.isArray(req.query.supplier_ids)
    ? req.query.supplier_ids
    : req.query.supplier_ids == null
      ? []
      : [req.query.supplier_ids];
  const parsed = SearchSupplierCatalogQueryParams.safeParse({
    ...req.query,
    supplier_ids: rawSupplierIds,
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Provide a part name and at least one supported supplier." });
    return;
  }

  let providers;
  try {
    providers = getSupplierCatalogProviders();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Supplier feed configuration is invalid.",
    });
    return;
  }
  const selectedIds = [...new Set(parsed.data.supplier_ids)];
  const selectedProviders = providers.filter((provider) => selectedIds.includes(provider.id));
  if (selectedProviders.length !== selectedIds.length) {
    res.status(400).json({ error: "Select only suppliers with configured catalog feeds." });
    return;
  }
  const suppliers = await Promise.all(
    selectedProviders.map((provider) => searchSupplierFeed(provider, parsed.data.query.trim())),
  );
  for (const supplier of suppliers) {
    if (supplier.status === "error") {
      req.log?.warn?.({ supplierId: supplier.id, error: supplier.error }, "Supplier catalog feed failed");
    }
  }
  res.json(SearchSupplierCatalogResponse.parse({
    query: parsed.data.query.trim(),
    suppliers,
  }));
});
router.post("/analyze-request", async (req, res) => {
  const parsed = AnalyzeRequestBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.text.trim()) {
    res.status(400).json({ error: "Enter repair notes between 1 and 5,000 characters." });
    return;
  }
  res.json(AnalyzeRequestResponse.parse(await callRunPodModel(parsed.data.text)));
});
router.post("/approve-dispatch", (req, res, next) => {
  const parsed = ApproveDispatchBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.approved_by.trim() || parsed.data.parts.some((part) => !part.trim())) {
    res.status(400).json({ error: "Provide a valid demo customer site, technician, van, required parts and approver." });
    return;
  }
  try {
    const updated = dispatch.immediate({
      ...parsed.data,
      approved_by: parsed.data.approved_by.trim(),
    });
    res.json(ApproveDispatchResponse.parse(updated));
  } catch (error) {
    if (error instanceof DispatchConflict) {
      res.status(409).json({ error: error.message });
      return;
    }
    next(error);
  }
});

router.post("/complete-dispatch", (req, res, next) => {
  const parsed = CompleteDispatchBody.safeParse(req.body);
  if (!parsed.success || !Number.isSafeInteger(parsed.data.dispatch_id) || !parsed.data.completed_by.trim()) {
    res.status(400).json({ error: "Provide a valid dispatch ID and completion name." });
    return;
  }
  try {
    res.json(CompleteDispatchResponse.parse(completeDispatch.immediate({
      ...parsed.data, completed_by: parsed.data.completed_by.trim(),
    })));
  } catch (error) {
    if (error instanceof DispatchNotFound || error instanceof DispatchConflict) {
      res.status(error instanceof DispatchNotFound ? 404 : 409).json({ error: error.message });
      return;
    }
    next(error);
  }
});

router.post("/reset-technician", (req, res, next) => {
  const parsed = ResetTechnicianAvailabilityBody.safeParse(req.body);
  if (!parsed.success || !Number.isSafeInteger(parsed.data.technician_id) || !parsed.data.reset_by.trim()) {
    res.status(400).json({ error: "Provide a valid technician ID and dispatcher name." });
    return;
  }
  try {
    const updated = resetTechnicianAvailability.immediate({
      ...parsed.data, reset_by: parsed.data.reset_by.trim(),
    });
    res.json(ResetTechnicianAvailabilityResponse.parse(updated));
  } catch (error) {
    if (error instanceof TechnicianNotFound || error instanceof DispatchConflict) {
      res.status(error instanceof TechnicianNotFound ? 404 : 409).json({ error: error.message });
      return;
    }
    next(error);
  }
});

router.get("/supplier-quotes", (req, res) => {
  const parsed = ListSupplierQuotesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a part name with at least two characters." });
    return;
  }
  const query = parsed.data.query.trim();
  if (query.length < 2) {
    res.status(400).json({ error: "Enter a part name with at least two characters." });
    return;
  }
  const quotes = db.prepare(`
    SELECT id, search_term, part_name, part_number, product_name, supplier_name,
      product_url, price_myr, quality_rating, quality_evidence_note,
      package_quantity, minimum_order_packs, shipping_myr, checked_at, source_type,
      availability_note, trust_evidence_url, trust_evidence_note
    FROM supplier_quotes
    WHERE lower(search_term) = lower(?) OR lower(part_name) = lower(?)
    ORDER BY quality_rating DESC, price_myr ASC, checked_at DESC, id DESC
  `).all(query, query).map((offer) => ({
    ...offer,
    id: String(offer.id),
    shop_url: new URL(offer.product_url).origin,
  }));
  res.json(ListSupplierQuotesResponse.parse({ query, quotes }));
});

router.post("/supplier-quotes", (req, res) => {
  const parsed = SaveSupplierQuoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide a valid supplier, price, quality score, and evidence for the selected part." });
    return;
  }
  const input = parsed.data;
  const clean = (value) => value.trim();
  const fields = [
    input.search_term, input.part_name, input.product_name, input.supplier_name,
    input.availability_note, input.quality_evidence_note,
  ];
  if (fields.some((value) => !clean(value)) ||
      (input.part_number != null && !clean(input.part_number))) {
    res.status(400).json({ error: "Supplier and quality evidence fields cannot be blank." });
    return;
  }
  const validWebUrl = (value) => {
    if (!value) return null;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
        ? url.toString()
        : null;
    } catch {
      return null;
    }
  };
  const productUrl = validWebUrl(input.product_url);
  const trustEvidenceUrl = validWebUrl(input.trust_evidence_url);
  if (!productUrl || (input.trust_evidence_url && !trustEvidenceUrl)) {
    res.status(400).json({ error: "Supplier and evidence links must be valid public http(s) URLs." });
    return;
  }
  const checkedAt = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO supplier_quotes (
      search_term, part_name, part_number, product_name, supplier_name, product_url,
      price_myr, availability_note, quality_rating, quality_evidence_note,
      package_quantity, minimum_order_packs, shipping_myr, checked_at,
      trust_evidence_url, trust_evidence_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    clean(input.search_term), clean(input.part_name), input.part_number ? clean(input.part_number) : null,
    clean(input.product_name), clean(input.supplier_name), productUrl, input.price_myr,
    clean(input.availability_note), input.quality_rating, clean(input.quality_evidence_note),
    input.package_quantity ?? 1,
    input.minimum_order_packs ?? 1, input.shipping_myr ?? null, checkedAt,
    trustEvidenceUrl, input.trust_evidence_note ? clean(input.trust_evidence_note) : null,
  );
  const offer = db.prepare(`
    SELECT id, search_term, part_name, part_number, product_name, supplier_name,
      product_url, price_myr, quality_rating, quality_evidence_note,
      package_quantity, minimum_order_packs, shipping_myr, checked_at, source_type,
      availability_note, trust_evidence_url, trust_evidence_note
    FROM supplier_quotes WHERE id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(SaveSupplierQuoteResponse.parse({
    ...offer,
    id: String(offer.id),
    shop_url: new URL(offer.product_url).origin,
  }));
});

export default router;
