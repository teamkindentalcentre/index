import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { getDbPath } from "@/lib/paths";

export type SeedItem = { name: string; expectedQty: string | null };
export type SeedSection = { name: string; items: SeedItem[] };
export type SeedRoom = { id: string; name: string; sections: SeedSection[] };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES sections(id),
  name TEXT NOT NULL,
  expected_qty TEXT,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS check_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  staff_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  total_items INTEGER NOT NULL,
  missing_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS check_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES check_sessions(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  present INTEGER NOT NULL,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_sections_room ON sections(room_id);
CREATE INDEX IF NOT EXISTS idx_items_section ON items(section_id);
CREATE INDEX IF NOT EXISTS idx_sessions_room ON check_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_results_session ON check_results(session_id);
`;

function openDatabase(): Database.Database {
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
  seedIfEmpty(db);
  return db;
}

function columnNamesOf(db: Database.Database, table: string): Set<string> {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return new Set(columns.map((c) => c.name));
}

function migrate(db: Database.Database) {
  const itemColumns = columnNamesOf(db, "items");

  if (!itemColumns.has("photo_path")) {
    db.exec("ALTER TABLE items ADD COLUMN photo_path TEXT");
  }
  if (!itemColumns.has("photo_mime")) {
    db.exec("ALTER TABLE items ADD COLUMN photo_mime TEXT");
  }
  if (!itemColumns.has("active")) {
    db.exec("ALTER TABLE items ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
  }

  const sectionColumns = columnNamesOf(db, "sections");
  if (!sectionColumns.has("active")) {
    db.exec(
      "ALTER TABLE sections ADD COLUMN active INTEGER NOT NULL DEFAULT 1",
    );
  }
}

function seedIfEmpty(db: Database.Database) {
  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM items")
    .get() as { count: number };
  if (count > 0) return;

  const seedPath = path.join(process.cwd(), "data", "seed-items.json");
  if (!fs.existsSync(seedPath)) return;

  const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as {
    rooms: SeedRoom[];
  };

  const insertRoom = db.prepare(
    "INSERT OR IGNORE INTO rooms (id, name) VALUES (?, ?)",
  );
  const insertSection = db.prepare(
    "INSERT INTO sections (room_id, name, sort_order) VALUES (?, ?, ?)",
  );
  const insertItem = db.prepare(
    "INSERT INTO items (section_id, name, expected_qty, sort_order) VALUES (?, ?, ?, ?)",
  );

  const seedTx = db.transaction((rooms: SeedRoom[]) => {
    for (const room of rooms) {
      insertRoom.run(room.id, room.name);
      room.sections.forEach((section, sectionIndex) => {
        const sectionId = insertSection.run(
          room.id,
          section.name,
          sectionIndex,
        ).lastInsertRowid;
        section.items.forEach((item, itemIndex) => {
          insertItem.run(sectionId, item.name, item.expectedQty, itemIndex);
        });
      });
    }
  });

  seedTx(seed.rooms);
}

declare global {
  var __stockCheckDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!global.__stockCheckDb) {
    global.__stockCheckDb = openDatabase();
  }
  return global.__stockCheckDb;
}
