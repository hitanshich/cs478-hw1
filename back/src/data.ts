import { openDb } from "./db.js";
import argon2 from "argon2";

async function main() {
  const db = await openDb();

  // Clear tables (order matters because of foreign keys)
  await db.run("DELETE FROM books");
  await db.run("DELETE FROM sessions");
  await db.run("DELETE FROM users");
  await db.run("DELETE FROM authors");

  // Seed authors
  const authorRows = [
    { name: "Jules Verne", bio: "French novelist, poet, and playwright." },
    { name: "Ursula K. Le Guin", bio: "American author known for speculative fiction." },
    { name: "Mary Shelley", bio: "English novelist who wrote Frankenstein." },
  ];

  const authorIDs: number[] = [];
  for (const a of authorRows) {
    const r = await db.run("INSERT INTO authors (name, bio) VALUES (?, ?)", [a.name, a.bio]);
    authorIDs.push(r.lastID as number);
  }

  // Seed required dummy user: foo / bar
  const username = "foo";
  const password = "bar";
  const passwordHash = await argon2.hash(password);

  const userRes = await db.run(
    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    [username, passwordHash]
  );
  const fooUserID = userRes.lastID as number;

  // Seed books owned by foo
  const bookRows = [
    {
      authorID: authorIDs[0],
      title: "Twenty Thousand Leagues Under the Seas",
      pubYear: "1870",
      genre: "adventure",
    },
    {
      authorID: authorIDs[1],
      title: "A Wizard of Earthsea",
      pubYear: "1968",
      genre: "fantasy",
    },
    {
      authorID: authorIDs[2],
      title: "Frankenstein",
      pubYear: "1818",
      genre: "horror",
    },
  ];

  for (const b of bookRows) {
    await db.run(
      "INSERT INTO books (author_id, created_by_user_id, title, pub_year, genre) VALUES (?, ?, ?, ?, ?)",
      [b.authorID, fooUserID, b.title, b.pubYear, b.genre]
    );
  }

  console.log("Seeded database with authors, books, and user foo/bar.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
