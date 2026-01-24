import { z } from "zod";
export const PublishYearSchema = z.string().regex(/^\d{4}$/);
export const AuthorCreateSchema = z.object({
    name: z.string().min(1).max(200),
    bio: z.string().min(1).max(2000),
});
export const BookCreateSchema = z.object({
    authorID: z.number().int().positive(),
    title: z.string().min(1).max(300),
    publishYear: PublishYearSchema,
    genre: z.string().min(1).max(100),
});
//# sourceMappingURL=types.js.map