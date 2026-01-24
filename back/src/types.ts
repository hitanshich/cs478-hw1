import { z } from "zod";

export const PublishYearSchema = z.string().regex(/^\d{4}$/);

export const AuthorCreateSchema = z.object({
  name: z.string().min(1).max(200),
  bio: z.string().min(1).max(2000),
});

export type AuthorCreate = z.infer<typeof AuthorCreateSchema>;

export type Author = {
  id: number;
  name: string;
  bio: string;
};

export const BookCreateSchema = z.object({
  authorID: z.number().int().positive(),
  title: z.string().min(1).max(300),
  publishYear: PublishYearSchema,
  genre: z.string().min(1).max(100),
});

export type BookCreate = z.infer<typeof BookCreateSchema>;

export type Book = {
  id: number;
  authorID: number;
  title: string;
  publishYear: string;
  genre: string;
};
