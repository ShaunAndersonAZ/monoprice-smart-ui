
import Database from 'better-sqlite3';
const db = new Database('prefs.db');

// Zone prefs: name + defaults
db.exec(`
CREATE TABLE IF NOT EXISTS zone_prefs (
  zone INTEGER PRIMARY KEY,
  name TEXT,
  default_source INTEGER,
  default_treble INTEGER,
  default_bass INTEGER,
  default_balance INTEGER
);
`);

// Source names (1..6)
db.exec(`
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND 6),
  name TEXT
);
`);

// Seed sources
const countSources = db.prepare(`SELECT COUNT(*) as c FROM sources`).get().c;
if (countSources === 0) {
  const ins = db.prepare(`INSERT INTO sources(id,name) VALUES (?,?)`);
  for (let i=1; i<=6; i++) ins.run(i, `Source ${i}`);
  db.prepare(`UPDATE sources SET name=? WHERE id=5`).run('Source 5 (Google Audio)');
  db.prepare(`UPDATE sources SET name=? WHERE id=6`).run('Source 6 (Google Audio)');
}

export const upsertZoneName = db.prepare(
  `INSERT INTO zone_prefs(zone,name) VALUES(?,?)
   ON CONFLICT(zone) DO UPDATE SET name=excluded.name`
);
export const upsertDefaults = db.prepare(
  `INSERT INTO zone_prefs(zone,default_source,default_treble,default_bass,default_balance)
   VALUES(?,?,?,?,?)
   ON CONFLICT(zone) DO UPDATE SET
     default_source=excluded.default_source,
     default_treble=excluded.default_treble,
     default_bass=excluded.default_bass,
     default_balance=excluded.default_balance`
);
export const getZonePrefs = () => db.prepare(`SELECT * FROM zone_prefs`).all();

export const getSources = () => db.prepare(`SELECT * FROM sources ORDER BY id`).all();
export const setSourceName = db.prepare(
  `INSERT INTO sources(id,name) VALUES(?,?)
   ON CONFLICT(id) DO UPDATE SET name=excluded.name`
);

export default db;
