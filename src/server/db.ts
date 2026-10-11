import { PGlite } from "@electric-sql/pglite";
import { drizzle as pgliteDrizzle } from "drizzle-orm/pglite";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { dataDir } from "./config";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
type DB = NodePgDatabase<typeof schema>;
const globalDB = globalThis as unknown as {
  zyvaraDB?: Promise<DB>;
  zyvaraPool?: Pool;
  zyvaraPglite?: PGlite;
};
export async function getDb(): Promise<DB> {
  if (!globalDB.zyvaraDB)
    globalDB.zyvaraDB = (async () => {
      if (process.env.DATABASE_URL) {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          max: Number(process.env.DATABASE_POOL_MAX || 5),
          ssl: process.env.DATABASE_SSL_CA
            ? {
                ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n"),
                rejectUnauthorized: true,
              }
            : undefined,
        });
        globalDB.zyvaraPool = pool;
        return drizzle(pool, { schema });
      }
      if (process.env.NODE_ENV === "production")
        throw new Error(
          "DATABASE_URL is required in production. Local storage is development only.",
        );
      await mkdir(dataDir(), { recursive: true });
      const client = new PGlite(path.join(dataDir(), "postgres"));
      await client.waitReady;
      globalDB.zyvaraPglite = client;
      await client.exec(
        await readFile(
          path.join(process.cwd(), "drizzle/0001_initial.sql"),
          "utf8",
        ),
      );
      await client.exec(
        await readFile(
          path.join(process.cwd(), "drizzle/0002_private_media.sql"),
          "utf8",
        ),
      );
      await client.exec(
        await readFile(
          path.join(process.cwd(), "drizzle/0003_creator_reviews.sql"),
          "utf8",
        ),
      );
      return pgliteDrizzle(client, { schema }) as unknown as DB;
    })();
  return globalDB.zyvaraDB;
}
export async function closeDb() {
  if (globalDB.zyvaraPool) await globalDB.zyvaraPool.end();
  if (globalDB.zyvaraPglite) await globalDB.zyvaraPglite.close();
  delete globalDB.zyvaraDB;
  delete globalDB.zyvaraPool;
  delete globalDB.zyvaraPglite;
}
