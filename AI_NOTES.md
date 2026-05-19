# AI Usage Notes

I used OpenAI Codex as the primary AI coding assistant for this final question alongside Claude. Codex generated the working vanilla frontend, the Node backend, the seed script for 100 cat profiles, the CATAAS-backed real photo fixture with cached local image files, and the README structure. I asked it to avoid localStorage as the source of truth and to keep the app runnable without dependency installation.

The most important architectural choice was to use a small Node HTTP server with JSON-file persistence. That was an intentional time-boxed choice because it is easy to run and explain, while still satisfying the real-backend requirement. The dedup strategy is `(sessionId, itemId)`, so a repeat vote by the same anonymous user updates the existing vote instead of increasing the aggregate count twice.

One place I had to revisit and change was images: the first version depended on generated or remote image output that was not reliable enough for a demo, so I switched to cached real cat photos with source credits. I also hardened persistence because a simple generated implementation could accidentally read and write the votes file in a way that loses concurrent writes. The final version serializes write operations and writes through a temporary file rename, which is safer. I also pushed back on the API surface by adding `/items`, `/vote`, and `/results` aliases in addition to `/api/...`.

Codex did better than expected at creating a complete vertical slice: seed data, API, swipe interaction, results, stretch-goal support, real image attribution, cached images, and README all stayed consistent. It did worse at knowing my exact visual preference without direction, so I reviewed the UI and kept it focused on a clean mobile cat-matching experience rather than a generic template. I also had to test multiple times to ensure it meets all the requirements.

I verified the app by running the local server, checking the API endpoints, confirming repeat votes from one session do not double-count, and reviewing the mobile viewport. 
