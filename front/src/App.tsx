import { useEffect, useState } from "react";
import { api } from "./api";

import "./App.css";

import {
  Container,
  Typography,
  Alert,
  Paper,
  Box,
  Stack,
  TextField,
  Button,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  IconButton,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

type User = {
  id: number;
  username: string;
};

type Book = {
  id: number;
  authorID: number;
  createdByUserID: number;
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

  let [deleteOpen, setDeleteOpen] = useState(false);
  let [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  let [deleteError, setDeleteError] = useState<string | null>(null);

  let [editOpen, setEditOpen] = useState(false);
  let [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  let [editError, setEditError] = useState<string | null>(null);

  let [editForm, setEditForm] = useState({
    authorID: "",
    title: "",
    publishYear: "",
    genre: "",
  });

  let [user, setUser] = useState<User | null>(null);
  let [authMessage, setAuthMessage] = useState<string | null>(null);

  let [loginUsername, setLoginUsername] = useState("");
  let [loginPassword, setLoginPassword] = useState("");
  let [registerUsername, setRegisterUsername] = useState("");
  let [registerPassword, setRegisterPassword] = useState("");

  let [authSeverity, setAuthSeverity] = useState<"success" | "error" | "info">( "info" );
  let [registerOpen, setRegisterOpen] = useState(false);



  async function refreshBooksAndAuthors() {
    const booksRes = await api.get<Book[]>("/books");
    setBooks(booksRes.data);

    const authorsRes = await api.get<Author[]>("/authors");
    setAuthors(authorsRes.data);
  }

  async function refreshMe() {
    try {
      const meRes = await api.get<User>("/auth/me");
      setUser(meRes.data);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
        await refreshBooksAndAuthors();
      } catch {
        setError("Failed to load data.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) {
      setEditOpen(false);
      setBookToEdit(null);
      setEditError(null);

      setDeleteOpen(false);
      setBookToDelete(null);
      setDeleteError(null);
    }
  }, [user]);

  async function doLogin(e: React.FormEvent) {
  e.preventDefault();
  setAuthMessage(null);

  try {
    await api.post("/auth/login", {
      username: loginUsername.trim(),
      password: loginPassword,
    });

    setLoginPassword("");
    await refreshMe();
    await refreshBooksAndAuthors();

    setAuthSeverity("success");
    setAuthMessage("Logged in!");
  } catch (err: any) {
    setAuthSeverity("error");
    setAuthMessage(err.response?.data?.error ?? "Login failed");
  }
}


  async function doRegister(e: React.FormEvent) {
  e.preventDefault();
  setAuthMessage(null);

  try {
    await api.post("/auth/register", {
      username: registerUsername.trim(),
      password: registerPassword,
    });

    setRegisterPassword("");

    setAuthSeverity("success");
    setLoginUsername(registerUsername.trim());
    setAuthMessage("Account created! You can log in now.");

    setRegisterOpen(false);
  } catch (err: any) {
    setAuthSeverity("error");
    setAuthMessage(err.response?.data?.error ?? "Register failed");
  }
}


  async function doLogout() {
  setAuthMessage(null);
  try {
    await api.post("/auth/logout");
  } finally {
    setUser(null);
    setAuthSeverity("success");
    setAuthMessage("Logged out.");
  }
}

  async function submitBook(e: React.FormEvent) {
    e.preventDefault();
    setBookMessage(null);

    if (!user) {
      setBookMessage("You must be logged in to create books.");
      return;
    }

    const year = bookYear.trim();

    if (bookAuthorID.trim() === "") {
      setBookMessage("Please select an author");
      return;
    }
    if (bookTitle.trim() === "" || bookGenre.trim() === "") {
      setBookMessage("Title and genre are required.");
      return;
    }
    if (!/^\d{4}$/.test(year)) {
      setBookMessage("Publish year must be 4 digits (YYYY).");
      return;
    }

    const yearNum = Number(year);
    const currentYear = new Date().getFullYear();
    if (yearNum < 1000 || yearNum > currentYear + 1) {
      setBookMessage(`Publish year must be between 1000 and ${currentYear + 1}.`);
      return;
    }

    try {
      await api.post("/books", {
        authorID: Number(bookAuthorID),
        title: bookTitle.trim(),
        publishYear: year,
        genre: bookGenre.trim(),
      });

      setBookMessage("Book created successfully");
      setBookAuthorID("");
      setBookTitle("");
      setBookYear("");
      setBookGenre("");

      await refreshBooksAndAuthors();
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

    if (!user) {
      setAuthorMessage("You must be logged in to create authors.");
      return;
    }

    try {
      await api.post("/authors", { name: authorName.trim(), bio: authorBio.trim() });
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Library
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h6">Account</Typography>
            {user ? (
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                <Typography>
                  Welcome <b>{user.username}</b>!
                </Typography>
                <Button variant="outlined" onClick={doLogout}>
                  Log out
                </Button>
              </Stack>
            ) : (
              <Typography sx={{ mt: 1 }} color="text.secondary">
                You are not logged in. Log in to add/edit/delete.
              </Typography>
            )}
          </Box>

         {!user && (
  <Box sx={{ width: { md: "60%" } }}>
    <Box
      component="form"
      onSubmit={doLogin}
      sx={{ display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" } }}
    >
      <TextField
        label="Username"
        value={loginUsername}
        onChange={(e) => setLoginUsername(e.target.value)}
        size="small"
        required
        fullWidth
      />
      <TextField
        label="Password"
        type="password"
        value={loginPassword}
        onChange={(e) => setLoginPassword(e.target.value)}
        size="small"
        required
        fullWidth
      />
      <Button type="submit" variant="contained" fullWidth>
        Log in
      </Button>
    </Box>

    <Typography variant="body2" sx={{ mt: 1 }}>
      Don&apos;t have an account?{" "}
      <Button
        variant="text"
        size="small"
        onClick={() => {
        setAuthMessage(null);
        setAuthSeverity("info");
        setRegisterUsername("");
        setRegisterPassword("");
        setRegisterOpen(true);
      }}

      >
        Register
      </Button>
    </Typography>
  </Box>
)}


        </Stack>

        {authMessage && (
  <Alert severity={authSeverity} sx={{ mt: 2 }}>
    {authMessage}
  </Alert>
)}


      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 2,
          alignItems: "start",
        }}
      >
        {user ? (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Add Author
            </Typography>

            <Box
              component="form"
              onSubmit={submitAuthor}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                label="Name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                required
                fullWidth
              />

              <TextField
                label="Bio"
                value={authorBio}
                onChange={(e) => setAuthorBio(e.target.value)}
                required
                fullWidth
              />

              <Button type="submit" variant="contained">
                Create Author
              </Button>
            </Box>

            {authorMessage && (
              <Alert
                severity={
                  authorMessage.toLowerCase().includes("success") ? "success" : "error"
                }
                sx={{ mt: 2 }}
              >
                {authorMessage}
              </Alert>
            )}
          </Paper>
        ) : (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Add Author
            </Typography>
            <Alert severity="info">Log in to create authors.</Alert>
          </Paper>
        )}

        {user ? (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Add Book
            </Typography>

            <Box
              component="form"
              onSubmit={submitBook}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                select
                label="Author"
                value={bookAuthorID}
                onChange={(e) => setBookAuthorID(e.target.value)}
                required
                fullWidth
              >
                <MenuItem value="">Select an author</MenuItem>
                {authors.map((a) => (
                  <MenuItem key={a.id} value={a.id.toString()}>
                    {a.name} (ID {a.id})
                  </MenuItem>
                ))}
              </TextField>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Title"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  required
                  fullWidth
                />

                <TextField
                  label="Publish Year (YYYY)"
                  value={bookYear}
                  onChange={(e) => setBookYear(e.target.value)}
                  required
                  fullWidth
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                />
              </Stack>

              <TextField
                label="Genre"
                value={bookGenre}
                onChange={(e) => setBookGenre(e.target.value)}
                required
                fullWidth
              />

              <Button type="submit" variant="contained" disabled={bookAuthorID.trim() === ""}>
                Create Book
              </Button>
            </Box>

            {bookMessage && (
              <Alert
                severity={bookMessage.toLowerCase().includes("success") ? "success" : "error"}
                sx={{ mt: 2 }}
              >
                {bookMessage}
              </Alert>
            )}
          </Paper>
        ) : (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Add Book
            </Typography>
            <Alert severity="info">Log in to create books.</Alert>
          </Paper>
        )}

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Search Books
          </Typography>

          <Box
            component="form"
            onSubmit={searchBooks}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Minimum publish year"
              value={searchYear}
              onChange={(e) => setSearchYear(e.target.value)}
              placeholder="e.g. 1900"
              fullWidth
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            />

            <Stack direction="row" spacing={2}>
              <Button type="submit" variant="contained">
                Search
              </Button>

              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  setSearchYear("");
                  setSearchMessage(null);
                  api.get<Book[]>("/books").then((res) => setBooks(res.data));
                }}
              >
                Clear
              </Button>
            </Stack>
          </Box>

          {searchMessage && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {searchMessage}
            </Alert>
          )}
        </Paper>
      </Box>

      <Paper sx={{ p: 2, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Books
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Genre</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Author ID</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {books
                .slice()
                .sort((a, b) => a.title.localeCompare(b.title))
                .map((b) => {
                  const author = authors.find((a) => a.id === b.authorID);
                  const isOwner = !!user && b.createdByUserID === user.id;

                  return (
                    <TableRow key={b.id}>
                      <TableCell>{b.title}</TableCell>
                      <TableCell>{b.publishYear}</TableCell>
                      <TableCell>{b.genre}</TableCell>
                      <TableCell>{author?.name ?? "Unknown"}</TableCell>
                      <TableCell>{b.authorID}</TableCell>

                      <TableCell align="right">
                        {isOwner ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => {
                                setBookToEdit(b);
                                setEditError(null);

                                setEditForm({
                                  authorID: b.authorID.toString(),
                                  title: b.title,
                                  publishYear: b.publishYear,
                                  genre: b.genre,
                                });

                                setEditOpen(true);
                              }}
                              aria-label="edit book"
                            >
                              <EditIcon />
                            </IconButton>

                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => {
                                setBookToDelete(b);
                                setDeleteError(null);
                                setDeleteOpen(true);
                              }}
                              aria-label="delete book"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {user ? "Not yours" : "Log in"}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
  open={registerOpen}
  onClose={() => {
  setRegisterOpen(false);
  setRegisterUsername("");
  setRegisterPassword("");
}}
  fullWidth
  maxWidth="sm"
>
  <DialogTitle>Create an account</DialogTitle>

  <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
    <Box
      component="form"
      onSubmit={doRegister}
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <TextField
        label="Username"
        value={registerUsername}
        onChange={(e) => setRegisterUsername(e.target.value)}
        required
        fullWidth
      />
      <TextField
        label="Password"
        type="password"
        value={registerPassword}
        onChange={(e) => setRegisterPassword(e.target.value)}
        required
        fullWidth
      />

      <DialogActions sx={{ px: 0 }}>
        <Button onClick={() => setRegisterOpen(false)}>Cancel</Button>
        <Button type="submit" variant="contained">
          Register
        </Button>
      </DialogActions>
    </Box>
  </DialogContent>
</Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setBookToDelete(null);
          setDeleteError(null);
        }}
      >
        <DialogTitle>Delete book?</DialogTitle>

        <DialogContent>
          <DialogContentText>
            {bookToDelete
              ? `Are you sure you want to delete "${bookToDelete.title}"? This cannot be undone.`
              : "Are you sure you want to delete this book? This cannot be undone."}
          </DialogContentText>

          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setDeleteOpen(false);
              setBookToDelete(null);
              setDeleteError(null);
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!bookToDelete) return;

              try {
                await api.delete(`/books/${bookToDelete.id}`);
                await refreshBooksAndAuthors();

                setDeleteOpen(false);
                setBookToDelete(null);
                setDeleteError(null);
              } catch (err: any) {
                setDeleteError(err.response?.data?.error ?? "Failed to delete book");
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setBookToEdit(null);
          setEditError(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit book</DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <FormControl fullWidth required>
            <InputLabel id="edit-author-label">Author</InputLabel>
            <Select
              labelId="edit-author-label"
              id="edit-author"
              value={editForm.authorID}
              label="Author"
              onChange={(e) => setEditForm((prev) => ({ ...prev, authorID: e.target.value }))}
            >
              <MenuItem value="">Select an author</MenuItem>
              {authors.map((a) => (
                <MenuItem key={a.id} value={a.id.toString()}>
                  {a.name} (ID {a.id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Title"
            value={editForm.title}
            onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
            required
            fullWidth
          />

          <TextField
            label="Publish Year (YYYY)"
            value={editForm.publishYear}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, publishYear: e.target.value }))
            }
            required
            fullWidth
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
          />

          <TextField
            label="Genre"
            value={editForm.genre}
            onChange={(e) => setEditForm((prev) => ({ ...prev, genre: e.target.value }))}
            required
            fullWidth
          />

          {editError && <Alert severity="error">{editError}</Alert>}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setEditOpen(false);
              setBookToEdit(null);
              setEditError(null);
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={async () => {
              if (!bookToEdit) return;

              const authorID = editForm.authorID.trim();
              const title = editForm.title.trim();
              const publishYear = editForm.publishYear.trim();
              const genre = editForm.genre.trim();

              if (!authorID || !title || !publishYear || !genre) {
                setEditError("All fields are required.");
                return;
              }
              if (!/^\d{4}$/.test(publishYear)) {
                setEditError("Publish year must be 4 digits (YYYY).");
                return;
              }

              try {
                await api.put(`/books/${bookToEdit.id}`, {
                  authorID: Number(authorID),
                  title,
                  publishYear,
                  genre,
                });

                await refreshBooksAndAuthors();

                setEditOpen(false);
                setBookToEdit(null);
                setEditError(null);
              } catch (err: any) {
                setEditError(err.response?.data?.error ?? "Failed to edit book");
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
