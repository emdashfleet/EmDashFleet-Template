// Compares the bindings of wrangler.jsonc with fleet-site-bindings.json, the
// copy of EmDash Fleet's SiteBindings constants that `npm run
// export:site-bindings` writes in Zeyadigital/EmDashFleet-App (app plan,
// Sites (template) and Build and deploy (Rules); tracker APA-174). Fleet
// uploads every build with the binding names of its own records, so a name
// that differs here would give local development and the deployed site
// different bindings. Every binding the file declares in wrangler.jsonc must
// be there under its Wrangler key, no other binding may be, and wrangler.jsonc
// holds no key beyond those and the Worker settings of WORKER_SETTINGS, so a
// renamed, missing or added binding of any type fails the template checks.
// The two compatibility settings are checked by value, not only by key
// (security audit of 2026-11-21, Template S7): compatibility_flags is exactly
// ["nodejs_compat"], the flags Fleet uploads with every build, so a flag such as
// nodejs_compat_do_not_populate_process_env cannot keep EMDASH_SITE_URL and
// EMDASH_ENCRYPTION_KEY out of process.env or global_fetch_strictly_public
// change how the site's own fetches route; compatibility_date is a date from
// 2025-04-01, when nodejs_compat started to populate process.env.
// wrangler.jsonc is read with Wrangler's own reader.
//
// Usage: node scripts/check-bindings.mjs [wrangler.jsonc] [fleet-site-bindings.json]
// https://developers.cloudflare.com/workers/wrangler/configuration/
// https://developers.cloudflare.com/workers/configuration/compatibility-flags/
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { experimental_readRawConfig } from "wrangler";
import { report } from "./lib/report.mjs";

/** The keys of wrangler.jsonc that declare no binding. */
const WORKER_SETTINGS = new Set(["$schema", "name", "main", "compatibility_date", "compatibility_flags", "observability", "triggers"]);

/** The compatibility flags of every build Fleet uploads. */
const COMPATIBILITY_FLAGS = ["nodejs_compat"];

/** The compatibility date from which nodejs_compat populates process.env with the text and JSON bindings. */
const PROCESS_ENV_DATE = "2025-04-01";

/**
 * @typedef {object} SiteBinding
 * @property {string} name
 * @property {string} type
 * @property {string | null} wrangler
 * @property {"wrangler.jsonc" | "adapter" | "upload"} declaredIn
 */

/**
 * The binding names a Wrangler key holds: one object, or a list of objects, each with `binding`.
 * @param {unknown} value
 * @returns {string[] | null} null when the value has another shape
 */
function bindingNames(value) {
	const entries = Array.isArray(value) ? value : [value];
	const names = entries.flatMap((entry) => (entry !== null && typeof entry === "object" && typeof entry.binding === "string" ? [entry.binding] : []));
	return names.length === entries.length ? names : null;
}

/**
 * The differences between a raw wrangler.jsonc and the Fleet bindings.
 * @param {Record<string, unknown>} config the configuration as written, before Wrangler fills defaults
 * @param {readonly SiteBinding[]} bindings
 * @param {string} file the name findings carry
 * @returns {import("./lib/report.mjs").Finding[]}
 */
export function bindingFindings(config, bindings, file = "wrangler.jsonc") {
	/** @type {import("./lib/report.mjs").Finding[]} */
	const findings = [];
	/** @type {Map<string, string[]>} */
	const expected = new Map();
	for (const binding of bindings) {
		if (binding.declaredIn !== "wrangler.jsonc" || binding.wrangler === null) continue;
		expected.set(binding.wrangler, [...(expected.get(binding.wrangler) ?? []), binding.name]);
	}
	for (const key of Object.keys(config)) {
		if (!WORKER_SETTINGS.has(key) && !expected.has(key)) {
			findings.push({ file, rule: "unexpected-key", message: `${key} is neither a Worker setting nor a binding of fleet-site-bindings.json` });
		}
	}
	if (JSON.stringify(config.compatibility_flags) !== JSON.stringify(COMPATIBILITY_FLAGS)) {
		findings.push({ file, rule: "compatibility-flags", message: `compatibility_flags is ${JSON.stringify(config.compatibility_flags) ?? "missing"}; it must be ${JSON.stringify(COMPATIBILITY_FLAGS)}` });
	}
	const date = config.compatibility_date;
	if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < PROCESS_ENV_DATE) {
		findings.push({ file, rule: "compatibility-date", message: `compatibility_date is ${JSON.stringify(date) ?? "missing"}; it must be a YYYY-MM-DD date of ${PROCESS_ENV_DATE} or later` });
	}
	for (const [key, names] of expected) {
		if (!(key in config)) {
			findings.push({ file, rule: "missing-binding", message: `${key} is missing; it must declare ${names.join(", ")}` });
			continue;
		}
		const actual = bindingNames(config[key]);
		if (actual === null) {
			findings.push({ file, rule: "binding-shape", message: `${key} holds an entry without a binding name` });
			continue;
		}
		const want = names.toSorted();
		const have = actual.toSorted();
		if (want.join("\n") !== have.join("\n")) {
			findings.push({ file, rule: "binding-names", message: `${key} declares ${have.join(", ") || "nothing"}; fleet-site-bindings.json names ${want.join(", ")}` });
		}
	}
	return findings;
}

/**
 * The bindings of fleet-site-bindings.json.
 * @param {string} text
 * @returns {SiteBinding[]}
 */
export function parseSiteBindings(text) {
	const parsed = JSON.parse(text);
	if (parsed === null || typeof parsed !== "object" || !Array.isArray(parsed.bindings)) {
		throw new Error("fleet-site-bindings.json has no bindings list");
	}
	return parsed.bindings;
}

if (import.meta.main) {
	const configPath = resolve(process.argv[2] ?? "wrangler.jsonc");
	const bindingsPath = resolve(process.argv[3] ?? "fleet-site-bindings.json");
	const { rawConfig, configPath: readPath } = experimental_readRawConfig({ config: configPath });
	if (readPath !== configPath) throw new Error(`Wrangler read ${readPath} instead of ${configPath}`);
	const bindings = parseSiteBindings(readFileSync(bindingsPath, "utf8"));
	report("check-bindings", bindingFindings(rawConfig, bindings, process.argv[2] ?? "wrangler.jsonc"));
}
