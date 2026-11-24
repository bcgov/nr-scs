/**
 * Case-insensitive de-duplication preserving first-occurrence order and casing.
 *
 * The report screens feed entered timber marks / scale-site values into a referential existence
 * check and a per-value "does not exist" message. Marks are case-insensitive (the lookup upper-cases
 * them), so "abc" and "ABC" are the SAME mark — without collapsing them the same value is checked
 * twice and its error message is rendered twice, space-joined. MultiValueInput only blocks EXACT
 * duplicates, so case variants reach here; this closes that gap.
 *
 * The original casing of the first occurrence is kept so the payload and any display stay faithful
 * to what the user typed.
 */
export function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toUpperCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(value);
  }
  return out;
}
