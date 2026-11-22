// Tests of src/utils/escape-xml.ts (security audit of 2026-11-21, Template S9):
// the five XML characters are escaped, and a URL with an `&` stays valid in a feed.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { escapeXml } from "../src/utils/escape-xml.ts";

test("escapes the five XML characters", () => {
	assert.equal(escapeXml("a&b"), "a&amp;b");
	assert.equal(escapeXml("<tag>"), "&lt;tag&gt;");
	assert.equal(escapeXml('say "hi"'), "say &quot;hi&quot;");
	assert.equal(escapeXml("it's"), "it&apos;s");
	assert.equal(escapeXml("plain text"), "plain text");
});

test("escapes an ampersand once, so a URL with a query round-trips as &amp;", () => {
	assert.equal(escapeXml("https://example.test/posts/a&b?x=1&y=2"), "https://example.test/posts/a&amp;b?x=1&amp;y=2");
	assert.equal(escapeXml("&amp;"), "&amp;amp;");
});

test("the feed passes every URL it writes through escapeXml", () => {
	const feed = readFileSync("src/pages/rss.xml.ts", "utf8");
	assert.match(feed, /const postUrl = escapeXml\(/);
	assert.match(feed, /<link>\$\{escapeXml\(siteUrl\.href\)\}<\/link>/);
	assert.match(feed, /<atom:link href="\$\{escapeXml\(new URL\("\/rss\.xml", siteUrl\)\.href\)\}"/);
	assert.doesNotMatch(feed, /(?<!escapeXml\()new URL\(`\/posts\//);
});
