import { z } from "zod";

export const UserRowSchema = z
  .object({
    id: z.number(),
    email: z.string().email(),
    password: z.string(),
  })
  .strict();
export type UserRowUnsafe = z.input<typeof UserRowSchema>;
export type UserRow = z.output<typeof UserRowSchema>;

export const UserSchema = UserRowSchema.extend({});
export type User = z.output<typeof UserSchema>;
