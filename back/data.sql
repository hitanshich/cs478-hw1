DELETE FROM sessions;
DELETE FROM books;
DELETE FROM authors;
DELETE FROM users;


INSERT INTO users (username, password_hash) VALUES
  ('foo', '$argon2id$v=19$m=65536,t=3,p=4$REPLACE_ME$REPLACE_ME');

INSERT INTO authors (name, bio) VALUES
  ('J.K. Rowling', 'Science Fiction author.'),
  ('Freida McFadden', 'Murder Mystery author'),
  ('Colleen Hoover', 'Romance Fiction author');
  
INSERT INTO books (author_id, created_by_user_id, title, pub_year, genre) VALUES
  (1, 1, 'Harry Potter & The Chamber of Secrets', '1998', 'Sci-Fi'),
  (2, 1, 'Never Lie', '2022', 'Mystery'),
  (3, 1, 'Verity', '2018', 'Psychological Thriller');
