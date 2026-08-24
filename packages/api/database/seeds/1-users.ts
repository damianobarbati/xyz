import { generateUser } from "#api-database/helpers.ts";

export async function seed(database: any): Promise<void> {
  const usersCreates = [generateUser({ name: "John Doe" }), generateUser({ name: "Jane Dane" })];
  // @todo: await UserService.createAll(usersCreates);
  await database.insert(usersCreates).into("users");
}
