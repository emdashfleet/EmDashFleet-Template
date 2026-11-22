// Tests of .github/dependabot.yml (security audit of 2026-11-21, Template S19
// and S13): every entry proposes a release only 7 days after it is published,
// and the npm entry groups emdash and the @emdash-cms packages into one pull
// request, because they cannot be updated separately.
// https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

const config = parse(readFileSync(".github/dependabot.yml", "utf8"));
const updates = config.updates;

test("has an npm and a github-actions entry", () => {
	assert.deepEqual(updates.map((entry) => entry["package-ecosystem"]).toSorted(), ["github-actions", "npm"]);
});

test("every entry waits 7 days after a release is published (cooldown default-days)", () => {
	for (const entry of updates) assert.equal(entry.cooldown?.["default-days"], 7, entry["package-ecosystem"]);
});

test("the npm entry groups emdash and every @emdash-cms package into one pull request", () => {
	const npm = updates.find((entry) => entry["package-ecosystem"] === "npm");
	assert.deepEqual(Object.keys(npm.groups ?? {}), ["emdash"]);
	assert.deepEqual(npm.groups.emdash.patterns, ["emdash", "@emdash-cms/*"]);
	// Without applies-to a group covers version updates only, so a security update stays one pull request per dependency.
	assert.equal(npm.groups.emdash["applies-to"], undefined);
});
