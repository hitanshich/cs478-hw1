import axios, { AxiosError } from "axios";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { expect, test, beforeEach } from "vitest";

sqlite3.verbose();

let db: Database = await open({
  filename: "./database.db",
  driver: sqlite3.Database,
});

let port = 3000;
let host = "localhost";
let protocol = "http";
let baseURL = `${protocol}://${host}:${port}`;

axios.defaults.baseURL = baseURL;

let authors = [
  { id: 1, name: "Author 1", bio: "Bio 1" },
  { id: 2, name: "Author 2", bio: "Bio 2" },
];

let books = [
  { id: 1, authorID: 1, title: "Old Book", publishYear: "1850", genre: "history" },
  { id: 2, authorID: 1, title: "New Book", publishYear: "1950", genre: "history" },
];

async function expectAxiosStatus(p: Promise<any>, status: number) {
  try {
    await p;
    throw new Error("Should've returned error response");
  } catch (err) {
    let error = err as AxiosError;
    if (error.response === undefined) throw new Error("Server never sent response");
    expect(error.response.status).toBe(status);
  }
}

beforeEach(async () => {
  await db.run("DELETE FROM books");
  await db.run("DELETE FROM authors");

  for (let a of authors) {
    await db.run("INSERT INTO authors(id, name, bio) VALUES(?, ?, ?)", [
      a.id,
      a.name,
      a.bio,
    ]);
  }

  for (let b of books) {
    await db.run(
      "INSERT INTO books(id, author_id, title, pub_year, genre) VALUES(?, ?, ?, ?, ?)",
      [b.id, b.authorID, b.title, b.publishYear, b.genre],
    );
  }
});

test("GET /authors returns all authors", async () => {
  let res = await axios.get("/authors");
  expect(res.status).toBe(200);
  expect(res.data).toEqual(authors);
});

test("GET /authors/:id returns author by id", async () => {
  let res = await axios.get("/authors/1");
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
  let body = { name: "New Author", bio: "New Bio" };
  let res = await axios.post("/authors", body);

  expect(res.status).toBe(201);
  expect(res.headers.location).toBeDefined();

  let newID = Number(res.headers.location);
  expect(Number.isInteger(newID)).toBe(true);

  let row = await db.get("SELECT id, name, bio FROM authors WHERE id = ?", [newID]);
  expect(row).toEqual({ id: newID, ...body });
});

test("POST /authors missing name returns 400", async () => {
  await expectAxiosStatus(axios.post("/authors", { bio: "Bio" }), 400);
});

test("DELETE /authors/:id deletes author", async () => {
  let res = await axios.delete("/authors/2");
  expect(res.status).toBe(204);

  let row = await db.get("SELECT * FROM authors WHERE id = ?", [2]);
  expect(row).toBeUndefined();
});

test("DELETE /authors/:id missing returns 404", async () => {
  await expectAxiosStatus(axios.delete("/authors/999"), 404);
});

test("DELETE /authors/:id with books returns 409", async () => {
  await expectAxiosStatus(axios.delete("/authors/1"), 409);
});

test("GET /books returns all books", async () => {
  let res = await axios.get("/books");
  expect(res.status).toBe(200);
  expect(res.data).toEqual(books);
});

test("GET /books/:id returns book by id", async () => {
  let res = await axios.get("/books/2");
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
  let body = {
    authorID: 1,
    title: "Brand New",
    publishYear: "2000",
    genre: "history",
  };

  let res = await axios.post("/books", body);
  expect(res.status).toBe(201);
  expect(res.headers.location).toBeDefined();

  let newID = Number(res.headers.location);
  expect(Number.isInteger(newID)).toBe(true);

  let row = await db.get("SELECT * FROM books WHERE id = ?", [newID]);
  expect(row).toEqual({
    id: newID,
    author_id: body.authorID,
    title: body.title,
    pub_year: body.publishYear,
    genre: body.genre,
  });
});

test("POST /books authorID does not exist returns 400", async () => {
  let body = { authorID: 999, title: "X", publishYear: "2000", genre: "history" };
  await expectAxiosStatus(axios.post("/books", body), 400);
});

test("POST /books invalid publishYear returns 400", async () => {
  let body = { authorID: 1, title: "X", publishYear: "20", genre: "history" };
  await expectAxiosStatus(axios.post("/books", body), 400);
});

test("GET /books?minYear=1900 filters correctly", async () => {
  let res = await axios.get("/books?minYear=1900");
  expect(res.status).toBe(200);
  expect(res.data).toEqual([books[1]]);
});

test("DELETE /books/:id deletes book", async () => {
  let res = await axios.delete("/books/2");
  expect(res.status).toBe(204);

  let row = await db.get("SELECT * FROM books WHERE id = ?", [2]);
  expect(row).toBeUndefined();
});
