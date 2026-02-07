import sqlite3 from "sqlite3";
import { open, type Database } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

export type DB = Database<sqlite3.Database, sqlite3.Statement>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const DB_PATH = path.join(__dirname, "../database.db");

export async function openDb(): Promise<DB> {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await db.get("PRAGMA foreign_keys = ON");
  return db;
}
