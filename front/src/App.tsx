import { useEffect, useState } from "react";
import { api } from "./api";
import "./App.css";


type Book = {
  id: number;
  authorID: number;
  title: string;
  publishYear: string;
  genre: string;
};

type Author = {
  id: number;
  name: string;
  bio: string;
};

export default function App() {
  let [books, setBooks] = useState<Book[]>([]);
  let [error, setError] = useState<string | null>(null);
  let [authorName, setAuthorName] = useState("");
  let [authorBio, setAuthorBio] = useState("");
  let [authorMessage, setAuthorMessage] = useState<string | null>(null);
  let [bookAuthorID, setBookAuthorID] = useState("");
  let [bookTitle, setBookTitle] = useState("");
  let [bookYear, setBookYear] = useState("");
  let [bookGenre, setBookGenre] = useState("");
  let [bookMessage, setBookMessage] = useState<string | null>(null);
  let [searchYear, setSearchYear] = useState("");
  let [searchMessage, setSearchMessage] = useState<string | null>(null);
  let [authors, setAuthors] = useState<Author[]>([]);


  useEffect(() => {
  (async () => {
    try {
      const booksRes = await api.get<Book[]>("/books");
      setBooks(booksRes.data);

      const authorsRes = await api.get<Author[]>("/authors");
      setAuthors(authorsRes.data);
    } catch {
      setError("Failed to load data.");
    }
  })();
}, []);


async function submitBook(e: React.FormEvent) {
  e.preventDefault();
  setBookMessage(null);

  if (bookAuthorID.trim() === "") {
    setBookMessage("Please select an author");
    return;
  }

  try {
    await api.post("/books", {
      authorID: Number(bookAuthorID),
      title: bookTitle,
      publishYear: bookYear,
      genre: bookGenre,
    });

    setBookMessage("Book created successfully");
    setBookAuthorID("");
    setBookTitle("");
    setBookYear("");
    setBookGenre("");

    const booksRes = await api.get<Book[]>("/books");
    setBooks(booksRes.data);
  } catch (err: any) {
    setBookMessage(err.response?.data?.error ?? "Failed to create book");
  }
}


function searchBooks(e: React.FormEvent) {
  e.preventDefault();
  setSearchMessage(null);

  const params: string[] = [];
  if (searchYear.trim() !== "") {
    params.push(`minYear=${encodeURIComponent(searchYear.trim())}`);
  }

  const url = params.length > 0 ? `/books?${params.join("&")}` : "/books";

  api
    .get<Book[]>(url)
    .then((res) => setBooks(res.data))
    .catch(() => setSearchMessage("Search failed"));
}


async function submitAuthor(e: React.FormEvent) {
  e.preventDefault();
  setAuthorMessage(null);

  try {
    await api.post("/authors", { name: authorName, bio: authorBio });
    setAuthorMessage("Author created successfully");
    setAuthorName("");
    setAuthorBio("");

    const authorsRes = await api.get<Author[]>("/authors");
    setAuthors(authorsRes.data);
  } catch (err: any) {
    setAuthorMessage(err.response?.data?.error ?? "Failed to create author");
  }
}


  return (
  <div className="page">
    <h1>Library</h1>

    {error && <p className="error">{error}</p>}

    <div className="topGrid">
      <div className="card">
        <h2>Add Author</h2>

        <form onSubmit={submitAuthor}>
          <div className="field">
            <label>Name</label>
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Bio</label>
            <input
              value={authorBio}
              onChange={(e) => setAuthorBio(e.target.value)}
            />
          </div>

          <button type="submit">Create Author</button>
        </form>

        {authorMessage && <p className="message success">{authorMessage}</p>}
      </div>

      <div className="card">
        <h2>Add Book</h2>

        <form onSubmit={submitBook}>
          <div className="field">
            <label>Author</label>
            <select
              value={bookAuthorID}
              onChange={(e) => setBookAuthorID(e.target.value)}
            >
              <option value="">Select an author</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (ID {a.id})
                </option>
              ))}
            </select>
          </div>

          <div className="row2">
          <div className="field">
            <label>Title</label>
            <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
          </div>

          <div className="field">
            <label>Publish Year (YYYY)</label>
            <input value={bookYear} onChange={(e) => setBookYear(e.target.value)} />
          </div>
        </div>

          <div className="field">
            <label>Genre</label>
            <input
              value={bookGenre}
              onChange={(e) => setBookGenre(e.target.value)}
            />
          </div>

          <button type="submit">Create Book</button>
        </form>

        {bookMessage && <p className="message success">{bookMessage}</p>}
      </div>

      <div className="card">
        <h2>Search Books</h2>

        <form onSubmit={searchBooks}>
          <div className="field">
            <label>Minimum publish year</label>
            <input
              value={searchYear}
              onChange={(e) => setSearchYear(e.target.value)}
              placeholder="e.g. 1900"
            />
          </div>

          <button type="submit">Search</button>
          <button
            type="button"
            onClick={() => {
              setSearchYear("");
              setSearchMessage(null);
              api.get<Book[]>("/books").then((res) => setBooks(res.data));
            }}
          >
            Clear
          </button>
        </form>

        {searchMessage && <p className="message error">{searchMessage}</p>}
      </div>
    </div>
    <div className="tableCard">
      <h2>Books</h2>

      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Year</th>
            <th>Genre</th>
            <th>Author ID</th>
          </tr>
        </thead>
        <tbody>
          {books
            .slice()
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((b) => (
              <tr key={b.id}>
                <td>{b.title}</td>
                <td>{b.publishYear}</td>
                <td>{b.genre}</td>
                <td>{b.authorID}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  </div>
);

}
