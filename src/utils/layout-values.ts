// Validators for the values the public layout takes from data an editor or a
// visitor's browser controls (security audit of 2026-11-21, Template S14). Each
// returns a safe value for anything it is given, so a bad value renders the
// default instead of breaking the page.

/** The themes the layout knows. "system" follows the operating system and is stored as no cookie. */
export type Theme = "light" | "dark" | "system";

/**
 * The `target` of a menu link: `_blank` or `_self`, nothing else. A named browsing context or `_parent` would open
 * the link where the layout's `rel` for `_blank` does not apply.
 */
export function linkTarget(target: string | null | undefined): "_blank" | "_self" | undefined {
	return target === "_blank" || target === "_self" ? target : undefined;
}

/**
 * The theme a `theme` cookie value names. A value that is not one of the three themes, such as a token with a space,
 * gives "system": the value reaches `classList.add`, which throws on whitespace and would stop the theme buttons from
 * binding.
 */
export function storedTheme(value: string | null | undefined): Theme {
	return value === "light" || value === "dark" ? value : "system";
}

/**
 * The path of a media file in the media route: each segment of the storage key encoded, the slashes kept. A key is
 * data an editor stored; one with a `?`, a `#` or a `%` must not change the query, the fragment or the path of the URL
 * built from it.
 */
export function mediaFilePath(storageKey: string): string {
	return `/_emdash/api/media/file/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}
