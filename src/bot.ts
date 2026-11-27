import { Chess } from 'chess.js';
import { players, show } from './board.ts';
import type { Color } from './board.ts';
import { outcome, playUci } from './chess.ts';
import { h, message, panel, status } from './dom.ts';
import { Engine } from './engine.ts';
import { saved } from './saved.ts';

const game = { chess: new Chess(), color: 'white' as Color, level: 5 };

export function bot(): () => void {
  const engine = new Engine();
  let alive = true;
  let round = 0;

  const render = () => {
    const { chess, color } = game;
    const mine = chess.turn() === color[0];
    const over = outcome(chess);
    show({
      chess,
      orientation: color,
      movable: color,
      onMove: uci => { playUci(chess, uci); saved.pgn = chess.pgn(); render(); void reply(); },
    });
    players(`Stockfish, level ${game.level}`, 'You');
    status(over ?? (mine ? 'Your move' : 'Bot thinking...'));
  };

  async function reply() {
    const { chess, level } = game;
    const mine = ++round;
    if (chess.isGameOver() || chess.turn() === game.color[0]) return;
    try {
      const { best } = await engine.search(chess.fen(), {
        skill: level,
        depth: 1 + Math.round(level * 0.6),
      });
      await new Promise(r => setTimeout(r, 250));
      if (!alive || mine !== round) return;
      playUci(chess, best);
      saved.pgn = chess.pgn();
      render();
    } catch (e) {
      if (alive) status(message(e));
    }
  }

  const color = h('select', {}, h('option', { value: 'white' }, 'White'), h('option', { value: 'black' }, 'Black'));
  color.value = game.color;
  const shown = h('span', {}, `Level ${game.level}`);
  const level = h('input', { type: 'range', min: '0', max: '20', value: String(game.level) });
  level.oninput = () => { shown.textContent = `Level ${level.value}`; };

  const start = h('button', { onclick: () => {
    game.chess = new Chess();
    game.color = color.value as Color;
    game.level = Number(level.value);
    render();
    void reply();
  } }, 'New game');

  const undo = h('button', { onclick: () => {
    const { chess } = game;
    if (!chess.history().length) return;
    round++;
    chess.undo();
    if (chess.turn() !== game.color[0]) chess.undo();
    render();
    void reply();
  } }, 'Take back');

  panel(
    h('label', {}, 'Play as', color),
    h('label', {}, shown, level),
    h('div', { className: 'row' }, start, undo),
    h('p', { className: 'note' }, 'Color and level apply on new game.'),
  );
  render();
  void reply();
  return () => { alive = false; engine.stop(); };
}
