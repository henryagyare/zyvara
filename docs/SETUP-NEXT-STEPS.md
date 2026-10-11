# Live setup verified

Zyvara is live at https://zyvara.us. No additional account setup is required for the current prototype.

- Google sign-in and the authenticated server session were verified.
- Firebase remains on Spark; Firebase Storage and Blaze billing are not required.
- Private sanitized photos use Tiger PostgreSQL with a 100 MiB decoded-media quota.
- Replacement Firebase Admin credentials are stored as Production Secrets in Vercel. The user confirmed revocation of the exposed original key in Google Cloud.
- Gemini is enabled using the user's production API key and gemini-3.8-flash model. A deployed private blank-image connectivity test returned per-requirement feedback, a not-supported result, and zero points. The saved result survived refresh.

The private test contribution is labeled PRIVATE CONNECTIVITY TEST in the user's journal. It can be revised with real planting evidence or deleted through the app.

To use the app, sign in, choose a challenge, and submit your own non-sensitive result photo and description. Community sharing starts off. A supported assessment earns one 50-point award per challenge; unsupported or failed assessments award zero.

The live blank-image test verifies connectivity and persistence, not assessment accuracy for all real activities. The supported reward path, retries, concurrency, and private-media permissions are covered by automated tests. Before a public pilot, address the operational follow-ups in VERIFICATION.md.
