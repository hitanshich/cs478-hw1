import sqlite3 from "sqlite3";
import { open, type Database } from "sqlite";

export type DB = Database<sqlite3.Database, sqlite3.Statement>;

export async function openDb(): Promise<DB> {
  const db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });

  await db.get("PRAGMA foreign_keys = ON");
  return db;
}
