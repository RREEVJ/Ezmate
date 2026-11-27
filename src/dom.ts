type Props<K extends keyof HTMLElementTagNameMap> = Partial<HTMLElementTagNameMap[K]>;

/** create element; strings become text nodes, so remote names are never parsed as HTML */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, props: Props<K> = {}, ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...children);
  return el;
}

export const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

export const status = (text: string) => { $('#status').textContent = text; };
export const panel = (...nodes: Node[]) => $('#panel').replaceChildren(...nodes);
export const page = (...nodes: Node[]) => $('#page').replaceChildren(...nodes);
export const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
