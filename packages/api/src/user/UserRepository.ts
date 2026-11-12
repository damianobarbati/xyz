import Repository from 'nano-fw/database/Repository.ts';
import type { UserRow, UserRowInsert } from 'types/User.ts';
import { pg } from '#data/postgres/client.ts';

class UserRepository extends Repository<UserRow, UserRow, UserRowInsert> {}

export default new UserRepository({ database: pg, tableName: 'users' });
