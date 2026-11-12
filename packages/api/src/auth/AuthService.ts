import bcrypt from 'bcrypt';
import { sign, verify } from 'hono/jwt';
import {
  type AuthHashPasswordRequest,
  type AuthLoginRequest,
  AuthLoginRequestSchema,
  type AuthLoginResponse,
  type AuthMeRequest,
  type AuthMeResponse,
  type AuthRegisterRequest,
  AuthRegisterRequestSchema,
  type AuthRegisterResponse,
} from 'types/Auth.ts';
import { UserSchema } from 'types/User.ts';
import { ENV } from '#api/env.ts';
import { createError } from '#api/errors.ts';
import UserRepository from '../user/UserRepository.ts';

export default class AuthService {
  static async hashPassword(params: AuthHashPasswordRequest) {
    const result = await bcrypt.hash(params.password, 10);

    return result;
  }

  static async register(params: AuthRegisterRequest): Promise<AuthRegisterResponse> {
    const { password, ...user } = AuthRegisterRequestSchema.parse(params);
    const existingUser = await UserRepository.findBy({ email: user.email });

    if (existingUser) throw createError('EMAIL_EXISTS');

    const password_hash = await AuthService.hashPassword({ password });
    const result = await UserRepository.create({ ...user, password_hash });

    const publicUser = UserSchema.parse({
      id: result.id,
      email: result.email,
      name: result.name,
    });

    return publicUser;
  }

  static async login(params: AuthLoginRequest): Promise<AuthLoginResponse> {
    const { email, password } = AuthLoginRequestSchema.parse(params);
    const user = await UserRepository.findBy({ email });

    if (!user || !(await bcrypt.compare(password, user.password_hash))) throw createError('INVALID_CREDENTIALS');

    const token = await sign({ sub: user.id }, ENV.JWT_SECRET, 'HS256');

    return { token };
  }

  static async me({ token }: AuthMeRequest): Promise<AuthMeResponse> {
    let subject: string;

    try {
      const payload = await verify(token, ENV.JWT_SECRET, 'HS256');

      if (typeof payload.sub !== 'string') {
        throw createError('INVALID_TOKEN');
      }

      subject = payload.sub;
    } catch {
      throw createError('INVALID_TOKEN');
    }

    const user = await UserRepository.findBy({ id: subject });

    if (!user) throw createError('INVALID_TOKEN');

    const result = UserSchema.parse({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return result;
  }
}
