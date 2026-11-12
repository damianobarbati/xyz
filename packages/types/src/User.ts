import { z } from 'zod';

export const UserRowSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    name: z.string().min(1).max(100),
    password_hash: z.string(),
  })
  .strict();

export type UserRow = z.output<typeof UserRowSchema>;

export type UserRowInsert = Pick<UserRow, 'email' | 'name' | 'password_hash'>;

export const UserSchema = UserRowSchema.omit({ password_hash: true });

export type User = z.output<typeof UserSchema>;
