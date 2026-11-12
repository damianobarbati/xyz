import { pg } from './data/postgres/client.ts';
import { redis } from './data/redis/client.ts';
import UserRepository from './src/user/UserRepository.ts';

export { startServer } from './src/index.ts';

type RemoveUsersInput = { emails: Iterable<string> };

export const removeTestUsers = async ({ emails }: RemoveUsersInput) => {
  for (const email of emails) {
    const user = await UserRepository.findBy({ email });

    if (user) await UserRepository.remove(user.id);
  }
};

export const closeTestResources = async () => {
  try {
    await pg.destroy();
  } finally {
    redis.disconnect();
  }
};

export const checkTestDatabase = async () => {
  await pg.raw('SELECT 1');
};
