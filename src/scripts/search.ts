// Search page: filters /data/search.json in the browser. The URL keeps the query
// (?q=&specialty=&state=&has=) so results can be shared and the back button works.
import { cardHtml, initials } from '../lib/card';

type Rec = { n: string; u: string; d: string | null; s: string[]; c: string; r: string; z: string | null; h: string[]; x: string[]; f: string[]; p: 0 | 1 };
type Index = { badge: string; terms: Record<string, [string, string]>; regions: Record<string, [string, string]>; flags: Record<string, string>; listings: Rec[] };

// The repo's TypeScript config loads Workers types, whose global Element clashes with the DOM's,
// so typed element lists go through this cast.
const all = <T,>(root: { querySelectorAll(sel: string): Iterable<unknown> }, sel: string) => [...root.querySelectorAll(sel)] as T[];

const PAGE = 24;
const STOP = new Set(['dr', 'doctor', 'in', 'near', 'me', 'the', 'a', 'an', 'of', 'and', 'for', 'at']);
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const ui = document.getElementById('search-ui')!;
const form = ui.querySelector<HTMLFormElement>('form.search')!;
const q = form.querySelector<HTMLInputElement>('input[name="q"]')!;
const selects = all<HTMLSelectElement>(form, 'select');
const flagBox = ui.querySelector<HTMLElement>('[data-flag-filters]');
const flagInputs = all<HTMLInputElement>(ui, 'input[name="has"]');
const results = ui.querySelector<HTMLElement>('[data-results]')!;
const count = ui.querySelector<HTMLElement>('[data-count]')!;
const list = ui.querySelector<HTMLElement>('[data-list]')!;
const skeleton = ui.querySelector<HTMLElement>('[data-skeleton]')!;
const moreWrap = ui.querySelector<HTMLElement>('[data-more-wrap]')!;
const empty = ui.querySelector<HTMLElement>('[data-empty]')!;
const emptyWhat = ui.querySelector<HTMLElement>('[data-empty-what]')!;
const error = ui.querySelector<HTMLElement>('[data-error]')!;
const none = ui.querySelector<HTMLElement>('[data-none]')!;
const one = ui.dataset.nounOne!, many = ui.dataset.nounMany!;

let index: Index | null = null;
let hay: string[] = [];
let shown = PAGE;
let timer: number | undefined;

results.hidden = false;
if (flagBox) flagBox.hidden = false;

// Restore state from the URL.
const params = new URLSearchParams(location.search);
q.value = params.get('q') ?? '';
for (const s of selects) s.value = params.get(s.name) ?? '';
const has = new Set(params.getAll('has'));
for (const i of flagInputs) i.checked = has.has(i.value);
syncUrl(); // drop empty params left by a plain form submit

function state() {
  return {
    q: q.value.trim(),
    sel: selects.filter((s) => s.value).map((s) => [s.name, s.value] as const),
    flags: flagInputs.filter((i) => i.checked).map((i) => i.value),
  };
}

function syncUrl() {
  const st = state();
  const p = new URLSearchParams();
  if (st.q) p.set('q', st.q);
  for (const [k, v] of st.sel) p.set(k, v);
  for (const f of st.flags) p.append('has', f);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

function buildHay(ix: Index) {
  return ix.listings.map((l) =>
    norm([l.n, l.d ?? '', ...l.s.flatMap((t) => ix.terms[t] ?? [t]), l.c, ...(ix.regions[l.r] ?? []), l.z ?? '', ...l.h, ...l.x].join(' ')),
  );
}

function view(l: Rec, ix: Index) {
  const specs = l.s.map((t) => ix.terms[t]?.[0] ?? t);
  return cardHtml({
    name: l.n,
    url: l.u,
    monogram: initials(l.n),
    subtitle: [l.d, specs[0]].filter(Boolean).join(' · '),
    more: specs.length - 1,
    place: `${l.c}, ${ix.regions[l.r]?.[1] ?? ''}`,
    institution: l.h[0] ?? null,
    chips: l.f.map((k) => ({ key: k, label: ix.flags[k] ?? k })),
    verified: l.p === 1,
    verifiedLabel: ix.badge,
  });
}

function run(resetPage = true) {
  if (!index) return;
  const ix = index;
  if (resetPage) shown = PAGE;
  const st = state();
  const tokens = norm(st.q).split(/[^a-z0-9]+/).filter((t) => t && !STOP.has(t));
  const term = selects.find((s) => s.dataset.role === 'term')?.value;
  const region = selects.find((s) => s.dataset.role === 'region')?.value;

  // Listings arrive in site order (Verified first, then most complete, then A to Z); filtering keeps it.
  const hits = ix.listings.filter((l, i) =>
    (!term || l.s.includes(term)) &&
    (!region || l.r === region) &&
    st.flags.every((f) => l.f.includes(f)) &&
    tokens.every((t) => hay[i]!.includes(t)),
  );

  skeleton.hidden = true;
  error.hidden = true;
  const total = ix.listings.length;
  const filtered = tokens.length > 0 || st.sel.length > 0 || st.flags.length > 0;
  count.innerHTML = filtered
    ? `<strong>${hits.length}</strong> of ${total} ${total === 1 ? one : many}`
    : `<strong>${total}</strong> ${total === 1 ? one : many}`;
  list.innerHTML = hits.slice(0, shown).map((l) => view(l, ix)).join('');
  list.hidden = hits.length === 0;
  moreWrap.hidden = hits.length <= shown;
  const more = moreWrap.querySelector('button')!;
  more.textContent = `Show ${Math.min(PAGE, hits.length - shown)} more`;
  none.hidden = total > 0;
  empty.hidden = hits.length > 0 || total === 0;
  if (!hits.length) emptyWhat.textContent = st.q ? `“${st.q}”` : 'these filters';
}

async function load() {
  error.hidden = true;
  skeleton.hidden = false;
  count.textContent = 'Loading…';
  try {
    const res = await fetch('/data/search.json');
    if (!res.ok) throw new Error(String(res.status));
    index = (await res.json()) as Index;
    hay = buildHay(index);
    run();
  } catch {
    skeleton.hidden = true;
    list.hidden = true;
    count.textContent = '';
    error.hidden = false;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  syncUrl();
  run();
  results.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
});
q.addEventListener('input', () => {
  clearTimeout(timer);
  timer = window.setTimeout(() => { syncUrl(); run(); }, 120);
});
for (const el of [...selects, ...flagInputs]) el.addEventListener('change', () => { syncUrl(); run(); });
moreWrap.querySelector('button')!.addEventListener('click', () => {
  const first = list.children.length;
  shown += PAGE;
  run(false);
  list.querySelector<HTMLAnchorElement>(`li:nth-child(${first + 1}) .card-link`)?.focus();
});
ui.querySelector('[data-clear]')!.addEventListener('click', () => {
  q.value = '';
  for (const s of selects) s.value = '';
  for (const i of flagInputs) i.checked = false;
  syncUrl();
  run();
  q.focus();
});
ui.querySelector('[data-retry]')!.addEventListener('click', load);

load();
