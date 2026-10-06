/**
 * Make sure a local `.env` exists before anything needs it.
 *
 * `.env` is git-ignored (it holds credentials), so a fresh clone has only
 * `.env.example`. Prisma reads the datasource URL from `DATABASE_URL` at
 * generate/push time and aborts with P1012 when the file is missing, which made
 * `npm run setup` fail on a clean checkout.
 *
 * This copies the example to `.env` only when `.env` is absent; an existing file
 * is never touched, so local edits survive.
 */
const { existsSync, copyFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const target = join(root, ".env");
const template = join(root, ".env.example");

if (existsSync(target)) {
  process.exit(0);
}

if (!existsSync(template)) {
  console.error("ensure-env: neither .env nor .env.example was found - cannot continue.");
  process.exit(1);
}

copyFileSync(template, target);
console.log("ensure-env: created .env from .env.example (edit it to set your own values).");
