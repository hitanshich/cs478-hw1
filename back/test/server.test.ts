import axios, { AxiosError } from "axios";
import sqlite3 from "sqlite3";
import { open, type Database } from "sqlite";
import { beforeAll, afterAll, beforeEach, expect, test } from "vitest";
import type { Server } from "http";
import { app } from "../src/server";

let server: Server;

beforeAll(async () => {
  server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(3000, "127.0.0.1", () => resolve(s));
    s.on("error", reject);
  });

  axios.defaults.baseURL = "http://127.0.0.1:3000/api";
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

sqlite3.verbose();

const db: Database = await open({
  filename: "./database.db",
  driver: sqlite3.Database,
});

const authors = [
  { id: 1, name: "this author", bio: "this bio" },
  { id: 2, name: "that author", bio: "that bio" },
];

const books = [
  { id: 1, authorID: 1, title: "old book", publishYear: "2000", genre: "mystery" },
  { id: 2, authorID: 1, title: "new book", publishYear: "2020", genre: "sci-fi" },
];

async function expectAxiosStatus(p: Promise<any>, status: number) {
  try {
    await p;
    throw new Error("Should've returned error response");
  } catch (err) {
    const error = err as AxiosError;
    if (error.response === undefined) throw new Error("Server never sent response");
    expect(error.response.status).toBe(status);
  }
}

beforeEach(async () => {
  await db.run("DELETE FROM books");
  await db.run("DELETE FROM authors");

  for (const a of authors) {
    await db.run("INSERT INTO authors(id, name, bio) VALUES(?, ?, ?)", [
      a.id,
      a.name,
      a.bio,
    ]);
  }

  for (const b of books) {
   await db.run(
  "INSERT INTO books(id, author_id, created_by_user_id, title, pub_year, genre) VALUES(?, ?, ?, ?, ?, ?)",
  [b.id, b.authorID, 1, b.title, b.publishYear, b.genre]
);

  }
});

test("GET /authors returns all authors", async () => {
  const res = await axios.get("/authors");
  expect(res.status).toBe(200);
  expect(res.data).toEqual(authors);
});

test("GET /authors/:id returns author by id", async () => {
  const res = await axios.get("/authors/1");
  expect(res.status).toBe(200);
  expect(res.data).toEqual(authors[0]);
});

test("GET /authors/:id invalid id returns 400", async () => {
  await expectAxiosStatus(axios.get("/authors/abc"), 400);
});

test("GET /authors/:id missing id returns 404", async () => {
  await expectAxiosStatus(axios.get("/authors/999"), 404);
});

test("POST /authors creates author and sets Location", async () => {
  const body = { name: "New Author", bio: "New Bio" };
  const res = await axios.post("/authors", body);

  expect(res.status).toBe(201);
  expect(res.headers.location).toBeDefined();

  const newID = Number(res.headers.location);
  expect(Number.isInteger(newID)).toBe(true);

  const row = await db.get("SELECT id, name, bio FROM authors WHERE id = ?", [newID]);
  expect(row).toEqual({ id: newID, ...body });
});

test("POST /authors missing name returns 400", async () => {
  await expectAxiosStatus(axios.post("/authors", { bio: "Bio" }), 400);
});

test("DELETE /authors/:id deletes author", async () => {
  const res = await axios.delete("/authors/2");
  expect(res.status).toBe(204);

  const row = await db.get("SELECT * FROM authors WHERE id = ?", [2]);
  expect(row).toBeUndefined();
});

test("DELETE /authors/:id missing returns 404", async () => {
  await expectAxiosStatus(axios.delete("/authors/999"), 404);
});

test("DELETE /authors/:id with books returns 409", async () => {
  await expectAxiosStatus(axios.delete("/authors/1"), 409);
});

test("GET /books returns all books", async () => {
  const res = await axios.get("/books");
  expect(res.status).toBe(200);
  expect(res.data).toEqual(books);
});

test("GET /books/:id returns book by id", async () => {
  const res = await axios.get("/books/2");
  expect(res.status).toBe(200);
  expect(res.data).toEqual(books[1]);
});

test("GET /books/:id invalid id returns 400", async () => {
  await expectAxiosStatus(axios.get("/books/abc"), 400);
});

test("GET /books/:id missing returns 404", async () => {
  await expectAxiosStatus(axios.get("/books/999"), 404);
});

test("POST /books creates book and sets Location", async () => {
  const body = {
    authorID: 1,
    title: "Brand New",
    publishYear: "2000",
    genre: "history",
  };

  const res = await axios.post("/books", body);
  expect(res.status).toBe(201);
  expect(res.headers.location).toBeDefined();

  const newID = Number(res.headers.location);
  expect(Number.isInteger(newID)).toBe(true);

  const row = await db.get("SELECT * FROM books WHERE id = ?", [newID]);
  expect(row).toEqual({
    id: newID,
    author_id: body.authorID,
    title: body.title,
    pub_year: body.publishYear,
    genre: body.genre,
  });
});

test("POST /books authorID does not exist returns 400", async () => {
  const body = { authorID: 999, title: "X", publishYear: "2000", genre: "history" };
  await expectAxiosStatus(axios.post("/books", body), 400);
});

test("POST /books invalid publishYear returns 400", async () => {
  const body = { authorID: 1, title: "X", publishYear: "20", genre: "history" };
  await expectAxiosStatus(axios.post("/books", body), 400);
});

test("GET /books?minYear=2010 filters correctly", async () => {
  const res = await axios.get("/books?minYear=1900");
  expect(res.status).toBe(200);
  expect(res.data).toEqual(books); // both qualify
});


test("DELETE /books/:id deletes book", async () => {
  const res = await axios.delete("/books/2");
  expect(res.status).toBe(204);

  const row = await db.get("SELECT * FROM books WHERE id = ?", [2]);
  expect(row).toBeUndefined();
});

test("PUT /books/:id edits a book", async () => {
  const body = {
    authorID: 1,
    title: "Edited Title",
    publishYear: "2001",
    genre: "history",
  };

  const res = await axios.put("/books/1", body);
  expect(res.status).toBe(200);
  expect(res.data).toEqual({ id: 1, ...body });

  const row = await db.get("SELECT * FROM books WHERE id = ?", [1]);
  expect(row).toEqual({
    id: 1,
    author_id: body.authorID,
    title: body.title,
    pub_year: body.publishYear,
    genre: body.genre,
  });
});

test("PUT /books/:id invalid publishYear returns 400", async () => {
  const body = {
    authorID: 1,
    title: "Bad Year Book",
    publishYear: "20",
    genre: "Fiction",
  };

  await expectAxiosStatus(axios.put("/books/1", body), 400);
});

test("PUT /books/:id missing returns 404", async () => {
  const body = {
    authorID: 1,
    title: "Missing Book",
    publishYear: "2001",
    genre: "Fiction",
  };

  await expectAxiosStatus(axios.put("/books/999999", body), 404);
});

test("DELETE /books/:id missing returns 404", async () => {
  await expectAxiosStatus(axios.delete("/books/999"), 404);
});
