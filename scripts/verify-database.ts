import "./env";
import { getDb, closeDb } from "../src/server/db";
import { sql } from "drizzle-orm";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const db = await getDb();
  await db.execute(sql`SELECT 1`);
  const tables = await db.execute(
    sql`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('users','challenges','contributions','uploads','evidence_versions','assessment_jobs','assessments','rewards')`,
  );
  if (tables.rows.length !== 8) throw new Error("Migrations missing");
  console.log(
    "PostgreSQL connection verified; all eight core tables exist. No credential values were printed.",
  );
}
main()
  .catch(() => {
    console.error(
      "Database verification failed. Check DATABASE_URL, TLS, and migrations.",
    );
    process.exitCode = 1;
  })
  .finally(closeDb);
