import { getDb } from "@/lib/db";

export type RoomSummary = { id: string; name: string };

export type ChecklistItem = {
  id: number;
  name: string;
  expectedQty: string | null;
  sortOrder: number;
  hasPhoto: boolean;
};

export type ChecklistSection = {
  id: number;
  name: string;
  items: ChecklistItem[];
};

export type RoomChecklist = {
  room: RoomSummary;
  sections: ChecklistSection[];
};

export function getAllRooms(): RoomSummary[] {
  const db = getDb();
  return db.prepare("SELECT id, name FROM rooms ORDER BY name").all() as RoomSummary[];
}

export function getRoom(roomId: string): RoomSummary | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, name FROM rooms WHERE id = ?")
    .get(roomId) as RoomSummary | undefined;
  return row ?? null;
}

export function getRoomChecklist(roomId: string): RoomChecklist | null {
  const db = getDb();
  const room = db
    .prepare("SELECT id, name FROM rooms WHERE id = ?")
    .get(roomId) as RoomSummary | undefined;
  if (!room) return null;

  const sectionRows = db
    .prepare(
      "SELECT id, name FROM sections WHERE room_id = ? AND active = 1 ORDER BY sort_order",
    )
    .all(roomId) as { id: number; name: string }[];

  const itemStmt = db.prepare(
    `SELECT id, name, expected_qty AS expectedQty, sort_order AS sortOrder,
            (photo_path IS NOT NULL) AS hasPhoto
     FROM items WHERE section_id = ? AND active = 1 ORDER BY sort_order`,
  );

  const sections: ChecklistSection[] = sectionRows.map((section) => ({
    id: section.id,
    name: section.name,
    items: (
      itemStmt.all(section.id) as (Omit<ChecklistItem, "hasPhoto"> & {
        hasPhoto: number;
      })[]
    ).map((item) => ({ ...item, hasPhoto: Boolean(item.hasPhoto) })),
  }));

  return { room, sections };
}

export function addSection(roomId: string, name: string): number {
  const db = getDb();
  const { maxOrder } = db
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM sections WHERE room_id = ?",
    )
    .get(roomId) as { maxOrder: number };

  return db
    .prepare(
      "INSERT INTO sections (room_id, name, sort_order) VALUES (?, ?, ?)",
    )
    .run(roomId, name.trim(), maxOrder + 1).lastInsertRowid as number;
}

export function renameSection(sectionId: number, name: string): void {
  const db = getDb();
  db.prepare("UPDATE sections SET name = ? WHERE id = ?").run(
    name.trim(),
    sectionId,
  );
}

export function deleteSection(sectionId: number): void {
  const db = getDb();
  db.prepare("UPDATE sections SET active = 0 WHERE id = ?").run(sectionId);
}

export function reorderSections(orderedSectionIds: number[]): void {
  const db = getDb();
  const stmt = db.prepare("UPDATE sections SET sort_order = ? WHERE id = ?");
  const tx = db.transaction((ids: number[]) => {
    ids.forEach((id, index) => stmt.run(index, id));
  });
  tx(orderedSectionIds);
}

export function addItem(
  sectionId: number,
  name: string,
  expectedQty: string | null,
): number {
  const db = getDb();
  const { maxOrder } = db
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM items WHERE section_id = ?",
    )
    .get(sectionId) as { maxOrder: number };

  return db
    .prepare(
      "INSERT INTO items (section_id, name, expected_qty, sort_order) VALUES (?, ?, ?, ?)",
    )
    .run(sectionId, name.trim(), expectedQty?.trim() || null, maxOrder + 1)
    .lastInsertRowid as number;
}

export function updateItem(
  itemId: number,
  name: string,
  expectedQty: string | null,
): void {
  const db = getDb();
  db.prepare("UPDATE items SET name = ?, expected_qty = ? WHERE id = ?").run(
    name.trim(),
    expectedQty?.trim() || null,
    itemId,
  );
}

export function deleteItem(itemId: number): void {
  const db = getDb();
  db.prepare("UPDATE items SET active = 0 WHERE id = ?").run(itemId);
}

export function reorderItems(orderedItemIds: number[]): void {
  const db = getDb();
  const stmt = db.prepare("UPDATE items SET sort_order = ? WHERE id = ?");
  const tx = db.transaction((ids: number[]) => {
    ids.forEach((id, index) => stmt.run(index, id));
  });
  tx(orderedItemIds);
}

export type ItemPhoto = { photoPath: string | null; photoMime: string | null };

export function getItemPhoto(itemId: number): ItemPhoto | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT photo_path AS photoPath, photo_mime AS photoMime FROM items WHERE id = ?",
    )
    .get(itemId) as ItemPhoto | undefined;
  return row ?? null;
}

export function setItemPhoto(
  itemId: number,
  photoPath: string,
  photoMime: string,
): void {
  const db = getDb();
  db.prepare(
    "UPDATE items SET photo_path = ?, photo_mime = ? WHERE id = ?",
  ).run(photoPath, photoMime, itemId);
}

export type SubmitResultInput = {
  itemId: number;
  present: boolean;
  note?: string | null;
};

export function submitCheckSession(
  roomId: string,
  staffName: string,
  results: SubmitResultInput[],
): number {
  const db = getDb();
  const missingCount = results.filter((r) => !r.present).length;
  const now = new Date().toISOString();

  const insertSession = db.prepare(
    `INSERT INTO check_sessions (room_id, staff_name, started_at, completed_at, total_items, missing_count)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insertResult = db.prepare(
    "INSERT INTO check_results (session_id, item_id, present, note) VALUES (?, ?, ?, ?)",
  );

  const tx = db.transaction(() => {
    const sessionId = insertSession.run(
      roomId,
      staffName,
      now,
      now,
      results.length,
      missingCount,
    ).lastInsertRowid as number;

    for (const result of results) {
      insertResult.run(
        sessionId,
        result.itemId,
        result.present ? 1 : 0,
        result.note?.trim() || null,
      );
    }

    return sessionId;
  });

  return tx();
}

export type SessionSummary = {
  id: number;
  roomId: string;
  staffName: string;
  startedAt: string;
  completedAt: string | null;
  totalItems: number;
  missingCount: number;
};

const SESSION_SUMMARY_COLUMNS = `
  id,
  room_id AS roomId,
  staff_name AS staffName,
  started_at AS startedAt,
  completed_at AS completedAt,
  total_items AS totalItems,
  missing_count AS missingCount
`;

export function getSessionsForRoom(
  roomId: string,
  limit = 50,
): SessionSummary[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT ${SESSION_SUMMARY_COLUMNS} FROM check_sessions WHERE room_id = ? ORDER BY started_at DESC LIMIT ?`,
    )
    .all(roomId, limit) as SessionSummary[];
}

export function getLatestSessionForRoom(
  roomId: string,
): SessionSummary | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT ${SESSION_SUMMARY_COLUMNS} FROM check_sessions WHERE room_id = ? ORDER BY started_at DESC LIMIT 1`,
    )
    .get(roomId) as SessionSummary | undefined;
  return row ?? null;
}

export type SessionResultDetail = {
  itemId: number;
  itemName: string;
  sectionName: string;
  expectedQty: string | null;
  present: boolean;
  note: string | null;
  hasPhoto: boolean;
};

export type SessionDetail = SessionSummary & {
  room: RoomSummary;
  results: SessionResultDetail[];
};

export function getSessionDetail(sessionId: number): SessionDetail | null {
  const db = getDb();
  const session = db
    .prepare(`SELECT ${SESSION_SUMMARY_COLUMNS} FROM check_sessions WHERE id = ?`)
    .get(sessionId) as SessionSummary | undefined;
  if (!session) return null;

  const room = db
    .prepare("SELECT id, name FROM rooms WHERE id = ?")
    .get(session.roomId) as RoomSummary;

  const resultRows = db
    .prepare(
      `SELECT
         cr.item_id AS itemId,
         i.name AS itemName,
         s.name AS sectionName,
         i.expected_qty AS expectedQty,
         cr.present AS present,
         cr.note AS note,
         (i.photo_path IS NOT NULL) AS hasPhoto
       FROM check_results cr
       JOIN items i ON i.id = cr.item_id
       JOIN sections s ON s.id = i.section_id
       WHERE cr.session_id = ?
       ORDER BY s.sort_order, i.sort_order`,
    )
    .all(sessionId) as (Omit<SessionResultDetail, "present" | "hasPhoto"> & {
    present: number;
    hasPhoto: number;
  })[];

  const results: SessionResultDetail[] = resultRows.map((row) => ({
    ...row,
    present: Boolean(row.present),
    hasPhoto: Boolean(row.hasPhoto),
  }));

  return { ...session, room, results };
}
