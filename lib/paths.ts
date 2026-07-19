import path from "node:path";

export function getDbPath(): string {
  return process.env.DB_PATH || path.join(process.cwd(), "data", "stock-check.db");
}

export function getDataDir(): string {
  return path.dirname(getDbPath());
}

export function getItemPhotosDir(): string {
  return path.join(getDataDir(), "item-photos");
}
