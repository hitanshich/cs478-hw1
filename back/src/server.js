import express, {} from "express";
import { openDb } from "./db.js";
import { AuthorCreateSchema, BookCreateSchema, } from "./types.js";
const app = express();
app.use(express.json());
function parsePositiveInt(value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0)
        return null;
    return n;
}
function requirePositiveIntParam(value, res) {
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
app.post("/api/authors", async (req, res) => {
    const parsed = AuthorCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const db = await openDb();
    const result = await db.run("INSERT INTO authors (name, bio) VALUES (?, ?)", [
        parsed.data.name,
        parsed.data.bio,
    ]);
    const created = {
        id: result.lastID,
        name: parsed.data.name,
        bio: parsed.data.bio,
    };
    return res.status(201).set("Location", created.id.toString()).json(created);
});
app.get("/api/authors", async (_req, res) => {
    const db = await openDb();
    const authors = await db.all("SELECT id, name, bio FROM authors");
    return res.json(authors);
});
app.get("/api/authors/:id", async (req, res) => {
    const id = requirePositiveIntParam(req.params.id, res);
    if (id === null)
        return;
    const db = await openDb();
    const author = await db.get("SELECT id, name, bio FROM authors WHERE id = ?", id);
    if (!author) {
        return res.status(404).json({ error: "Author not found" });
    }
    return res.json(author);
});
app.delete("/api/authors/:id", async (req, res) => {
    const id = requirePositiveIntParam(req.params.id, res);
    if (id === null)
        return;
    const db = await openDb();
    try {
        const result = await db.run("DELETE FROM authors WHERE id = ?", id);
        if (result.changes === 0) {
            return res.status(404).json({ error: "Author not found" });
        }
        return res.status(204).send();
    }
    catch {
        return res.status(409).json({
            error: "Cannot delete author because they still have books",
        });
    }
});
app.post("/api/books", async (req, res) => {
    const parsed = BookCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const db = await openDb();
    const author = await db.get("SELECT id, name, bio FROM authors WHERE id = ?", parsed.data.authorID);
    if (!author) {
        return res.status(400).json({ error: "authorID does not exist" });
    }
    const result = await db.run("INSERT INTO books (author_id, title, pub_year, genre) VALUES (?, ?, ?, ?)", [
        parsed.data.authorID,
        parsed.data.title,
        parsed.data.publishYear,
        parsed.data.genre,
    ]);
    const created = {
        id: result.lastID,
        authorID: parsed.data.authorID,
        title: parsed.data.title,
        publishYear: parsed.data.publishYear,
        genre: parsed.data.genre,
    };
    return res.status(201).set("Location", created.id.toString()).json(created);
});
app.get("/api/books", async (req, res) => {
    const db = await openDb();
    const { authorID, genre, minYear } = req.query;
    const whereParts = [];
    const params = [];
    if (typeof authorID === "string") {
        const authorIdNum = parsePositiveInt(authorID);
        if (authorIdNum === null) {
            return res.status(400).json({ error: "authorID must be a positive integer" });
        }
        whereParts.push("author_id = ?");
        params.push(authorIdNum);
    }
    if (typeof genre === "string") {
        whereParts.push("genre = ?");
        params.push(genre);
    }
    if (typeof minYear === "string") {
        if (!/^\d{4}$/.test(minYear)) {
            return res.status(400).json({ error: "minYear must be 4 digits" });
        }
        whereParts.push("pub_year >= ?");
        params.push(minYear);
    }
    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
    const rows = await db.all(`SELECT id, author_id, title, pub_year, genre FROM books ${whereClause}`, params);
    const books = rows.map((r) => ({
        id: r.id,
        authorID: r.author_id,
        title: r.title,
        publishYear: r.pub_year,
        genre: r.genre,
    }));
    return res.json(books);
});
app.get("/api/books/:id", async (req, res) => {
    const id = requirePositiveIntParam(req.params.id, res);
    if (id === null)
        return;
    const db = await openDb();
    const row = await db.get("SELECT id, author_id, title, pub_year, genre FROM books WHERE id = ?", id);
    if (!row) {
        return res.status(404).json({ error: "Book not found" });
    }
    const book = {
        id: row.id,
        authorID: row.author_id,
        title: row.title,
        publishYear: row.pub_year,
        genre: row.genre,
    };
    return res.json(book);
});
app.delete("/api/books/:id", async (req, res) => {
    const id = requirePositiveIntParam(req.params.id, res);
    if (id === null)
        return;
    const db = await openDb();
    const result = await db.run("DELETE FROM books WHERE id = ?", id);
    if (result.changes === 0) {
        return res.status(404).json({ error: "Book not found" });
    }
    return res.status(204).send();
});
export default app;
if (process.env.NODE_ENV !== "test") {
    const port = 3000;
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}
//# sourceMappingURL=server.js.map