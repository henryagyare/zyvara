# Remaining account setup

The application and Tiger database are connected at https://zyvara.us. Private photos now use Tiger with `STORAGE_MODE=postgres`; no Firebase Storage or Blaze upgrade is needed. Firebase server credentials remain necessary for free Google sign-in.

## 1. Skip Firebase photo-storage billing

Leave the Firebase project on Spark. Do not create a billing account or provision a Firebase Storage bucket for Zyvara. Compressed private photos use the existing Tiger database, bounded to 100 MiB of decoded media; full storage rejects new uploads.

## 2. Provide the Firebase server credential

Open https://console.firebase.google.com/u/0/project/zyvara-3753d/settings/serviceaccounts/adminsdk. Either explicitly approve Codex to generate the Zyvara Firebase Admin private key, or click Generate new private key yourself and download the JSON. Keep the JSON out of GitHub and chat. If you download it, move it to the ignored workspace location `C:\Users\henry\Coding\Projects\zyvara\.data\firebase-admin.json` and tell Codex the file is ready. Codex will extract the client email/private key into ignored local settings and the already-approved encrypted production Vercel environment. This key gives the app server privileged Firebase access; it does not belong in a browser bundle.

## 3. Configure the Gemini API key

Open https://aistudio.google.com/api-keys. Create/use an API key for your Google AI project, with access to the model your teammate tested (`gemini-3.8-flash`) or another image-capable model you choose. A Gemini consumer subscription and the Firebase web API key do not replace this key.

Open the Zyvara Vercel project: https://vercel.com/henry-asantes-projects-8e465068/zyvara/settings/environment-variables. Add `GEMINI_API_KEY` with your key, Type **Secret**, Environment **Production**. Add `GEMINI_MODEL` with the exact available model ID, e.g. `gemini-3.8-flash`. Do not use a `NEXT_PUBLIC_` variable. Keep `ASSESSMENT_PROVIDER=mock` until the Firebase steps are complete. Tell Codex the key and model are saved; never paste the key into chat.

For local live testing, you can also put `GEMINI_API_KEY` and `GEMINI_MODEL` in ignored `.env.local`. Production secrets should stay separate from preview environments.

## 4. Activate and verify

Confirm that submitted sanitized photos, descriptions, and challenge requirements may be sent to Google Gemini for live assessment. Codex can then set `ASSESSMENT_PROVIDER=gemini`, redeploy, and verify the full flow. You will sign in at https://zyvara.us/signin with your Google account. Test a real challenge with your own non-sensitive photo; verify per-requirement feedback, a saved result after refresh, and exactly one 50-point award when the result is supported. An unclear or failed assessment must award zero points and preserve the evidence for revision/retry.

Tests in this repository verify integration and failure handling using a fake Gemini transport. A real Gemini call and full Firebase deployment flow remain unverified until these account steps are complete. The teammate's live model tests are not proof of this application's deployed credentials or visual accuracy.
