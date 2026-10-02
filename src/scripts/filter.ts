// Progressive filters for the static city, state and specialty lists. Without JS every card shows
// and the filter form stays hidden. Cards carry data-flags / data-terms / data-city (src/lib/card.ts).
// The repo's TypeScript config loads Workers types, whose global Element clashes with the DOM's,
// so typed element lists go through this cast.
const all = <T,>(root: { querySelectorAll(sel: string): Iterable<unknown> }, sel: string) => [...root.querySelectorAll(sel)] as T[];

for (const root of all<HTMLElement>(document, '[data-listing-list]')) {
  const form = root.querySelector<HTMLFormElement>('[data-filters]');
  if (!form) continue;
  const cards = all<HTMLElement>(root, '.card');
  const count = root.querySelector<HTMLElement>('[data-count]')!;
  const empty = root.querySelector<HTMLElement>('[data-empty]')!;
  const list = root.querySelector<HTMLElement>('.cards')!;
  const one = count.dataset.nounOne!, many = count.dataset.nounMany!;
  form.hidden = false;

  const apply = () => {
    const flags = all<HTMLInputElement>(form, 'input[data-filter="flags"]:checked').map((i) => i.value);
    const selects = all<HTMLSelectElement>(form, 'select[data-filter]').filter((s) => s.value);
    let shown = 0;
    for (const card of cards) {
      const has = new Set((card.dataset.flags ?? '').split(' '));
      const ok = flags.every((f) => has.has(f)) && selects.every((s) => (card.dataset[s.dataset.filter!] ?? '').split(' ').includes(s.value));
      card.hidden = !ok;
      if (ok) shown++;
    }
    const filtered = flags.length > 0 || selects.length > 0;
    count.innerHTML = filtered
      ? `<strong>${shown}</strong> of ${cards.length} ${cards.length === 1 ? one : many}`
      : `<strong>${cards.length}</strong> ${cards.length === 1 ? one : many}`;
    empty.hidden = shown > 0;
    list.hidden = shown === 0;
  };

  form.addEventListener('change', apply);
  form.addEventListener('submit', (e) => e.preventDefault());
  root.querySelector('[data-clear]')?.addEventListener('click', () => {
    form.reset();
    apply();
    form.querySelector<HTMLElement>('input, select')?.focus();
  });
  apply();
}
