import express, { type Request, type Response, type NextFunction } from "express";
import { openDb } from "./db.js";
import {
  AuthorCreateSchema,
  BookCreateSchema,
  type Author,
  type Book,
  RegisterSchema,
  LoginSchema,
  type User,
} from "./types.js";

import cookieParser from "cookie-parser";
import argon2 from "argon2";
import crypto from "crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"], 
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
      },
    },
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicFolderPath = path.join(__dirname, "public");
app.use(express.static(publicFolderPath));

const loginRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

function blockCsrf(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }
  const xrw = req.get("X-Requested-With");
  if (xrw !== "XMLHttpRequest") {
    return res.status(403).json({ error: "CSRF blocked" });
  }

  next();
}

app.use("/api", blockCsrf);


function getCookieSettings() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}



declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}




function parsePositiveInt(value: string): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function requirePositiveIn(value: unknown, res: Response): number | null {
  if (typeof value !== "string") {
    res.status(400).json({ error: "id must be a positive integer" });
    return null;
  }
  const n = parsePositiveInt(value);
  if (n === null) {
    res.status(400).json({ error: "id must be a positive integer" });
    return null;
  }
  return n;
}





async function getUserFromToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const db = await openDb();
  const row = await db.get<{ id: number; username: string }>(
    `SELECT users.id as id, users.username as username
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?`,
    token
  );
  return row ? { id: row.id, username: row.username } : null;
}

async function requireAuth(req: Request, res: Response): Promise<User | null> {
  const token = req.cookies?.auth_token as string | undefined;
  const user = await getUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: "Not logged in" });
    return null;
  }
  req.user = user;
  return user;
}


app.post("/api/auth/register", loginRegisterLimiter, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const db = await openDb();
  const existing = await db.get<{ id: number }>(
    "SELECT id FROM users WHERE username = ?",
    parsed.data.username
  );
  if (existing) return res.status(409).json({ error: "Username already taken" });

  const passwordHash = await argon2.hash(parsed.data.password);
  const result = await db.run(
    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    [parsed.data.username, passwordHash]
  );

  const created: User = { id: result.lastID as number, username: parsed.data.username };
  return res.status(201).json(created);
});

app.post("/api/auth/login", loginRegisterLimiter, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const db = await openDb();
  const row = await db.get<{ id: number; username: string; password_hash: string }>(
    "SELECT id, username, password_hash FROM users WHERE username = ?",
    parsed.data.username
  );
  if (!row) return res.status(401).json({ error: "Invalid username or password" });

  const ok = await argon2.verify(row.password_hash, parsed.data.password);
  if (!ok) return res.status(401).json({ error: "Invalid username or password" });

  const token = crypto.randomBytes(32).toString("hex");
  await db.run("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", [
    token,
    row.id,
    Date.now(),
  ]);

  res.cookie("auth_token", token, getCookieSettings());
  return res.json({ id: row.id, username: row.username });
});

app.post("/api/auth/logout", async (req, res) => {
  const token = req.cookies?.auth_token as string | undefined;
  if (token) {
    const db = await openDb();
    await db.run("DELETE FROM sessions WHERE token = ?", token);
  }
  res.clearCookie("auth_token", { path: "/" });
  return res.status(204).send();
});

app.get("/api/auth/me", async (req, res) => {
  const token = req.cookies?.auth_token as string | undefined;
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Not logged in" });
  return res.json(user);
});


app.post("/api/authors", async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const parsed = AuthorCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const db = await openDb();
  const result = await db.run("INSERT INTO authors (name, bio) VALUES (?, ?)", [
    parsed.data.name,
    parsed.data.bio,
  ]);

  const created: Author = {
    id: result.lastID as number,
    name: parsed.data.name,
    bio: parsed.data.bio,
  };

  return res.status(201).set("Location", created.id.toString()).json(created);
});

app.get("/api/authors", async (_req, res) => {
  const db = await openDb();
  const authors = await db.all<Author[]>("SELECT id, name, bio FROM authors");
  return res.json(authors);
});

app.get("/api/authors/:id", async (req, res) => {
  const id = requirePositiveIn(req.params.id, res);
  if (id === null) return;

  const db = await openDb();
  const author = await db.get<Author>("SELECT id, name, bio FROM authors WHERE id = ?", id);
  if (!author) return res.status(404).json({ error: "Author not found" });

  return res.json(author);
});

app.delete("/api/authors/:id", async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const id = requirePositiveIn(req.params.id, res);
  if (id === null) return;

  const db = await openDb();
  try {
    const result = await db.run("DELETE FROM authors WHERE id = ?", id);
    if (result.changes === 0) return res.status(404).json({ error: "Author not found" });
    return res.status(204).send();
  } catch {
    return res.status(409).json({ error: "Cannot delete author because they still have books" });
  }
});

app.post("/api/books", async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const parsed = BookCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const db = await openDb();

  const author = await db.get<Author>("SELECT id FROM authors WHERE id = ?", parsed.data.authorID);
  if (!author) return res.status(400).json({ error: "authorID does not exist" });

  const result = await db.run(
    "INSERT INTO books (author_id, created_by_user_id, title, pub_year, genre) VALUES (?, ?, ?, ?, ?)",
    [parsed.data.authorID, user.id, parsed.data.title, parsed.data.publishYear, parsed.data.genre]
  );

  const created: Book = {
    id: result.lastID as number,
    authorID: parsed.data.authorID,
    createdByUserID: user.id,
    title: parsed.data.title,
    publishYear: parsed.data.publishYear,
    genre: parsed.data.genre,
  };

  return res.status(201).set("Location", created.id.toString()).json(created);
});

app.get("/api/books", async (req, res) => {
  const db = await openDb();
  const { authorID, genre, minYear } = req.query;

  const whereParts: string[] = [];
  const params: (string | number)[] = [];

  if (typeof authorID === "string") {
    const authorIdNum = parsePositiveInt(authorID);
    if (authorIdNum === null) return res.status(400).json({ error: "authorID must be a positive integer" });
    whereParts.push("author_id = ?");
    params.push(authorIdNum);
  }

  if (typeof genre === "string") {
    whereParts.push("genre = ?");
    params.push(genre);
  }

  if (typeof minYear === "string") {
    if (!/^\d{4}$/.test(minYear)) return res.status(400).json({ error: "minYear must be 4 digits" });
    whereParts.push("pub_year >= ?");
    params.push(minYear);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const rows = await db.all<
    { id: number; author_id: number; created_by_user_id: number; title: string; pub_year: string; genre: string }[]
  >(`SELECT id, author_id, created_by_user_id, title, pub_year, genre FROM books ${whereClause}`, params);

  const books: Book[] = rows.map((r) => ({
    id: r.id,
    authorID: r.author_id,
    createdByUserID: r.created_by_user_id,
    title: r.title,
    publishYear: r.pub_year,
    genre: r.genre,
  }));

  return res.json(books);
});

app.get("/api/books/:id", async (req, res) => {
  const id = requirePositiveIn(req.params.id, res);
  if (id === null) return;

  const db = await openDb();
  const row = await db.get<{
    id: number;
    author_id: number;
    created_by_user_id: number;
    title: string;
    pub_year: string;
    genre: string;
  }>("SELECT id, author_id, created_by_user_id, title, pub_year, genre FROM books WHERE id = ?", id);

  if (!row) return res.status(404).json({ error: "Book not found" });

  const book: Book = {
    id: row.id,
    authorID: row.author_id,
    createdByUserID: row.created_by_user_id,
    title: row.title,
    publishYear: row.pub_year,
    genre: row.genre,
  };

  return res.json(book);
});

app.put("/api/books/:id", async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const id = requirePositiveIn(req.params.id, res);
  if (id === null) return;

  const parsedRequest = BookCreateSchema.safeParse(req.body);
  if (!parsedRequest.success) return res.status(400).json({ error: parsedRequest.error.flatten() });

  const db = await openDb();

  const author = await db.get<{ id: number }>("SELECT id FROM authors WHERE id = ?", parsedRequest.data.authorID);
  if (!author) return res.status(400).json({ error: "AuthorID does not exist" });

  const savedBook = await db.get<{ created_by_user_id: number }>(
    "SELECT created_by_user_id FROM books WHERE id = ?",
    id
  );
  if (!savedBook) return res.status(404).json({ error: "Book not found" });

  if (savedBook.created_by_user_id !== user.id) {
    return res.status(403).json({ error: "You can only edit books you created" });
  }

  await db.run(
    "UPDATE books SET author_id = ?, title = ?, pub_year = ?, genre = ? WHERE id = ?",
    [parsedRequest.data.authorID, parsedRequest.data.title, parsedRequest.data.publishYear, parsedRequest.data.genre, id]
  );

  const editedBook: Book = {
    id,
    authorID: parsedRequest.data.authorID,
    createdByUserID: user.id,
    title: parsedRequest.data.title,
    publishYear: parsedRequest.data.publishYear,
    genre: parsedRequest.data.genre,
  };

  return res.json(editedBook);
});

app.delete("/api/books/:id", async (req, res) => {
  const user = await requireAuth(req, res);
  if (!user) return;

  const id = requirePositiveIn(req.params.id, res);
  if (id === null) return;

  const db = await openDb();

  const savedBook = await db.get<{ created_by_user_id: number }>(
    "SELECT created_by_user_id FROM books WHERE id = ?",
    id
  );
  if (!savedBook) return res.status(404).json({ error: "Book not found" });

  if (savedBook.created_by_user_id !== user.id) {
    return res.status(403).json({ error: "You can only delete books you created" });
  }

  await db.run("DELETE FROM books WHERE id = ?", id);
  return res.status(204).send();
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicFolderPath, "index.html"));
});

export { app };
export default app;

if (process.env.NODE_ENV !== "test") {
  const port = 3000;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
