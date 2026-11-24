/** The longest search query the public search page passes to EmDash, in characters. */
export const MAX_SEARCH_QUERY = 200;

/**
 * The search query of a request: trimmed and cut to MAX_SEARCH_QUERY characters, empty when absent. The public search
 * page calls search() directly, so nothing else bounds what an anonymous visitor sends to the FTS5 index (security
 * audit of 2026-11-21, Template S8). The cut counts characters, not UTF-16 units, so it never splits a surrogate pair.
 */
export function boundedQuery(raw: string | null | undefined): string {
	const text = (raw ?? "").trim();
	if (text.length <= MAX_SEARCH_QUERY) return text;
	return [...text].slice(0, MAX_SEARCH_QUERY).join("").trimEnd();
}
