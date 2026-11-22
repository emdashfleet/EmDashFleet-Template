// The output format of the template checks under scripts/, the same as the
// checks of Zeyadigital/EmDashFleet-App: one line per finding,
// `<file>[:<line>] [<rule>] <message>`, then FAIL or PASS.
//
// GitHub Actions reads every line a step prints that starts with `::` as a
// workflow command (::error::, ::set-env::, ::stop-commands::...). A finding
// names things the repository chooses (a file path, a binding key, a migration
// name, a package name), so its text is escaped before it is printed: a line
// feed or carriage return can no longer end the line and start another, and a
// line can no longer begin with `::` (security audit of 2026-11-21, Template
// S15). The escapes are the ones of the Actions toolkit, which the runner
// decodes in a command's data and properties:
// https://github.com/actions/toolkit/blob/main/packages/core/src/command.ts
// https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands

/**
 * @typedef {object} Finding
 * @property {string} file
 * @property {number} [line]
 * @property {string} rule
 * @property {string} message
 */

/**
 * The text of a workflow command's data: `%` is written `%25`, a carriage return `%0D` and a line feed `%0A`.
 * @param {unknown} text
 * @returns {string}
 */
export function escapeCommandData(text) {
	return String(text).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/**
 * The text of a workflow command's property value: the escapes of the data, and `:` as `%3A` and `,` as `%2C`.
 * @param {unknown} text
 * @returns {string}
 */
export function escapeCommandProperty(text) {
	return escapeCommandData(text).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

/**
 * One line of check output that no workflow command can start: one line, and not beginning with `::` (the runner ignores leading white space before it).
 * @param {unknown} text
 * @returns {string}
 */
export function plainLine(text) {
	return escapeCommandData(text).replace(/^(\s*):/, "$1%3A");
}

/**
 * The lines printed for the findings of one check.
 * @param {readonly Finding[]} findings
 * @returns {string[]}
 */
export function findingLines(findings) {
	return findings.map((finding) => {
		const where = finding.line === undefined ? finding.file : `${finding.file}:${finding.line}`;
		return plainLine(`${where} [${finding.rule}] ${finding.message}`);
	});
}

/**
 * Prints the findings of one check and sets a failing exit code when there is any.
 * @param {string} check
 * @param {readonly Finding[]} findings
 */
export function report(check, findings) {
	for (const line of findingLines(findings)) console.error(line);
	if (findings.length > 0) {
		console.error(`${check}: FAIL (${findings.length})`);
		process.exitCode = 1;
	} else {
		console.log(`${check}: PASS`);
	}
}
