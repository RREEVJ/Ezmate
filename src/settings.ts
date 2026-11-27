import { h, message, page } from './dom.ts';
import { boardUrl, choice, pieceUrl, setBoard, setPieces, setTemplate } from './pieces.ts';
import { sound } from './sound.ts';
import { BOARDS, PIECES } from './themes.gen.ts';

export function settings(): () => void {
  const note = h('p', { className: 'note', role: 'status' });

  const tile = (label: string, image: Node, active: () => boolean, pick: () => Promise<number>) => {
    const button = h('button', { className: 'tile' }, image, h('span', {}, label));
    button.dataset.name = label;
    const mark = () => {
      button.classList.toggle('active', active());
      button.setAttribute('aria-pressed', String(active()));
    };
    button.onclick = () => void pick().then(() => {
      button.parentElement!.querySelectorAll('button').forEach(b => b.dispatchEvent(new Event('mark')));
    });
    button.addEventListener('mark', mark);
    mark();
    return button;
  };

  const preview = (src: string, className = '') => h('img', { src, className, alt: '', loading: 'lazy' });

  const boards = h('div', { className: 'tiles' },
    tile('default', h('span', { className: 'swatch' }), () => !BOARDS.some(b => b.name === choice.board), () => setBoard('')),
    ...BOARDS.map(b => tile(b.name, preview(boardUrl(b.file)), () => choice.board === b.name, () => setBoard(b.name))));

  const pieces = h('div', { className: 'tiles' },
    ...PIECES.map(s => tile(s.name, preview(pieceUrl(s.name, 'w', 'n'), s.mono ? 'mono' : ''),
      () => !choice.template && choice.pieces === s.name, () => setPieces(s.name))));

  const input = h('input', { type: 'url', value: choice.template, placeholder: 'https://example.com/{c}{P}.svg' });
  const save = (value: string) => setTemplate(value).then(
    failed => { note.textContent = failed ? `${failed} images failed, using chosen set for those` : 'Saved'; },
    e => { note.textContent = message(e); });

  const mute = h('input', { type: 'checkbox', checked: sound.on });
  mute.onchange = () => sound.set(mute.checked);

  page(
    h('h2', {}, `Boards (${BOARDS.length + 1})`), boards,
    h('h2', {}, `Pieces (${PIECES.length})`), pieces,
    h('h2', {}, 'Custom piece link'),
    h('label', {}, '{c}: w or b. {P}: P N B R Q K. {p}: lowercase', input),
    h('div', { className: 'row' },
      h('button', { onclick: () => void save(input.value) }, 'Save'),
      h('button', { onclick: () => { input.value = ''; void save(''); } }, 'Remove link')),
    note,
    h('h2', {}, 'Sound'),
    h('label', { className: 'check' }, mute, 'Move sounds'),
    h('p', {}, h('a', { href: `${import.meta.env.BASE_URL}CREDITS.md`, target: '_blank' }, 'Theme credits and licenses')),
  );
  return () => {};
}
