/** Filename-only, accent-insensitive substring matching.
 * Number-word aliases apply without removing the original words, so partial
 * searches such as "si" still match filenames containing "six".
 */
const NUMBER_WORDS = new Map([
  ['zero','0'],['one','1'],['un','1'],['une','1'],['two','2'],['deux','2'],
  ['three','3'],['trois','3'],['four','4'],['quatre','4'],['five','5'],['cinq','5'],
  ['six','6'],['seven','7'],['sept','7'],['eight','8'],['huit','8'],
  ['nine','9'],['neuf','9'],['ten','10'],['dix','10'],
]);
export const normalize = value => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const canonical = value => normalize(value).split(' ').map(w => NUMBER_WORDS.get(w) ?? w).join(' ');
export function matchesTitle(title, query) {
  const q = normalize(query);
  if (!q) return true;
  const raw = normalize(title);
  const aliased = canonical(title);
  if (raw.includes(q) || aliased.includes(canonical(query))) return true;
  return q.split(' ').every(word => raw.includes(word) || aliased.includes(NUMBER_WORDS.get(word) ?? word));
}
