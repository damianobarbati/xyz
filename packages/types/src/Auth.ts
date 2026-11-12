import { z } from 'zod';
import { UserSchema } from './User.ts';

const PasswordSchema = z.string().min(8).max(50);

export const AuthRegisterRequestSchema = UserSchema.omit({ id: true }).extend({
  password: PasswordSchema,
});

export type AuthRegisterRequest = z.infer<typeof AuthRegisterRequestSchema>;

export const AuthRegisterResponseSchema = UserSchema;

export type AuthRegisterResponse = z.infer<typeof AuthRegisterResponseSchema>;

export const AuthLoginRequestSchema = AuthRegisterRequestSchema.omit({
  name: true,
});

export type AuthLoginRequest = z.infer<typeof AuthLoginRequestSchema>;

export const AuthLoginResponseSchema = z.object({ token: z.string().min(1) });

export type AuthLoginResponse = z.infer<typeof AuthLoginResponseSchema>;

export const AuthMeRequestSchema = z.object({
  token: z
    .string()
    .min(1)
    .meta({
      param: { name: 'Authorization', in: 'header' },
      example: 'Bearer <token>',
    }),
});

export type AuthMeRequest = z.infer<typeof AuthMeRequestSchema>;

export const AuthMeResponseSchema = UserSchema;

export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;

export const AuthHashPasswordRequestSchema = AuthRegisterRequestSchema.pick({
  password: true,
});

export type AuthHashPasswordRequest = z.infer<typeof AuthHashPasswordRequestSchema>;
