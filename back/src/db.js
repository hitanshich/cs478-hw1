import sqlite3 from "sqlite3";
import { open } from "sqlite";
export async function openDb() {
    const db = await open({
        filename: "./database.db",
        driver: sqlite3.Database,
    });
    await db.get("PRAGMA foreign_keys = ON");
    return db;
}
//# sourceMappingURL=db.js.map