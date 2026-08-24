import { type UserRow, UserSchema } from "types/User.ts";
import { describe, expect, it } from "vitest";

describe("User", () => {
  describe("UserSchema", () => {
    it("should succeed", () => {
      const user_row: UserRow = { id: 1, email: "john.doe@gmail.com", password: "password" };
      const actual = UserSchema.safeParse(user_row);
      expect(actual.success).toBe(true);
    });

    it("should fail", () => {
      const user_row: UserRow = { id: 1, email: "john.doe", password: "password" };
      const actual = UserSchema.safeParse(user_row);
      expect(actual.success).toBe(false);
    });
  });
});
