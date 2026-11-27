import { Chess, SQUARES } from 'chess.js';
import type { Square } from 'chess.js';

export const parseUci = (uci: string) => ({
  from: uci.slice(0, 2) as Square,
  to: uci.slice(2, 4) as Square,
  promotion: uci[4],
});

/** apply UCI move; accepts king-takes-rook castling notation */
export function playUci(chess: Chess, uci: string) {
  const move = parseUci(uci);
  const castle: Record<string, Square> = { e1h1: 'g1', e1a1: 'c1', e8h8: 'g8', e8a8: 'c8' };
  const target = castle[uci];
  if (target && chess.get(move.from)?.type === 'k') move.to = target;
  return chess.move(move);
}

export function replay(moves: string, fen?: string): Chess {
  const chess = new Chess(fen);
  for (const m of moves.split(' ').filter(Boolean)) playUci(chess, m);
  return chess;
}

export function dests(chess: Chess) {
  const map = new Map<Square, Square[]>();
  for (const from of SQUARES) {
    const to = chess.moves({ square: from, verbose: true }).map(m => m.to);
    if (to.length) map.set(from, to);
  }
  return map;
}

export function outcome(chess: Chess): string | null {
  if (chess.isCheckmate()) return `Checkmate. ${chess.turn() === 'w' ? 'Black' : 'White'} wins`;
  if (chess.isStalemate()) return 'Draw: stalemate';
  if (chess.isInsufficientMaterial()) return 'Draw: insufficient material';
  if (chess.isThreefoldRepetition()) return 'Draw: repetition';
  if (chess.isDraw()) return 'Draw: fifty-move rule';
  return null;
}
