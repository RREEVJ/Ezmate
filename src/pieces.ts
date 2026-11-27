import { BOARDS, PIECES } from './themes.gen.ts';

const TYPES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as const;
const COLORS = { w: 'white', b: 'black' } as const;
const base = import.meta.env.BASE_URL;

export function load(key: string, fallback = ''): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

export function store(key: string, value: string): boolean {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
    return true;
  } catch { return false; }
}

// in-memory copy keeps choices working when storage is blocked
export const choice = {
  pieces: load('pieceSet', 'staunty'),
  board: load('boardTheme'),
  template: load('pieceTemplate'),
};

const pieceSet = (name: string) =>
  PIECES.find(s => s.name === name) ?? PIECES.find(s => s.name === 'staunty')!;

export function pieceUrl(name: string, c: string, p: string) {
  const set = pieceSet(name);
  return `${base}pieces/${set.name}/${set.mono ? '' : c}${p.toUpperCase()}.${set.ext}`;
}

export const boardUrl = (file: string) => `${base}boards/${file}`;

function fill(template: string, c: string, p: string) {
  return template.replaceAll('{c}', c).replaceAll('{p}', p).replaceAll('{P}', p.toUpperCase());
}

const loads = (url: string) => new Promise<boolean>(resolve => {
  const img = new Image();
  img.onload = () => resolve(true);
  img.onerror = () => resolve(false);
  img.src = url;
});

const style = document.head.appendChild(document.createElement('style'));
let version = 0;

/** returns number of custom images that failed and fell back to chosen set */
export async function applyTheme(): Promise<number> {
  const mine = ++version;
  const { template } = choice;
  const set = pieceSet(choice.pieces);
  let failed = 0;
  const rules = await Promise.all(
    Object.entries(COLORS).flatMap(([c, color]) =>
      Object.entries(TYPES).map(async ([p, type]) => {
        let url = pieceUrl(set.name, c, p);
        // single-color sets are tinted per side
        let filter = set.mono ? `brightness(${c === 'w' ? 1.8 : 0.35})` : 'none';
        if (template) {
          const theirs = fill(template, c, p);
          if (await loads(theirs)) { url = theirs; filter = 'none'; }
          else failed++;
        }
        return `.cg-wrap piece.${type}.${color}{background-image:url(${JSON.stringify(url)});filter:${filter}}`;
      })),
  );
  const board = BOARDS.find(b => b.name === choice.board);
  if (board) {
    rules.push(`#board.cg-wrap cg-board{background:url(${JSON.stringify(boardUrl(board.file))}) center/100% 100%}`);
  }
  if (mine === version) style.textContent = rules.join('\n');
  return failed;
}

export function setPieces(name: string) {
  choice.pieces = name;
  choice.template = '';
  store('pieceTemplate', '');
  store('pieceSet', name);
  return applyTheme();
}

/** empty name restores built-in board */
export function setBoard(name: string) {
  choice.board = name;
  store('boardTheme', name);
  return applyTheme();
}

export function setTemplate(value: string): Promise<number> {
  const t = value.trim();
  if (t && !(t.startsWith('https://') && t.includes('{c}') && /\{p\}/i.test(t)))
    return Promise.reject(new Error('Use https:// link containing {c} and {P} or {p}'));
  choice.template = t;
  store('pieceTemplate', t);
  return applyTheme();
}
