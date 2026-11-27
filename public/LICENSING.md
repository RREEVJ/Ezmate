# EzMate licensing

Multiple licenses. Each part keeps its own.

| Part | License |
|---|---|
| EzMate's own code and config | MIT (`LICENSE`) |
| chessground (board) | GPL-3.0-or-later |
| Stockfish.js (engine, `stockfish/`) | GPL-3.0 |
| chess.js | BSD-2-Clause |
| Board images, piece sets | Per file, see `CREDITS.md`. Includes AGPL, GPL, CC BY-NC-SA, others |

## What this means

- MIT covers only EzMate's own files; reuse them under MIT
- Built app bundles chessground, so distribute app as a whole under GPL-compatible terms (GPL-3.0-or-later) and provide source
- AGPL themes carry AGPL terms, including source offer to network users
- CC BY-NC-SA themes: non-commercial only, credit authors, share alike
- Keep third-party notices when copying

License texts: `LICENSES/` in source, package folders in `node_modules/`.
