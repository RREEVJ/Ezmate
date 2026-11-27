import { Chess } from 'chess.js';
import { players, show } from './board.ts';
import { outcome, parseUci } from './chess.ts';
import { h, message, panel, status } from './dom.ts';
import { Engine } from './engine.ts';
import type { Result } from './engine.ts';
import { saved } from './saved.ts';

const DEPTH = 12;

/** white's winning chance 0-100 from engine score */
function chance(r: Result, whiteToMove: boolean) {
  const side = r.mate !== undefined
    ? (r.mate > 0 ? 100 : 0)
    : 100 / (1 + Math.exp(-0.00368208 * (r.cp ?? 0)));
  return whiteToMove ? side : 100 - side;
}

const label = (loss: number) => (loss >= 30 ? '??' : loss >= 20 ? '?' : loss >= 10 ? '?!' : '');

function text(r: Result, whiteToMove: boolean) {
  const sign = whiteToMove ? 1 : -1;
  if (r.mate !== undefined) return `${r.mate * sign > 0 ? 'White' : 'Black'} mates in ${Math.abs(r.mate)}`;
  const v = ((r.cp ?? 0) * sign) / 100;
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}`;
}

export function analysis(): () => void {
  let engine = new Engine();
  let run = 0;
  const input = h('textarea', { placeholder: 'Paste PGN', value: saved.pgn });
  const list = h('div', { className: 'moves' });
  const info = h('p', { className: 'note' }, '?! inaccuracy, ? mistake, ?? blunder');
  let step = (_delta: number) => {};

  async function analyze() {
    engine.stop();
    engine = new Engine();
    const mine = ++run;
    const game = new Chess();
    try { game.loadPgn(input.value); } catch (e) { return status(`Bad PGN: ${message(e)}`); }
    const moves = game.history({ verbose: true });
    if (!moves.length) return status('No moves in PGN');

    const fens = [moves[0].before, ...moves.map(m => m.after)];
    const results: Result[] = [];
    const buttons = moves.map((m, i) => h('button', { onclick: () => go(i + 1) }, m.san));
    let at = 0;

    list.replaceChildren(...moves.flatMap((m, i) => {
      const number = h('span', {}, `${m.before.split(' ')[5]}.`);
      if (m.color === 'w') return [number, buttons[i]];
      return i === 0 ? [number, h('span', {}, '...'), buttons[i]] : [buttons[i]];
    }));

    function go(n: number) {
      at = Math.max(0, Math.min(moves.length, n));
      const chess = new Chess(fens[0]);
      for (const m of moves.slice(0, at)) chess.move(m.san);
      show({ chess });
      buttons.forEach((b, i) => b.classList.toggle('active', i === at - 1));
      const r = results[at];
      const over = outcome(chess);
      if (over) info.textContent = over;
      else if (!r) info.textContent = 'Not analyzed yet';
      else {
        const best = parseUci(r.best);
        const san = new Chess(fens[at]).move(best).san;
        info.textContent = `Eval ${text(r, chess.turn() === 'w')}. Best: ${san}`;
      }
    }
    step = d => go(at + d);
    go(0);
    players('Black', 'White');

    try {
      for (let i = 0; i < fens.length; i++) {
        const pos = new Chess(fens[i]);
        if (pos.isCheckmate()) results[i] = { best: '', mate: 0 };
        else if (pos.isGameOver()) results[i] = { best: '', cp: 0 };
        else results[i] = await engine.search(fens[i], { depth: DEPTH });
        if (mine !== run) return;
        status(`Analyzing ${i + 1}/${fens.length}`);
        if (i > 0) {
          const m = moves[i - 1];
          const white = m.color === 'w';
          const before = chance(results[i - 1], white);
          const after = chance(results[i], !white);
          const loss = white ? before - after : after - before;
          const played = m.from + m.to + (m.promotion ?? '');
          if (played !== results[i - 1].best) buttons[i - 1].textContent = m.san + label(loss);
        }
        if (i === at) go(at);
      }
      status('Analysis done');
    } catch (e) {
      if (mine === run) status(message(e));
    }
  }

  panel(
    h('label', {}, 'Game', input),
    h('div', { className: 'row' },
      h('button', { onclick: () => void analyze() }, 'Analyze'),
      h('button', { onclick: () => step(-1), ariaLabel: 'Previous move' }, 'Prev'),
      h('button', { onclick: () => step(1), ariaLabel: 'Next move' }, 'Next')),
    info,
    list,
  );
  show({ chess: new Chess() });
  players('Black', 'White');
  status('Paste game, press Analyze');
  return () => { run++; engine.stop(); };
}
