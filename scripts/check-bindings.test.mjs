// The bindings check of scripts/check-bindings.mjs on the template's own files
// and on a renamed and an added binding (tracker APA-174).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { experimental_readRawConfig } from "wrangler";
import { bindingFindings, parseSiteBindings } from "./check-bindings.mjs";

const { rawConfig } = experimental_readRawConfig({ config: "wrangler.jsonc" });
const bindings = parseSiteBindings(readFileSync("fleet-site-bindings.json", "utf8"));

/** @param {Record<string, unknown>} config */
const rules = (config) => bindingFindings(config, bindings).map((finding) => finding.rule);

test("passes the template's wrangler.jsonc", () => {
	assert.deepEqual(rules(rawConfig), []);
});

test("fails a renamed binding and a binding Fleet does not upload", () => {
	const renamed = structuredClone(rawConfig);
	renamed.kv_namespaces[0].binding = "SESSIONS";
	assert.deepEqual(rules(renamed), ["binding-names"]);
	assert.deepEqual(rules({ ...rawConfig, worker_loaders: [{ binding: "LOADER" }] }), ["unexpected-key"]);
});

test("fails a compatibility flag other than nodejs_compat, a missing one and a date before process.env is populated", () => {
	for (const flags of [
		["nodejs_compat", "nodejs_compat_do_not_populate_process_env"],
		["nodejs_compat", "global_fetch_strictly_public"],
		["nodejs_compat_do_not_populate_process_env"],
		["nodejs_compat_populate_process_env"],
		[],
		"nodejs_compat",
	]) {
		assert.deepEqual(rules({ ...rawConfig, compatibility_flags: flags }), ["compatibility-flags"], JSON.stringify(flags));
	}
	const { compatibility_flags: _flags, compatibility_date: _date, ...bare } = rawConfig;
	assert.deepEqual(rules(bare), ["compatibility-flags", "compatibility-date"]);
	for (const date of ["2025-03-31", "2024-09-23", "2026-11", "latest", "2026-11-10T00:00:00Z", 20261110]) {
		assert.deepEqual(rules({ ...rawConfig, compatibility_date: date }), ["compatibility-date"], JSON.stringify(date));
	}
	for (const date of ["2025-04-01", "2026-11-10", "2027-01-01"]) assert.deepEqual(rules({ ...rawConfig, compatibility_date: date }), [], date);
});
