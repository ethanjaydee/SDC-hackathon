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
  GetHubDataResponse,
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
  CREATE TRIGGER IF NOT EXISTS activity_log_no_update
    BEFORE UPDATE ON activity_log BEGIN
      SELECT RAISE(ABORT, 'Activity log is immutable');
    END;
  CREATE TRIGGER IF NOT EXISTS activity_log_no_delete
    BEFORE DELETE ON activity_log BEGIN
      SELECT RAISE(ABORT, 'Activity log is immutable');
    END;
`);

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
      SELECT a.*, d.tech_id, d.technician_name, d.van_id, d.parts_json, d.customer_site_json
      FROM activity_log a LEFT JOIN dispatches d ON d.activity_id = a.id
      ORDER BY a.id DESC
    `).all().map(({ tech_id, technician_name, van_id, parts_json, customer_site_json, ...activity }) => ({
      ...activity,
      dispatch: tech_id == null ? null : {
        tech_id, technician_name, van_id,
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
  if (!technician || technician.status !== "Available") {
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
    INSERT INTO dispatches (activity_id, tech_id, technician_name, van_id, parts_json, customer_site_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(activity.lastInsertRowid, tech_id, technician.name, van_id, JSON.stringify(parts), JSON.stringify(demoSites[customer_site_id]));
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

export default router;
