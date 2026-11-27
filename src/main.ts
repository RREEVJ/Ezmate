import './style.css';
import { analysis } from './analysis.ts';
import { bot } from './bot.ts';
import { $, message, status } from './dom.ts';
import { home } from './home.ts';
import { finishLogin } from './lichess/auth.ts';
import { lichess, resume } from './lichess/play.ts';
import { live } from './live.ts';
import { applyTheme } from './pieces.ts';
import { settings } from './settings.ts';
import { tournaments } from './tournaments.ts';

const tabs = {
  home: () => home(name => open(name as Tab)),
  bot, analysis, lichess, tournaments,
  themes: settings,
};
type Tab = keyof typeof tabs;
const engineTabs: Tab[] = ['bot', 'analysis'];
const pageTabs: Tab[] = ['home', 'tournaments', 'themes'];
const buttons = [...document.querySelectorAll<HTMLButtonElement>('#tabs button')];

let current: Tab | undefined;
let cleanup = () => {};

/** grey out engine tabs during live games */
function blocked(tab: Tab) {
  if (engineTabs.includes(tab)) return live.any ? 'Locked during live game' : '';
  return '';
}

function open(tab: Tab) {
  if (blocked(tab)) return;
  cleanup();
  current = tab;
  buttons.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const isPage = pageTabs.includes(tab);
  $('#game').hidden = isPage;
  $('#page').hidden = !isPage;
  $('#page').replaceChildren();
  cleanup = tabs[tab]();
  scrollTo(0, 0);
}

function refresh() {
  for (const b of buttons) {
    const why = blocked(b.dataset.tab as Tab);
    b.disabled = !!why;
    b.title = why;
  }
}

live.watch(() => {
  refresh();
  // defer: caller may be mid-render
  if (live.any && current && (engineTabs.includes(current) || current === 'home'))
    queueMicrotask(() => open('lichess'));
});

for (const b of buttons) b.onclick = () => open(b.dataset.tab as Tab);
$('#logo').onclick = () => open('home');

void applyTheme();

finishLogin().then(
  returned => {
    if (returned) return open('lichess');
    open('home');
    resume();
  },
  e => { open('lichess'); status(message(e)); },
);
