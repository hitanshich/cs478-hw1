import { openDb } from "./db.js";
import argon2 from "argon2";

async function main() {
  const db = await openDb();

  await db.exec("PRAGMA foreign_keys = ON;");

  await db.run("DELETE FROM sessions");
  await db.run("DELETE FROM books");
  await db.run("DELETE FROM users");
  await db.run("DELETE FROM authors");

  const authorsToAdd = [
    { name: "J.K. Rowling", bio: "Science Fiction author." },
    { name: "Freida McFadden", bio: "Murder Mystery author." },
    { name: "Colleen Hoover", bio: "Romance Fiction author." },
  ];

  const authorIds: number[] = [];
  for (const a of authorsToAdd) {
    const result = await db.run("INSERT INTO authors (name, bio) VALUES (?, ?)", [
      a.name,
      a.bio,
    ]);
    authorIds.push(result.lastID as number);
  }

  // 2) Add the required dummy user: foo / bar
  const username = "foo";
  const password = "bar";
  const passwordHash = await argon2.hash(password);

  const userResult = await db.run(
    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    [username, passwordHash]
  );
  const fooUserId = userResult.lastID as number;

  const booksToAdd = [
    {
      authorId: authorIds[0],
      title: "Harry Potter & The Chamber of Secrets",
      pubYear: "1998",
      genre: "Sci-Fi",
    },
    {
      authorId: authorIds[1],
      title: "Never Lie",
      pubYear: "2022",
      genre: "Mystery",
    },
    {
      authorId: authorIds[2],
      title: "Verity",
      pubYear: "2018",
      genre: "Psychological Thriller",
    },
  ];

  for (const b of booksToAdd) {
    await db.run(
      "INSERT INTO books (author_id, created_by_user_id, title, pub_year, genre) VALUES (?, ?, ?, ?, ?)",
      [b.authorId, fooUserId, b.title, b.pubYear, b.genre]
    );
  }

  console.log("Seeded database with your authors/books and dummy user foo/bar.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
