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
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.AUTH_MODE === "firebase" &&
    (process.env.STORAGE_MODE === "postgres" ||
      (process.env.STORAGE_MODE === "firebase" &&
        !!process.env.FIREBASE_STORAGE_BUCKET)) &&
    (process.env.ASSESSMENT_PROVIDER !== "gemini" ||
      (!!process.env.GEMINI_API_KEY?.trim() &&
        !!process.env.GEMINI_MODEL?.trim()))
  );
}
