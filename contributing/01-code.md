# Code

Code style is enforced by the current `biome` configuration.  

The following general rules apply:
- Avoid code repetition.
- Avoid over-complication and over-engineering: if you can solve the problem with a simple helper function then use a simple helper function.
- Avoid using the **optional chaining operator** to silence property access on an object that may be falsy.
- Avoid promises and promise chaining and use only async/await syntax with try/catch statements.

## TypeScript & Coding Conventions

- **ESM only** - CommonJS is forbidden. Use `import`/`export`, never `require`/`module.exports`.
- **`type` over `interface`** for TypeScript types.
- **Zod type inference** for types shared across layers; dedicated types for layer-internal use.
- **Arrow functions** preferred over classes. Classes only when maintaining internal state.
- **Named exports** preferred. Default exports only for app entrypoint, singletons, and db connection.
- **Pure functions** preferred. Functions should do one thing only.
- **Small functions** - when they grow beyond ~40 lines, consider breaking them down.
- **`async/await` always** - never use callbacks. If forced, wrap with `node:util` `promisify`.
- **Named parameters** - use object destructuring instead of positional parameters. Define a named `type` for the input object and for the return value when returning multiple values or a complex object. Instead, for simple functions that return a single primitive value, do not use a named types.

# Typing

Each:
- Entity (eg: database schemas).
- Controller method request payload.
- Controller method response payload.
  must be defined in the shared folder `services/types`.

General rules of thumb:
- Don't overcomplicate typings, always prefer readibility.

## Entities

Each table must be named in plural form (eg: `users`).  
Each table must have a type named in the singular form (eg: `User`).  
Entity type definition follow this structure:
- `export type UserRow = {}`: defining the raw data returned by the `select` statement.
- `export type UserRowInsert = Partial<UserRow> & NonNullable<Pick<UserRow, 'email' | 'password'>>`: defining the allowed/needed raw data that can be inserted by an `insert` statement.
- `export type UserRowUpdate = Partial<UserRow>`: defining the allowed/needed raw data that can be updated by an `update` statement.
- `export type User = Omit<UserRow, 'role'> & { foe: Foe[] }`: defining the entity with joined data or computed attributes.
- `export type UserFormValues = Omit<UserRow, 'password'>`: defining the raw data that the entity's form should collect from the browser to insert a new row.
