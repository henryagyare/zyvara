import "./env";
import { getDb, closeDb } from "../src/server/db";
import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
async function main() {
  const db = await getDb();
  const migration = await readFile("drizzle/0001_initial.sql", "utf8");
  const mediaMigration = await readFile(
    "drizzle/0002_private_media.sql",
    "utf8",
  );
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(739182)`);
    await tx.execute(sql.raw(migration));
    await tx.execute(sql.raw(mediaMigration));
    await tx.execute(
      sql.raw(await readFile("drizzle/0003_creator_reviews.sql", "utf8")),
    );
  });
  console.log("Database migrations applied successfully.");
}
main()
  .catch(() => {
    console.error(
      "Migration failed. Check the configured database connection and permissions.",
    );
    process.exitCode = 1;
  })
  .finally(closeDb);
