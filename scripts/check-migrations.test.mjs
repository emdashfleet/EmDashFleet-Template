// The environment scripts/check-migrations.mjs gives wrangler (security audit of
// 2026-11-21, Template S17): an allowlist, never the whole of process.env.
import assert from "node:assert/strict";
import { test } from "node:test";
import { quietEnv } from "./check-migrations.mjs";

test("keeps what a local wrangler run needs and turns telemetry off", () => {
	const env = quietEnv({ PATH: "/usr/bin", HOME: "/home/runner", TMPDIR: "/tmp", CI: "true", XDG_CONFIG_HOME: "/home/runner/.config", WRANGLER_SEND_METRICS: "true" });
	assert.deepEqual(env, {
		ASTRO_TELEMETRY_DISABLED: "1",
		WRANGLER_SEND_METRICS: "false",
		PATH: "/usr/bin",
		HOME: "/home/runner",
		TMPDIR: "/tmp",
		CI: "true",
		XDG_CONFIG_HOME: "/home/runner/.config",
	});
});

test("drops tokens, account ids and every other variable", () => {
	const env = quietEnv({ PATH: "/usr/bin", CLOUDFLARE_API_TOKEN: "x", CLOUDFLARE_ACCOUNT_ID: "y", GITHUB_TOKEN: "z", NODE_OPTIONS: "--require ./evil.js", HOME: undefined });
	assert.deepEqual(Object.keys(env).toSorted(), ["ASTRO_TELEMETRY_DISABLED", "PATH", "WRANGLER_SEND_METRICS"]);
});
