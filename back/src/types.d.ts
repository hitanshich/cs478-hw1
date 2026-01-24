import { z } from "zod";
export declare const PublishYearSchema: z.ZodString;
export declare const AuthorCreateSchema: z.ZodObject<{
    name: z.ZodString;
    bio: z.ZodString;
}, z.core.$strip>;
export type AuthorCreate = z.infer<typeof AuthorCreateSchema>;
export type Author = {
    id: number;
    name: string;
    bio: string;
};
export declare const BookCreateSchema: z.ZodObject<{
    authorID: z.ZodNumber;
    title: z.ZodString;
    publishYear: z.ZodString;
    genre: z.ZodString;
}, z.core.$strip>;
export type BookCreate = z.infer<typeof BookCreateSchema>;
export type Book = {
    id: number;
    authorID: number;
    title: string;
    publishYear: string;
    genre: string;
};
//# sourceMappingURL=types.d.ts.map