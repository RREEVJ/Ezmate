# EzMate

Vite + TypeScript chess client.

- Home page
- Tournaments: Lichess broadcasts, FIDE event search
- Themes: Lichess boards and piece sets
- Bot: Stockfish 19 lite in browser
- Analysis: paste PGN, move marks, best moves
- Lichess: login, verified titles, matchmaking, AI, friend challenge, clocks
- Custom piece link, move sounds

## Run

```sh
bun install
bun run dev
```

Open http://localhost:5173. `bun run build` outputs `dist/`.

## Lichess

No setup. Open Lichess tab, log in.

## Limits

- Lichess: standard chess only; incoming challenges accepted on lichess.org
- Engine lock covers live games in this app only

## Themes

Refresh from a lila checkout: `python3 scripts/import-themes.py path/to/lila`

Skipped (no license or unclear redistribution): alpha, chess7, companion, leipzig, reillycraig, riohacha, shahi-ivory-brown.

## Licenses

Own code: MIT. Dependencies and themes keep own licenses; built app as whole is not MIT-only. See [public/LICENSING.md](public/LICENSING.md).
