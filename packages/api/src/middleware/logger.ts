import util from "node:util";
import { createMiddleware } from "hono/factory";
import { ZodError } from "zod";
import { getTransactionId } from "#api/logger.ts";

export const logger = (pathsToIgnore: string[] = []) =>
  createMiddleware(async (c, next) => {
    if (pathsToIgnore.includes(c.req.path)) {
      return await next();
    }

    const start = Date.now();
    let caughtError: unknown = null;

    try {
      await next();
    } catch (error) {
      caughtError = error;
    }

    const end = Date.now();
    const duration = end - start;

    const ip = (c.req.header("x-forwarded-for") ?? "127.0.0.1").replace("::ffff:", "");
    const gitHash = (process.env.GIT_HASH_VERSION ?? "-").slice(0, 8);
    const trxId = getTransactionId() ?? "-";
    const userId = c.get("userId") ?? "-";

    const requestSize = c.req.header("content-length");

    const error = caughtError || c.error;
    const status = c.res.status;

    const contentLength = c.res?.headers.get("content-length") ?? "-";
    const responseSize = Number(contentLength);

    let line = util.format(
      "%s [TX=%s] [v=%s] [UID=%s] %s %s ↑%sB ↓%sB %d in %dms %s\n",
      ip,
      trxId,
      gitHash,
      userId ? userId.slice(0, 8) : "-",
      c.req.method,
      c.req.path,
      requestSize || "-",
      Number.isFinite(responseSize) ? responseSize : "-",
      status,
      duration,
      duration > 3_000 ? "[SLOW]" : "",
    );

    if (error && status !== 404) {
      let body = undefined;
      if (["POST", "PUT", "PATCH"].includes(c.req.method)) {
        try {
          body = await c.req.raw.clone().json();
        } catch {}
      }
      line += `↳ Payload: ${body ? JSON.stringify(body) : "-"}\n`;

      if (error instanceof ZodError) {
        line += `↳ Error: ${util.inspect(error.issues, { compact: true, breakLength: Infinity })}\n`;
      } else if (error instanceof Error) {
        line += `↳ Unhandled Error: ${util.inspect(error, { compact: true, breakLength: Infinity })}\n`;
      } else {
        line += `↳ Unhandled Error: ${util.inspect(error)}\n`;
      }
    }

    process.stdout.write(line);

    if (caughtError) throw caughtError;
  });
