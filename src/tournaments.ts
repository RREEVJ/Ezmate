import { h, message, page } from './dom.ts';
import { HOST } from './lichess/auth.ts';

export interface Event {
  tour: {
    name: string; url: string; dates?: number[];
    info?: { location?: string; format?: string; tc?: string; website?: string };
  };
  round?: { name: string; url: string; ongoing?: boolean; startsAt?: number; finishedAt?: number; finished?: boolean };
}
interface Top { active: Event[]; past: { currentPageResults: Event[] } }
interface Page { currentPageResults: Event[] }

// public endpoints, no token needed; cached to stay within rate limits
const cache = new Map<string, { at: number; data: Promise<unknown> }>();

function get<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < 60_000) return hit.data as Promise<T>;
  const data = fetch(HOST + path, { signal: AbortSignal.timeout(10_000) }).then(res => {
    if (!res.ok) throw new Error(res.status === 429 ? 'Rate limited, wait one minute' : `Lichess ${res.status}`);
    return res.json();
  });
  data.catch(() => cache.delete(path));
  cache.set(path, { at: Date.now(), data });
  return data;
}

export const FILTERS = {
  fide: { label: 'FIDE events', load: async () => (await get<Page>('/api/broadcast/search?q=FIDE')).currentPageResults },
  live: { label: 'Top now', load: async () => (await get<Top>('/api/broadcast/top')).active },
  past: { label: 'Top recent', load: async () => (await get<Top>('/api/broadcast/top')).past.currentPageResults },
};

const day = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** only follow http(s) links from remote data */
function link(url: string, text: string) {
  return /^https?:\/\//.test(url)
    ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, text)
    : h('span', {}, text);
}

export function card({ tour, round }: Event) {
  const dates = (tour.dates ?? []).map(day);
  const over = !!(round?.finishedAt || round?.finished);
  const badge = round?.ongoing ? 'Live' : over ? 'Finished' : round?.startsAt && round.startsAt > Date.now() ? 'Upcoming' : '';
  const details = [[...new Set(dates)].join(' to '), tour.info?.location, tour.info?.format, tour.info?.tc]
    .filter(Boolean).join(' · ');
  return h('article', {},
    h('h3', {}, link(tour.url, tour.name)),
    h('p', { className: 'note' }, details),
    h('p', {},
      ...(badge ? [h('span', { className: `badge ${badge.toLowerCase()}` }, badge), ' '] : []),
      ...(round ? [link(round.url, `${round.name}: view games`)] : [])),
  );
}

export function tournaments(): () => void {
  let alive = true;
  let request = 0;
  const list = h('div', { className: 'cards' });
  const note = h('p', { className: 'note', role: 'status' });
  const buttons = Object.entries(FILTERS).map(([key, f]) =>
    h('button', { onclick: () => void show(key as keyof typeof FILTERS) }, f.label));

  async function show(key: keyof typeof FILTERS) {
    const mine = ++request;
    buttons.forEach((b, i) => b.classList.toggle('active', Object.keys(FILTERS)[i] === key));
    note.textContent = 'Loading...';
    list.replaceChildren();
    try {
      const events = await FILTERS[key].load();
      if (!alive || mine !== request) return;
      list.replaceChildren(...events.map(card));
      note.textContent = events.length ? '' : 'Nothing listed';
    } catch (e) {
      if (alive && mine === request) note.textContent = `Could not load: ${message(e)}`;
    }
  }

  page(
    h('h2', {}, 'Tournaments'),
    h('div', { className: 'row' }, ...buttons),
    h('p', { className: 'note' },
      'From Lichess broadcasts. FIDE events: search for "FIDE", so list may include past events and miss some. Official schedule: ',
      link('https://calendar.fide.com', 'FIDE calendar'), '.'),
    note,
    list,
  );
  void show('fide');
  return () => { alive = false; };
}
