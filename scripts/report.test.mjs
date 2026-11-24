// What scripts/lib/report.mjs prints (security audit of 2026-11-21, Template
// S15): a finding is one line that GitHub Actions cannot read as a workflow
// command, whatever a file path, binding key or migration name holds.
import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeCommandData, escapeCommandProperty, findingLines, plainLine } from "./lib/report.mjs";

test("prints a finding as `<file>:<line> [<rule>] <message>`", () => {
	assert.deepEqual(
		findingLines([
			{ file: "wrangler.jsonc", rule: "binding", message: "DB is missing" },
			{ file: "package.json", line: 12, rule: "exact-version", message: "dependencies.x is ^1.0.0" },
		]),
		["wrangler.jsonc [binding] DB is missing", "package.json:12 [exact-version] dependencies.x is ^1.0.0"],
	);
});

test("a message cannot end the line and start a workflow command", () => {
	const [line] = findingLines([{ file: "wrangler.jsonc", rule: "binding", message: "bad key\n::error::forged\r\n::set-output name=x::y" }]);
	assert.equal(line, "wrangler.jsonc [binding] bad key%0A::error::forged%0D%0A::set-output name=x::y");
	assert.doesNotMatch(line, /[\r\n]/);
});

test("a line never begins with ::, after white space either", () => {
	assert.equal(plainLine("::error::x"), "%3A:error::x");
	assert.equal(plainLine("  \t::error::x"), "  \t%3A:error::x");
	const [line] = findingLines([{ file: "::error::x/package.json", rule: "exact-version", message: "m" }]);
	assert.match(line, /^%3A:error::x\/package\.json /);
	assert.equal(plainLine("a ::b"), "a ::b");
});

test("percent signs are escaped so the escapes stay unambiguous", () => {
	assert.equal(escapeCommandData("100% %0A"), "100%25 %250A");
	assert.equal(escapeCommandProperty("a:b,c%\n"), "a%3Ab%2Cc%25%0A");
});
