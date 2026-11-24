// Tests of src/utils/search-query.ts (security audit of 2026-11-21, Template
// S8): the query of the public search page is trimmed and cut to 200 characters.
import assert from "node:assert/strict";
import { test } from "node:test";
import { boundedQuery, MAX_SEARCH_QUERY } from "../src/utils/search-query.ts";

test("cuts a long query to 200 characters", () => {
	assert.equal(MAX_SEARCH_QUERY, 200);
	assert.equal(boundedQuery("a".repeat(10_000)).length, 200);
	assert.equal(boundedQuery("a".repeat(200)), "a".repeat(200));
	assert.equal(boundedQuery("a".repeat(201)), "a".repeat(200));
});

test("trims whitespace, also at the cut", () => {
	assert.equal(boundedQuery("  hello world \n"), "hello world");
	assert.equal(boundedQuery(`${"a".repeat(199)} b`), "a".repeat(199));
	assert.equal(boundedQuery("   "), "");
});

test("gives an empty string for a missing query", () => {
	assert.equal(boundedQuery(null), "");
	assert.equal(boundedQuery(undefined), "");
	assert.equal(boundedQuery(""), "");
});

test("never splits a surrogate pair", () => {
	const cut = boundedQuery("\u{1F600}".repeat(300));
	assert.equal([...cut].length, 200);
	assert.equal(cut, "\u{1F600}".repeat(200));
	assert.doesNotMatch(cut, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
});
