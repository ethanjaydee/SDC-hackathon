// All names, positions, ratings and completed-job counts below are synthetic.
// The legacy unique van key is retained internally for SQLite compatibility;
// current assignments use the independent five-van transport pool.
import { chooseFreeVan } from "./transportPool.js";
export const workshopTechnicians = [
  [1, "Amir Hakim", "Petaling Jaya", 1, 1, "Intern · Level 1", 4.5, 14, 3.109, 101.633, "Bulbs and basic replacements"],
  [2, "Mei Tan", "Puchong", 2, 2, "Experienced · Level 2", 4.8, 76, 3.025, 101.617, "AC servicing and drainage"],
  [3, "Ravi Kumar", "Cheras", 3, 3, "Expert · Level 3", 4.9, 156, 3.101, 101.738, "AC electrical diagnostics"],
  [4, "Nur Aina", "Subang Jaya", 1, 1, "Intern · Level 1", 4.6, 21, 3.057, 101.585, "Bulbs and batteries"],
  [5, "Daniel Lee", "Kepong", 2, 2, "Experienced · Level 2", 4.7, 91, 3.215, 101.638, "Filters and drain servicing"],
  [6, "Farah Aziz", "Bukit Jalil", 3, 3, "Expert · Level 3", 4.95, 184, 3.061, 101.691, "Capacitors and control boards"],
  [7, "Jason Lim", "Setapak", 2, 1, "Intern · Level 1", 4.4, 18, 3.193, 101.716, "Basic replacements"],
  [8, "Siti Hana", "Sri Petaling", 3, 2, "Experienced · Level 2", 4.8, 103, 3.07, 101.69, "AC cleaning and drainage"],
  [9, "Arun Raj", "Bangsar", 1, 3, "Expert · Level 3", 4.9, 172, 3.13, 101.668, "Electrical fault finding"],
  [10, "Adam Wong", "Ampang", 3, 1, "Intern · Level 1", 4.5, 25, 3.148, 101.76, "Bulbs and remote controls"],
  [11, "Priya Nair", "Damansara", 1, 2, "Experienced · Level 2", 4.85, 114, 3.157, 101.611, "Preventive servicing"],
  [12, "Hafiz Ismail", "Sentul", 2, 3, "Expert · Level 3", 4.9, 198, 3.184, 101.689, "AC components and circuits"],
];

export function classifyRepair(text) {
  const t = text.toLowerCase().replace(/\b(no|without)\s+(electrical faults?|smoke|sparking)\b/g, "");
  if (/capacitor|capasitor|control.?board|compressor|circuit|electrical|burn|smoke|sparking|transistor|relay|cluster/.test(t)) return "Hard";
  if (/bulb|light.?bulb|batter(y|ies)|remote control/.test(t)) return "Easy";
  if (/filter|drain|hose|clean|servic|seep|leak/.test(t)) return "Normal";
  return "Hard"; // Unknown work requires expert assessment, never an intern by default.
}

export function experienceRequired(complexity) {
  return complexity === "Easy" ? 1 : complexity === "Normal" ? 2 : 3;
}

export function candidateEligibility(hub, technician, parts, complexity) {
  if (technician.status !== "Available") return "Technician is busy";
  if ((technician.level ?? 0) < experienceRequired(complexity)) return `${complexity} work requires a verified Level ${experienceRequired(complexity)} or above`;
  if (hub.activity_log.some((entry) => entry.dispatch?.status === "Active" && entry.dispatch.tech_id === technician.id)) return "Technician has an active job";
  if (hub.vans) return chooseFreeVan(hub, parts) ? null : "No free van has all required parts; wait for transport or restock";
  if (hub.activity_log.some((entry) => entry.dispatch?.status === "Active" && entry.dispatch.van_id === technician.van_id)) return `Van ${technician.van_id} is on an active job`;
  if (!parts.length) return "Confirm required parts after expert assessment";
  const demand = new Map();
  for (const part of parts) demand.set(part.toLowerCase(), (demand.get(part.toLowerCase()) ?? 0) + 1);
  if (![...demand].every(([part, quantity]) => hub.inventory.some((item) => item.van_id === technician.van_id && item.part_name.toLowerCase() === part && item.quantity >= quantity))) return `Van ${technician.van_id} is missing required stock`;
  return null;
}

export function seedWorkshopDemo(db) {
  db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS technician_profiles (
        technician_id INTEGER PRIMARY KEY REFERENCES technicians(id),
        shared_van_id INTEGER NOT NULL, level INTEGER NOT NULL,
        experience_label TEXT NOT NULL, rating REAL NOT NULL,
        demo_completed_jobs INTEGER NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
        specialty TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workshop_demo_seeds (key TEXT PRIMARY KEY);
    `);
    if (db.prepare("SELECT 1 FROM workshop_demo_seeds WHERE key = 'kl-workshop'").get()) return;
    for (const [id, name, zone, van, level, label, rating, jobs, lat, lng, specialty] of workshopTechnicians) {
      db.prepare("INSERT OR IGNORE INTO technicians(id,name,status,zone,van_id) VALUES(?,?,'Available',?,?)").run(id, name, zone, id);
      // Do not reset availability or rename approval snapshots in dispatches.
      db.prepare("UPDATE technicians SET name = CASE WHEN name IN ('Tech A','Tech B','Tech C') THEN ? ELSE name END, zone = ? WHERE id = ?").run(name, zone, id);
      db.prepare("INSERT OR IGNORE INTO technician_profiles(technician_id,shared_van_id,level,experience_label,rating,demo_completed_jobs,lat,lng,specialty) VALUES(?,?,?,?,?,?,?,?,?)")
        .run(id, van, level, label.split(" · ")[0], rating, jobs, lat, lng, specialty);
    }
    const stock = [
      ["LED Bulb E27", 12], ["AAA Battery", 10], ["AC Filter", 6],
      ["Drain Hose", 4], ["AC Capacitor 35uF", 3], ["AC Control Board", 2],
    ];
    for (const van of [1, 2, 3]) for (const [part, qty] of stock) {
      // Never refill a previously consumed stock line during a restart.
      db.prepare("INSERT OR IGNORE INTO inventory(van_id,part_name,quantity) VALUES(?,?,?)").run(van, part, qty);
    }
    const examples = [
      ["Bedroom light bulb replacement", "north", "My bedroom light bulb broke. Please replace the bulb; the fitting is not damaged."],
      ["Hallway bulb stopped working", "central", "One hallway light bulb has stopped working. The other lights work normally."],
      ["AC remote battery replacement", "south", "The air conditioner remote control needs new AAA batteries. The unit itself is working."],
      ["AC filter service", "north", "Please clean and replace the AC filter. Airflow is weak; there is no electrical fault reported."],
      ["Drain hose leak", "central", "The air conditioner drain hose is leaking at the joint. Please inspect and replace the hose."],
      ["Routine AC cleaning", "south", "I need routine air conditioner servicing and a clean AC filter."],
      ["AC capacitor replacement", "north", "The air conditioner hums but does not start. A previous inspection suggested a faulty capacitor. Please send an expert to confirm."],
      ["AC control board fault", "central", "The air conditioner control board has an intermittent fault. We need an expert diagnosis before replacing the board."],
      ["Air conditioner electrical fault", "south", "The air conditioner trips its circuit. A technician mentioned the capacitor may be damaged. Please send an expert."],
    ];
    examples.forEach(([subject, site, text], index) => {
      const at = new Date(Date.now() - index * 120_000).toISOString();
      const inserted = db.prepare(`INSERT INTO conversation_threads(customer_name,subject,customer_site_id,mock_summary,created_at,updated_at) VALUES(?,?,?,?,?,?)`)
        .run(`Demo Customer ${index + 1}`, subject, site, text, at, at);
      db.prepare("INSERT INTO conversation_messages(conversation_id,sender_role,sender_name,text,created_at) VALUES(?,'Customer',?,?,?)")
        .run(inserted.lastInsertRowid, `Demo Customer ${index + 1}`, text, at);
    });
    db.prepare("INSERT INTO workshop_demo_seeds(key) VALUES('kl-workshop')").run();
  }).immediate();
}
