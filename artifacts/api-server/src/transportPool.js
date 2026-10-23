// A fixed synthetic departure point, not a real business address or live GPS.
export const SHOP_LOCATION = Object.freeze({
  name: "Dispatch Hub Workshop",
  label: "Demo workshop · Puchong",
  area: "Puchong",
  lat: 3.0431,
  lng: 101.6161,
});

export function seedTransportPool(db) {
  db.transaction(() => {
    db.exec(`CREATE TABLE IF NOT EXISTS transport_vans (
      id INTEGER PRIMARY KEY CHECK(id BETWEEN 1 AND 5),
      name TEXT NOT NULL, plate TEXT NOT NULL
    )`);
    for (let id = 1; id <= 5; id++) {
      db.prepare("INSERT OR IGNORE INTO transport_vans(id,name,plate) VALUES(?,?,?)")
        .run(id, `Workshop Van ${id}`, `DEMO-V0${id}`);
    }
    if (db.prepare("SELECT 1 FROM workshop_demo_seeds WHERE key = 'shared-transport-five'").get()) return;
    // Only seed the two newly introduced vans. Never refill existing stock.
    const catalog = db.prepare("SELECT part_name, MAX(quantity) AS quantity FROM inventory GROUP BY part_name").all();
    for (const vanId of [4, 5]) {
      for (const item of catalog) {
        db.prepare("INSERT OR IGNORE INTO inventory(van_id,part_name,quantity) VALUES(?,?,?)")
          .run(vanId, item.part_name, Math.max(5, item.quantity));
      }
    }
    db.prepare("INSERT INTO workshop_demo_seeds(key) VALUES('shared-transport-five')").run();
  }).immediate();
}

export function getTransportVans(db) {
  return db.prepare(`
    SELECT v.*, d.tech_id AS technician_id, d.technician_name, d.activity_id AS dispatch_id
    FROM transport_vans v LEFT JOIN dispatches d ON d.activity_id = (
      SELECT activity_id FROM dispatches WHERE van_id = v.id AND status = 'Active'
      ORDER BY activity_id LIMIT 1
    ) ORDER BY v.id
  `).all().map((van) => ({
    ...van,
    status: van.dispatch_id == null ? "Available" : "Busy",
  }));
}

/** Stable first free van with all requested units. Call again inside approval's transaction. */
export function chooseFreeVan(hub, parts) {
  if (!parts.length) return null;
  const required = new Map();
  for (const part of parts) {
    const name = part.trim().toLowerCase();
    required.set(name, (required.get(name) ?? 0) + 1);
  }
  return [...(hub.vans ?? [])].sort((a, b) => a.id - b.id).find((van) =>
    van.status === "Available" &&
    !hub.activity_log.some((entry) => entry.dispatch?.status === "Active" && entry.dispatch.van_id === van.id) &&
    [...required].every(([name, quantity]) => hub.inventory.some((item) =>
      item.van_id === van.id && item.part_name.toLowerCase() === name && item.quantity >= quantity)),
  ) ?? null;
}
