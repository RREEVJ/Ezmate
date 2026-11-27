import { Chessground } from '@lichess-org/chessground';
import '@lichess-org/chessground/assets/chessground.base.css';
import type { Chess, Square } from 'chess.js';
import { dests } from './chess.ts';
import { $ } from './dom.ts';
import { sound } from './sound.ts';

export type Color = 'white' | 'black';

let onMove: ((uci: string) => void) | undefined;
let current: Chess | undefined;
let redraw: () => void = () => {};
let heard = '';

const ground = Chessground($('#board'), {
  movable: { free: false, color: undefined },
  premovable: { enabled: false },
  animation: { duration: 200 },
});
ground.set({ movable: { events: { after: (from, to) => void moved(from as Square, to as Square) } } });

function askPromotion(): Promise<string> {
  const dialog = $<HTMLDialogElement>('#promotion');
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve =>
    dialog.addEventListener('close', () => resolve(dialog.returnValue), { once: true }));
}

async function moved(from: Square, to: Square) {
  const chess = current!;
  const handler = onMove;
  const promotes = chess.moves({ square: from, verbose: true }).some(m => m.to === to && m.promotion);
  let promotion = '';
  if (promotes) {
    promotion = await askPromotion();
    if (current !== chess) return; // position changed while choosing
    if (!promotion) return redraw();
  }
  handler?.(from + to + promotion);
}

export interface View {
  chess: Chess;
  orientation?: Color;
  /** side the user may move; omit for read-only */
  movable?: Color;
  onMove?: (uci: string) => void;
}

export function show(view: View) {
  const { chess } = view;
  current = chess;
  onMove = view.onMove;
  redraw = () => show(view);
  const last = chess.history({ verbose: true }).at(-1);
  const turn: Color = chess.turn() === 'w' ? 'white' : 'black';
  const color = chess.isGameOver() ? undefined : view.movable;
  const line = chess.history();
  const key = line.join(' ');
  // sound only when exactly one move was added to line on screen
  if (line.length && line.slice(0, -1).join(' ') === heard) sound.play(!!last?.captured);
  heard = key;
  $('#line').textContent = line
    .map((san, i) => (i % 2 ? san : `${i / 2 + 1}. ${san}`)).join(' ');
  ground.set({
    fen: chess.fen(),
    orientation: view.orientation ?? 'white',
    turnColor: turn,
    check: chess.inCheck() ? turn : false,
    lastMove: last ? [last.from, last.to] : undefined,
    movable: { color, dests: color === turn ? dests(chess) : new Map() },
  });
}

export function players(top: string, bottom: string, topClock = '', bottomClock = '') {
  for (const [id, name, clock] of [['#top', top, topClock], ['#bottom', bottom, bottomClock]]) {
    const a = document.createElement('span');
    const b = document.createElement('span');
    a.textContent = name;
    b.textContent = clock;
    b.className = 'clock';
    $(id).replaceChildren(a, b);
  }
}
