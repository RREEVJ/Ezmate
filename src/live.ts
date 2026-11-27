/** sources with human game in progress; engine tabs are locked while non-empty */
const active = new Set<string>();
let listener = () => {};

export const live = {
  add(source: string) { active.add(source); listener(); },
  delete(source: string) { active.delete(source); listener(); },
  get any() { return active.size > 0; },
  watch(fn: () => void) { listener = fn; },
};
