import { h, message, page } from './dom.ts';
import { token } from './lichess/auth.ts';
import { live } from './live.ts';
import { card, FILTERS } from './tournaments.ts';

export function home(go: (tab: string) => void): () => void {
  let alive = true;
  const tile = (tab: string, title: string, text: string) => {
    const note = h('span', { className: 'note' }, text);
    const button = h('button', { className: 'choice', onclick: () => go(tab) }, h('strong', {}, title), note);
    return { button, note };
  };
  const bot = tile('bot', 'Play bot', 'Stockfish, 21 levels');
  const analysis = tile('analysis', 'Analysis', 'Find mistakes in any game');
  const lichess = tile('lichess', 'Lichess', token() ? 'Continue with your account' : 'Log in, play real opponents');
  const events = tile('tournaments', 'Tournaments', 'FIDE and top events');
  const themes = tile('themes', 'Themes', 'Boards, pieces, sound');

  const featured = h('div', { className: 'cards' }, h('p', { className: 'note' }, 'Loading...'));

  page(
    h('div', { className: 'hero' },
      h('h2', {}, 'Chess in your browser'),
      h('p', { className: 'note' }, 'Free play, analysis and tournament games.')),
    h('div', { className: 'choices' },
      ...[bot, analysis, lichess, events, themes].map(t => t.button)),
    h('h2', {}, 'Happening now'),
    featured,
  );

  bot.button.disabled = analysis.button.disabled = live.any;

  FILTERS.live.load().then(
    list => {
      if (!alive) return;
      featured.replaceChildren(...(list.length ? list.slice(0, 3).map(card) : [h('p', { className: 'note' }, 'No live events listed')]));
    },
    e => { if (alive) featured.replaceChildren(h('p', { className: 'note' }, `Could not load: ${message(e)}`)); });

  return () => { alive = false; };
}
