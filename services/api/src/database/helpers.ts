import { faker } from '@faker-js/faker';

const password_hash = 'password';

type UserCreateRequest = any;
type UserRowInsert = any;

export const generateUser = (params: Partial<UserCreateRequest>): UserRowInsert => {
  const result: UserCreateRequest = {
    email: faker.internet.email().toLowerCase(),
    password_hash,
    name: faker.person.fullName(),
    ...params,
  };
  return result;
};
