const XML_ESCAPE_PATTERNS = [
	[/&/g, "&amp;"],
	[/</g, "&lt;"],
	[/>/g, "&gt;"],
	[/"/g, "&quot;"],
	[/'/g, "&apos;"],
] as const;

/**
 * `text` as XML character data or attribute value. Every value that goes into a feed is passed through this, URLs
 * included: a post slug with an `&` in it would otherwise make the feed invalid XML for every subscriber (security
 * audit of 2026-11-21, Template S9).
 */
export function escapeXml(text: string): string {
	let result = text;
	for (const [pattern, replacement] of XML_ESCAPE_PATTERNS) {
		result = result.replace(pattern, replacement);
	}
	return result;
}
