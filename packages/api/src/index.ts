import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import { trimTrailingSlash } from "hono/trailing-slash";
import { logger } from "#api/middleware/logger.ts";
import { transaction } from "#api/middleware/transaction.ts";

export const app = new Hono();
app.use(prettyJSON({ space: 2 }));
app.use(trimTrailingSlash());
app.use("*", transaction());
app.use("*", logger());

app.onError((error, c) => {
  c.error = error;
  return c.text("Internal Server Error", 500);
});

// curl localhost:8080/healthcheck
app.get("/healthcheck", (ctx) => {
  const result = true;
  return ctx.json(result);
});

// curl localhost:8080/ping
app.get("/ping", async (ctx) => ctx.json(true));

// curl localhost:8080/ping -H "Content-Type: application/json" -d '{"hello": "world"}'
app.post("/ping", async (ctx) => {
  const body = await ctx.req.json();
  return ctx.json(body);
});

// curl localhost:8080/throw -H "Content-Type: application/json" -d '{"hello": "world"}'
app.post("/throw", async () => {
  throw new Error("Ops!");
});

const is_main = import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (is_main) serve({ fetch: app.fetch, port: 8080 }, () => console.log("Listening on 8080"));
