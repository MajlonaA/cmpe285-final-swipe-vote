# Cat Match Swipe

Cat Match Swipe is a mobile-first swipe-to-vote app for choosing adoptable cat profiles. Users swipe right or tap **Yes** for cats they would want to meet, swipe left or tap **No** for cats they would skip, and open the results view to see aggregate votes across all users.

## Run

```bash
npm run seed
npm start
```

Open `http://localhost:5173`.

The app requires Node 20 or newer and has no external npm dependencies. It uses Node's built-in HTTP server, file system APIs, and a vanilla HTML/CSS/JavaScript frontend. If port 5173 is already in use, run with another port, for example `PORT=5180 npm start`.

To add a new profile without changing code:

```bash
npm run add-item -- "Nova the Curious Cat" "Domestic Shorthair" "A gentle explorer who likes shelves and string toys." "#0f766e"
```

## Architecture

The frontend is a single mobile web page in `public/`. It fetches the deck from `GET /api/items`, records a swipe with `POST /api/vote`, removes the previous vote with `DELETE /api/vote`, and renders aggregate data from `GET /api/results`. The server also supports the brief-style aliases `GET /items`, `POST /vote`, and `GET /results`. A session id is stored in the browser only to identify the anonymous voter; vote totals are not sourced from localStorage.

The backend is `server.js`. It keeps the source of truth in `data/votes.json`, with 100 seeded cat profiles in `data/items.json`. Vote writes are serialized through an in-process queue and written atomically through a temporary file rename. Deduplication is handled by the `(sessionId, itemId)` pair: if the same user votes on the same cat again, the existing vote is updated instead of double-counted. Lightweight analytics track total swipes, anonymous sessions, and average decision time.

## Completed Requirements

- 100 distinct cat profiles seeded by `scripts/seed.js`
- Generated cat-card image URL for every profile through `/images/:id.svg`
- Swipe-card UI with left/no, right/yes, card tilt, color hint, and smooth transitions
- Tap buttons for yes and no
- Downward swipe or tab opens results
- Results view with aggregate yes/no counts for every cat profile
- Meaningful sorting: most loved, most divisive, most votes, A to Z, and my yes votes
- Real backend with persistent JSON-file storage
- Idempotent vote deduplication by anonymous session and item
- End-of-deck state
- Stretch: anonymous user identity, undo last swipe, matches view, polling-based results refresh, seed/admin scripts, and basic analytics

## Screenshots

The `screenshots/` folder contains three 390 x 844 screenshots for the exam document:

- `01-swipe.png`
- `02-results.png`
- `03-matches.png`

## Trade-offs

JSON-file persistence was chosen because it is fast to explain and run during a timed exam without installing a database. It is acceptable for this local demo because writes are serialized and atomic, but SQLite or Postgres would be better for concurrent production traffic. The generated SVG cat visuals avoid broken external image links and licensing issues, but real shelter photos would make the product feel richer if there were more time and proper image permissions.

## Known Issues

- The app is intended for local demo use on one Node process.
- The results refresh on vote, tab switch, manual refresh, and polling while results-style views are open, not through websockets.
- The generated visuals are deterministic placeholders rather than real cat photography.
