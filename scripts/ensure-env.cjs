/**
 * Prepare the local environment before Prisma runs.
 *
 * Two things a fresh clone gets wrong on its own:
 *
 * 1. `.env` is git-ignored (it holds credentials), so a clean checkout has only
 *    `.env.example`. Prisma reads the datasource URL from `DATABASE_URL` and
 *    aborts with P1012 when the file is missing. We copy the example across,
 *    but never overwrite an existing `.env`, so local edits survive.
 *
 * 2. On some Windows setups the Prisma schema engine fails with a bare
 *    "Schema engine error" when it has to *create* the SQLite file itself, yet
 *    succeeds when the file already exists. Touching an empty file first makes
 *    `prisma db push` behave the same everywhere; an existing database is left
 *    completely untouched.
 */
const { existsSync, copyFileSync, writeFileSync, mkdirSync } = require("node:fs");
const { dirname, isAbsolute, join, resolve } = require("node:path");

const root = process.cwd();

// --- 1. .env -------------------------------------------------------------
const envPath = join(root, ".env");
const envTemplate = join(root, ".env.example");

if (!existsSync(envPath)) {
  if (!existsSync(envTemplate)) {
    console.error("ensure-env: neither .env nor .env.example was found.");
    process.exit(1);
  }
  copyFileSync(envTemplate, envPath);
  console.log("ensure-env: created .env from .env.example (edit it to set your own values).");
}

// --- 2. SQLite file ------------------------------------------------------
const schemaPath = join(root, "prisma", "schema.prisma");
let url = process.env.DATABASE_URL;

if (!url && existsSync(envPath)) {
  // Read DATABASE_URL straight from .env without pulling in a dependency.
  const line = require("node:fs")
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => /^\s*DATABASE_URL\s*=/.test(entry));
  if (line) {
    url = line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  }
}

if (url && url.startsWith("file:")) {
  const raw = url.slice("file:".length);
  // A relative sqlite path is resolved against the schema's own directory.
  const dbPath = isAbsolute(raw) ? raw : resolve(dirname(schemaPath), raw);
  if (!existsSync(dbPath)) {
    mkdirSync(dirname(dbPath), { recursive: true });
    // Zero bytes is a valid, empty SQLite database to Prisma; it will create
    // the tables it needs on the next `db push`.
    writeFileSync(dbPath, "");
    console.log(`ensure-env: created empty SQLite file at ${dbPath}`);
  }
}
