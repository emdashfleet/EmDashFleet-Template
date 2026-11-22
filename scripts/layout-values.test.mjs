// Tests of src/utils/layout-values.ts (security audit of 2026-11-21, Template
// S14): a menu target other than _blank and _self is dropped, a theme cookie
// that is not light or dark gives "system", and a media key is encoded segment
// by segment.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { linkTarget, mediaFilePath, storedTheme } from "../src/utils/layout-values.ts";

test("keeps only _blank and _self as a link target", () => {
	assert.equal(linkTarget("_blank"), "_blank");
	assert.equal(linkTarget("_self"), "_self");
	for (const target of ["_parent", "_top", "somewindow", "_BLANK", " _blank", "", null, undefined]) {
		assert.equal(linkTarget(target), undefined, String(target));
	}
});

test("a theme cookie names light, dark or system, and nothing else", () => {
	assert.equal(storedTheme("light"), "light");
	assert.equal(storedTheme("dark"), "dark");
	for (const value of ["system", "", "bad value", "dark light", "Dark", "light;x", "\t", null, undefined]) {
		assert.equal(storedTheme(value), "system", JSON.stringify(value));
	}
});

test("encodes each segment of a media key and keeps the slashes", () => {
	assert.equal(mediaFilePath("01ABC.jpg"), "/_emdash/api/media/file/01ABC.jpg");
	assert.equal(mediaFilePath("uploads/2026/a b.png"), "/_emdash/api/media/file/uploads/2026/a%20b.png");
	assert.equal(mediaFilePath("x?y=1#z"), "/_emdash/api/media/file/x%3Fy%3D1%23z");
	assert.equal(mediaFilePath("a/%2e%2e/b"), "/_emdash/api/media/file/a/%252e%252e/b");
});

test("the layout, the byline and the post page use the validators", () => {
	const base = readFileSync("src/layouts/Base.astro", "utf8");
	assert.equal(base.match(/target=\{linkTarget\(item\.target\)\}/g)?.length, 2);
	assert.doesNotMatch(base, /target=\{item\.target\}/);
	assert.match(base, /return parseTheme\(row\?\.slice\(6\)\);/);
	// A name both imported and declared in the same <script> breaks the theme switcher on every
	// page while the build still succeeds (review of the security audit of 2026-11-21 fixes).
	for (const script of base.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
		const imported = [...script[1].matchAll(/import\s*\{([^}]*)\}/g)].flatMap((m) =>
			m[1].split(",").map((part) => part.trim().split(/\s+as\s+/).pop()).filter(Boolean),
		);
		for (const name of imported) {
			assert.doesNotMatch(script[1], new RegExp(`\\b(?:const|let|var|function)\\s+${name}\\b`), `${name} is imported and declared`);
		}
	}
	assert.match(readFileSync("src/components/Byline.astro", "utf8"), /mediaFilePath\(byline\.avatarStorageKey\)/);
	assert.match(readFileSync("src/pages/posts/[slug].astro", "utf8"), /mediaFilePath\(storageKey\)/);
});
