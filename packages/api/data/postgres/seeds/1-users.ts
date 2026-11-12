import { randomBytes } from 'node:crypto';
import { faker } from '@faker-js/faker';
import type { UserRowInsert } from 'types/User.ts';
import AuthService from '#api/auth/AuthService.ts';
import UserRepository from '#api/user/UserRepository.ts';

export async function seed(): Promise<void> {
  const users: UserRowInsert[] = [
    {
      email: 'john.doe@gmail.com',
      name: 'John Doe',
      password_hash: await AuthService.hashPassword({ password: 'password' }),
    },
    {
      email: 'jane.dane@gmail.com',
      name: 'Jane Dane',
      password_hash: await AuthService.hashPassword({ password: 'password' }),
    },
  ];

  for (let index = 0; index < 10; index++) {
    const passwordHash = await AuthService.hashPassword({
      password: faker.internet.password(),
    });

    users.push({
      email: `${randomBytes(5).toString('hex')}@example.com`,
      name: faker.person.fullName(),
      password_hash: passwordHash,
    });
  }

  await UserRepository.create(users);
}
