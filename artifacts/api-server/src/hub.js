import { Router } from "express";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { demoSites } from "./demoSites.js";
import {
  AnalyzeRequestBody,
  AnalyzeRequestResponse,
  ApproveDispatchBody,
  ApproveDispatchResponse,
  CompleteDispatchBody,
  CompleteDispatchResponse,
  ResetTechnicianAvailabilityBody,
  ResetTechnicianAvailabilityResponse,
  GetHubDataResponse,
  ListSupplierQuotesQueryParams,
  ListSupplierQuotesResponse,
  SaveSupplierQuoteBody,
  SaveSupplierQuoteResponse,
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
  CREATE TRIGGER IF NOT EXISTS activity_log_no_update
    BEFORE UPDATE ON activity_log BEGIN
      SELECT RAISE(ABORT, 'Activity log is immutable');
    END;
  CREATE TRIGGER IF NOT EXISTS activity_log_no_delete
    BEFORE DELETE ON activity_log BEGIN
      SELECT RAISE(ABORT, 'Activity log is immutable');
    END;
`);

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
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_dispatch_per_tech
      ON dispatches(tech_id) WHERE status = 'Active';
    CREATE UNIQUE INDEX IF NOT EXISTS one_dispatch_per_completion
      ON dispatches(completion_activity_id) WHERE completion_activity_id IS NOT NULL;
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

function getHubData() {
  return {
    technicians: db.prepare("SELECT * FROM technicians ORDER BY id").all(),
    inventory: db.prepare("SELECT * FROM inventory ORDER BY van_id, id").all(),
    activity_log: db.prepare(`
      SELECT a.*, d.tech_id, d.technician_name, d.van_id, d.parts_json, d.customer_site_json,
        d.status AS dispatch_status, completed.timestamp AS completed_at,
        original.activity_id AS completion_dispatch_id
      FROM activity_log a LEFT JOIN dispatches d ON d.activity_id = a.id
      LEFT JOIN activity_log completed ON completed.id = d.completion_activity_id
      LEFT JOIN dispatches original ON original.completion_activity_id = a.id
      ORDER BY a.id DESC
    `).all().map(({ tech_id, technician_name, van_id, parts_json, customer_site_json, dispatch_status, completed_at, ...activity }) => ({
      ...activity,
      dispatch: tech_id == null ? null : {
        tech_id, technician_name, van_id,
        status: dispatch_status,
        completed_at,
        parts: JSON.parse(parts_json),
        customer_site: JSON.parse(customer_site_json),
      },
    })),
  };
}

export async function callRunPodModel(text) {
  // MOCK ONLY: replace the return below with a fetch to your RunPod vLLM
  // OpenAI-compatible endpoint, for example:
  // const response = await fetch(`${endpoint}/v1/chat/completions`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json",
  //     Authorization: `Bearer ${process.env.RUNPOD_API_KEY}` },
  //   body: JSON.stringify({ model: modelName,
  //     messages: [{ role: "user", content: text }],
  //     response_format: { type: "json_object" } }),
  //   signal: AbortSignal.timeout(30000),
  // });
  // Check response.ok, parse choices[0].message.content, and validate the
  // parsed result with AnalyzeRequestResponse before returning it.
  void text;
  return {
    issue: "Instrument Cluster Power Failure",
    parts: ["100uF Capacitor", "NPN Transistor"],
    urgency: "High",
  };
}

class DispatchConflict extends Error {}

const dispatch = db.transaction(({ tech_id, van_id, parts, approved_by, customer_site_id }) => {
  const technician = db.prepare(
    "SELECT * FROM technicians WHERE id = ? AND van_id = ?",
  ).get(tech_id, van_id);
  if (!technician || technician.status !== "Available" ||
    db.prepare("SELECT 1 FROM dispatches WHERE tech_id = ? AND status = 'Active'").get(tech_id)) {
    throw new DispatchConflict("This technician is no longer available for this van. Refresh and choose another match.");
  }
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
    INSERT INTO dispatches (activity_id, tech_id, technician_name, van_id, parts_json, customer_site_json, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Active')
  `).run(activity.lastInsertRowid, tech_id, technician.name, van_id, JSON.stringify(parts), JSON.stringify(demoSites[customer_site_id]));
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
  const technician = db.prepare("SELECT * FROM technicians WHERE id = ?").get(job.tech_id);
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
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
router.get("/hub-data", (_req, res) => {
  res.json(GetHubDataResponse.parse(getHubData()));
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
