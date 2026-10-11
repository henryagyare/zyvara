import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
const contents = [
  "AUTH_MODE=demo",
  "STORAGE_MODE=local",
  "DEMO_ACCESS_CODE=local-zyvara-demo",
  `SESSION_SECRET=${randomBytes(48).toString("hex")}`,
  "ASSESSMENT_PROVIDER=mock",
  "MOCK_SCENARIO=needs_more_evidence",
  "APP_ORIGIN=http://127.0.0.1:3000",
  "",
].join("\n");
writeFile(".env.local", contents, { flag: "wx" })
  .then(() =>
    console.log(
      "Local demo configured. Access code: local-zyvara-demo. Existing environment files are never overwritten.",
    ),
  )
  .catch(() => {
    console.error(
      ".env.local already exists or is unavailable. Preserve existing service settings and configure demo values manually if needed.",
    );
    process.exitCode = 1;
  });
