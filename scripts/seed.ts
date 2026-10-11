import "./env";
import { seed } from "../src/server/seed";
import { closeDb } from "../src/server/db";
seed()
  .then(() => console.log("Four editorial challenges seeded idempotently."))
  .catch(() => {
    console.error(
      "Seed failed. Apply migrations and check database configuration.",
    );
    process.exitCode = 1;
  })
  .finally(closeDb);
