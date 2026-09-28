#!/usr/bin/env node
// Fails when a PRODUCTION dependency arrives under a license nobody has
// reviewed. The risk this guards is silent: a transitive bump can introduce
// copyleft terms without any visible change to package.json, and the cost of
// discovering that during acquisition diligence is far higher than the cost of
// a red build today.
//
// This checks the DECLARED license metadata only. A package that misdeclares
// itself is not caught here; see ops/DEPENDENCY_LICENSES.md for what was read
// by hand and why each exception below is considered settled.
//
// When this fails, do not reflexively widen ALLOWED. Read the new package's
// actual LICENSE file, decide whether the terms are acceptable for a hosted
// service, then either record it in REVIEWED with a reason or drop the
// dependency.

import { execFileSync } from "node:child_process";

// Permissive: attribution at most, no obligation triggered by hosting or by
// distributing a build. Dual/compound expressions are listed verbatim because
// that is how pnpm reports them.
const ALLOWED = new Set([
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "CC0-1.0",
  "ISC",
  "MIT",
  "Unlicense",
  "(MIT AND Zlib)", // both halves permissive
  "(MIT OR GPL-3.0-or-later)", // dual-licensed; we elect MIT
  "CC-BY-4.0", // data files (caniuse-lite); attribution only
]);

// Reviewed exceptions. `match` is a package-name prefix so that per-platform
// optional binaries resolve the same way on a developer laptop and in CI.
const REVIEWED = [
  {
    match: "@img/sharp-libvips-",
    license: "LGPL-3.0-or-later",
    reason:
      "Prebuilt libvips, pulled in by sharp for Next.js image optimization. " +
      "LGPL obligations attach to distribution; MindForge is hosted, so the " +
      "binary never reaches a user. Revisit if MindForge is ever shipped as a " +
      "downloadable or on-prem build.",
  },
  {
    match: "duck",
    license: "BSD",
    reason:
      "Declares a bare 'BSD', which is not valid SPDX and so cannot be matched " +
      "by license. Its LICENSE file is BSD-2-Clause verbatim. Reaches us via " +
      "mammoth, used for DOCX ingestion.",
  },
];

// Re-enter the SAME pnpm that invoked this script rather than whatever `pnpm`
// resolves to on PATH. A corepack shim or a newer global install otherwise
// answers instead and refuses to run against the pinned packageManager
// version, which turns a working gate into an unexplained exit 2.
function pnpmCommand() {
  const execpath = process.env.npm_execpath;
  if (execpath && execpath.endsWith(".cjs")) {
    return { file: process.execPath, prefix: [execpath] };
  }
  return { file: execpath || "pnpm", prefix: [] };
}

function readProductionLicenses() {
  const { file, prefix } = pnpmCommand();
  let raw;
  try {
    raw = execFileSync(file, [...prefix, "licenses", "list", "--prod", "--json"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    // An empty or partial store yields a non-zero exit with an empty payload.
    // Treating that as "no violations" would make the gate silently useless.
    console.error("Could not read dependency licenses. Is the store installed?");
    console.error(error.stderr?.toString().trim() || error.message);
    process.exit(2);
  }

  try {
    return JSON.parse(raw);
  } catch {
    console.error("Unexpected output from `pnpm licenses list`; cannot verify.");
    process.exit(2);
  }
}

const byLicense = readProductionLicenses();
const violations = [];
let inspected = 0;

for (const [license, packages] of Object.entries(byLicense)) {
  for (const pkg of packages) {
    inspected += 1;
    if (ALLOWED.has(license)) continue;

    const exception = REVIEWED.find(
      (entry) => pkg.name.startsWith(entry.match) && entry.license === license,
    );
    if (exception) continue;

    const versions = pkg.versions?.join(", ") ?? pkg.version ?? "unknown";
    violations.push({ name: pkg.name, versions, license });
  }
}

if (violations.length > 0) {
  console.error(`Unreviewed production dependency licenses (${violations.length}):\n`);
  for (const v of violations) {
    console.error(`  ${v.name}@${v.versions}  ->  ${v.license}`);
  }
  console.error(
    "\nRead the package's LICENSE file, then record the decision in " +
      "scripts/check-licenses.mjs and ops/DEPENDENCY_LICENSES.md.",
  );
  process.exit(1);
}

console.log(
  `Checked ${inspected} production packages; all licenses reviewed and permitted.`,
);
