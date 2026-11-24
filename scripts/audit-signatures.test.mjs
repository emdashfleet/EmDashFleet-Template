// Which packages fail the build and which only warn in
// scripts/audit-signatures.mjs (app plan, Security (Template supply chain)).
import assert from "node:assert/strict";
import { test } from "node:test";
import { signatureFindings, warningCommand } from "./audit-signatures.mjs";

const installed = [
	{ location: "node_modules/@emdash-fleet/example-plugin", name: "@emdash-fleet/example-plugin", version: "1.0.0" },
	{ location: "node_modules/emdash", name: "emdash", version: "1.4.0" },
	{ location: "node_modules/example-package", name: "example-package", version: "2.0.0" },
];
const provenance = { provenance: { predicateType: "https://slsa.dev/provenance/v1" } };

test("fails a Fleet package without provenance and warns for an unsigned EmDash package", () => {
	const audit = {
		invalid: [],
		missing: [{ name: "emdash", version: "1.4.0", location: "node_modules/emdash" }],
		verified: [{ name: "emdash", version: "1.4.0", location: "node_modules/emdash", attestations: provenance }],
	};
	const { failures, warnings } = signatureFindings(audit, installed);
	assert.deepEqual(failures.map((finding) => finding.rule), ["provenance"]);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /^emdash@1\.4\.0 .* no registry signature$/);
});

test("passes when Fleet's and EmDash's packages are attested, whatever other packages lack", () => {
	const audit = {
		invalid: [],
		missing: [],
		verified: installed.slice(0, 2).map((pkg) => ({ ...pkg, attestations: provenance })),
	};
	assert.deepEqual(signatureFindings(audit, installed), { failures: [], warnings: [] });
});

test("a warning command stays one line whatever a package name holds", () => {
	assert.equal(warningCommand("package-lock.json", "emdash@1.4.0 has no registry signature"), "::warning file=package-lock.json::emdash@1.4.0 has no registry signature");
	const command = warningCommand("package-lock.json", "100% x\r\n::error::forged\n::stop-commands::token");
	assert.equal(command, "::warning file=package-lock.json::100%25 x%0D%0A::error::forged%0A::stop-commands::token");
	assert.doesNotMatch(command, /[\r\n]/);
	assert.equal(warningCommand("a:b,c\n.json", "x"), "::warning file=a%3Ab%2Cc%0A.json::x");
});
