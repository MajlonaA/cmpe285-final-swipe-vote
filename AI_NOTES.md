# AI Usage Notes

I used OpenAI Codex as the primary AI coding assistant for this final question rather than Claude. Codex generated the working vanilla frontend, the Node backend, the seed script for 100 cat profiles, the CATAAS-backed real photo fixture, and the README structure. I asked it to avoid localStorage as the source of truth and to keep the app runnable without dependency installation.

The most important architectural choice was to use a small Node HTTP server with JSON-file persistence. That was a deliberate time-boxed choice: it is easy to run and explain, while still satisfying the real-backend requirement. The dedup strategy is `(sessionId, itemId)`, so a repeat vote by the same anonymous user updates the existing vote instead of increasing the aggregate count twice.

One place I had to be careful with AI output was persistence. A simple generated implementation can accidentally read and write the votes file in a way that loses concurrent writes. The final version serializes write operations and writes through a temporary file rename, which is safer for this local demo. I also pushed back on the API surface by adding `/items`, `/vote`, and `/results` aliases in addition to `/api/...`, because the assignment names those endpoints explicitly and graders may try them directly.

Codex did better than expected at creating a complete vertical slice: seed data, API, swipe interaction, results, real image attribution, and README all stayed consistent. It did worse at knowing my exact visual preference without direction, so I reviewed the UI and kept it focused on a clean mobile cat-matching experience rather than a generic template.

I verified the app by running the local server, checking the API endpoints, confirming repeat votes from one session do not double-count, and reviewing the mobile viewport. For the demo, I should be ready to explain the endpoint design, vote deduplication, persistence choice, real cat photo source credits, gesture logic, and why JSON-file storage is acceptable for a local timed assessment but not a production voting system.
