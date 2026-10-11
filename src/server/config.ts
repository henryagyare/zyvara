import path from "node:path";
export const dataDir = () =>
  path.resolve(process.env.LOCAL_DATA_DIR || ".data");
export const demoEnabled = () =>
  process.env.AUTH_MODE === "demo" &&
  (process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true");
export const scenarioEnabled = () =>
  process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
export function productionReady() {
  return !!(
    process.env.DATABASE_URL &&
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_STORAGE_BUCKET &&
    process.env.AUTH_MODE !== "demo" &&
    process.env.STORAGE_MODE !== "local"
  );
}
