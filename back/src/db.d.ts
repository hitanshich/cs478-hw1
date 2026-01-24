import sqlite3 from "sqlite3";
import { type Database } from "sqlite";
export type DB = Database<sqlite3.Database, sqlite3.Statement>;
export declare function openDb(): Promise<DB>;
//# sourceMappingURL=db.d.ts.map