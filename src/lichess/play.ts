import { Chess } from 'chess.js';
import { players, show } from '../board.ts';
import type { Color } from '../board.ts';
import { playUci, replay } from '../chess.ts';
import { h, message, panel, status } from '../dom.ts';
import { live } from '../live.ts';
import { saved } from '../saved.ts';
import { api, post, readLines } from './api.ts';
import { forget, login, token } from './auth.ts';

interface Player { id?: string; name?: string; title?: string; rating?: number; aiLevel?: number }
interface State {
  type: 'gameState'; moves: string; status: string; winner?: Color;
  wtime: number; btime: number; wdraw?: boolean; bdraw?: boolean;
}
interface Full { type: 'gameFull'; white: Player; black: Player; initialFen: string; state: State }
interface Account { id: string; username: string; title?: string }
interface Event {
  type: string;
  game?: { gameId: string; compat?: { board?: boolean } };
}

// connection state outlives tab switches
let me: Account | undefined;
let events: AbortController | undefined;
let stream: AbortController | undefined;
let seeking: AbortController | undefined;
let gameId = '';
let full: Full | undefined;
let state: State | undefined;
let stamp = 0;
let notice = '';
let visible = false;

const playing = () => !!state && ['created', 'started'].includes(state.status);

const name = (p: Player) => p.aiLevel
  ? `Lichess AI level ${p.aiLevel}`
  : [p.title, p.name, p.rating && `(${p.rating})`].filter(Boolean).join(' ');

const clock = (ms: number) => {
  if (ms > 24 * 3600e3) return '';
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function say(text: string) { notice = text; if (visible) status(text); }
const fail = (e: unknown) => {
  if (e instanceof Error && e.name === 'AbortError') return;
  say(message(e));
  if (!token()) disconnect();
  draw();
};

function disconnect() {
  for (const c of [events, stream, seeking]) c?.abort();
  events = stream = seeking = undefined;
  me = full = state = undefined;
  gameId = '';
  live.delete('lichess');
}

async function connect() {
  if (events) return;
  const control = (events = new AbortController());
  try {
    me = await (await api('/api/account', { signal: control.signal })).json();
    draw();
    const res = await api('/api/stream/event', { signal: control.signal });
    await readLines<Event>(res, e => {
      if (e.type !== 'gameStart' || !e.game || e.game.compat?.board === false) return;
      seeking?.abort();
      seeking = undefined;
      if (!playing()) void open(e.game.gameId);
    });
    throw new Error('Connection closed. Reopen Lichess tab');
  } catch (e) {
    if (events === control) { events = undefined; fail(e); }
  }
}

async function open(id: string) {
  stream?.abort();
  const control = (stream = new AbortController());
  gameId = id;
  full = state = undefined;
  live.add('lichess'); // blocks engine
  try {
    const res = await api(`/api/board/game/stream/${id}`, { signal: control.signal });
    await readLines<Full | State | { type: string }>(res, line => {
      if (line.type === 'gameFull') { full = line as Full; update(full.state); }
      else if (line.type === 'gameState') update(line as State);
    });
    if (playing()) throw new Error('Game connection lost. Reopen Lichess tab');
  } catch (e) {
    if (stream === control) fail(e);
  } finally {
    if (stream === control) {
      stream = undefined;
      // stay blocked if game may still be running
      if (!playing() && state) live.delete('lichess');
    }
  }
}

function update(next: State) {
  state = next;
  stamp = Date.now();
  if (!playing()) live.delete('lichess');
  const draws = next.wdraw || next.bdraw;
  const end = next.winner ? `${next.winner} wins (${next.status})` : `Game over: ${next.status}`;
  say(playing() ? (draws ? 'Draw offered' : 'Game in progress') : end);
  draw();
}

function board() {
  if (!full || !state) {
    show({ chess: new Chess() });
    players('Opponent', me?.username ?? 'You');
    return;
  }
  const color: Color = full.white.id === me?.id ? 'white' : 'black';
  let chess: Chess;
  try {
    chess = replay(state.moves, full.initialFen === 'startpos' ? undefined : full.initialFen);
  } catch {
    return say('Variant not supported, finish this game on lichess.org');
  }
  if (!playing()) saved.pgn = chess.pgn();
  show({
    chess,
    orientation: color,
    movable: playing() ? color : undefined,
    onMove: uci => {
      const preview = replay(state!.moves, full!.initialFen === 'startpos' ? undefined : full!.initialFen);
      playUci(preview, uci);
      show({ chess: preview, orientation: color });
      post(`/api/board/game/${gameId}/move/${uci}`).catch(e => { board(); fail(e); });
    },
  });
  clocks();
}

function clocks() {
  if (!full || !state) return;
  const white = full.white.id === me?.id;
  const moves = state.moves.split(' ').filter(Boolean).length;
  const turn = moves % 2 === 0 ? 'w' : 'b'; // standard start
  const ticking = state.status === 'started' && moves >= 2;
  const left = (c: 'w' | 'b') =>
    clock((c === 'w' ? state!.wtime : state!.btime) - (ticking && turn === c ? Date.now() - stamp : 0));
  const top = white ? full.black : full.white;
  const bottom = white ? full.white : full.black;
  players(name(top), name(bottom), left(white ? 'b' : 'w'), left(white ? 'w' : 'b'));
}

function draw() {
  if (!visible) return;
  status(notice);
  board();
  if (!token()) {
    return panel(
      h('button', { onclick: () => login().catch(fail) }, 'Log in with Lichess'),
      h('p', { className: 'note' }, 'Verified titles show next to names.'));
  }
  const button = (text: string, onclick: () => void, disabled = false) =>
    h('button', { onclick, disabled }, text);
  const busy = !me || playing() || !!seeking;
  const friend = h('input', { placeholder: 'Lichess username' });

  panel(
    h('p', {}, me ? `Logged in: ${[me.title, me.username].filter(Boolean).join(' ')}` : 'Connecting...'),
    h('div', { className: 'row' },
      seeking
        ? button('Cancel search', () => { seeking?.abort(); seeking = undefined; say('Search cancelled'); draw(); })
        : button('Find opponent 10+0', seek, busy),
      button('Play AI', () => {
        say('Starting...');
        post('/api/challenge/ai', { level: '3', 'clock.limit': '600', 'clock.increment': '0' }).catch(fail);
      }, busy)),
    h('label', {}, 'Challenge friend (10+0, casual)', friend),
    button('Send challenge', () => {
      const user = friend.value.trim();
      if (!user) return;
      post(`/api/challenge/${encodeURIComponent(user)}`,
        { rated: 'false', 'clock.limit': '600', 'clock.increment': '0' })
        .then(() => say('Challenge sent'), fail);
    }, busy),
    h('div', { className: 'row' },
      button('Resign', () => {
        if (confirm('Resign game?')) post(`/api/board/game/${gameId}/resign`).catch(fail);
      }, !playing()),
      button('Abort', () => void post(`/api/board/game/${gameId}/abort`).catch(fail), !playing()),
      button('Offer / accept draw', () => void post(`/api/board/game/${gameId}/draw/yes`).catch(fail), !playing()),
      button('Log out', () => {
        api('/api/token', { method: 'DELETE' }).catch(() => {});
        // headers are read synchronously above, safe to forget now
        forget(); disconnect(); say('Logged out'); draw();
      }, playing())),
    h('p', { className: 'note' }, 'Bot and Analysis locked during live games.'),
  );
}

function seek() {
  const control = (seeking = new AbortController());
  say('Searching...');
  draw();
  post('/api/board/seek', { rated: 'false', time: '10', increment: '0' }, control.signal)
    .then(res => readLines(res, () => {}))
    .then(() => { if (seeking === control) { seeking = undefined; draw(); } })
    .catch(e => { if (seeking === control) { seeking = undefined; fail(e); } });
}

/** reconnect saved login at startup so ongoing games lock engine */
export function resume() {
  if (token()) void connect();
}

export function lichess(): () => void {
  visible = true;
  draw();
  if (token()) {
    void connect();
    if (gameId && !stream && (!state || playing())) void open(gameId);
  }
  const timer = setInterval(clocks, 250);
  return () => { visible = false; clearInterval(timer); };
}
