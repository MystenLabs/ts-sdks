---
name: fix-audit
description: Fix pnpm audit vulnerabilities. Upgrades packages, adds overrides, handles minimumReleaseAge restrictions, and cleans up stale overrides.
user-invocable: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

# Fix pnpm Audit Vulnerabilities

Fix all vulnerabilities reported by `pnpm audit`. Follow each phase in order.

## Phase 1: Audit and Identify

1. Run `pnpm audit --json` and capture the output.
2. Parse the JSON to build a list of vulnerabilities with: package name, current version, patched/fixed version, severity, and the path (which top-level dependency pulls it in).
3. If there are no vulnerabilities, report that and stop.
4. Present a summary table of all findings to the user before proceeding.

## Phase 2: Upgrade Packages Directly

For each vulnerability, attempt a direct upgrade first:

1. If the vulnerable package is a **direct dependency** (in root or workspace `package.json`), run:
   ```
   pnpm update <package>@<fixed-version> --filter <workspace>
   ```
2. If it's a **transitive dependency**, run:
   ```
   pnpm update <package> --recursive
   ```
3. After all upgrades, run `pnpm audit --json` again to check which vulnerabilities remain.
4. Report what was fixed and what remains.

## Phase 3: Add Overrides for Remaining Issues

For vulnerabilities not fixed by direct upgrades:

1. Read the current `pnpm.overrides` from the root `package.json`.
2. Add override entries for the vulnerable packages pinning them to the fixed versions:
   ```json
   "pnpm": {
     "overrides": {
       "<package>": "<fixed-version>"
     }
   }
   ```
3. Run `pnpm install` to apply the overrides.

## Phase 4: Handle minimumReleaseAge Failures

If `pnpm install` fails because a package version cannot be found (error messages like `ERR_PNPM_FETCH_404`, `No matching version found`, or `package not found`), this is likely because the fixed version was published recently and is blocked by `minimumReleaseAge: 2880` in `pnpm-workspace.yaml`.

To work around this:

1. Read `pnpm-workspace.yaml` and note the current `minimumReleaseAge` value.
2. **Temporarily comment out** the `minimumReleaseAge` line (and its preceding comment lines):
   ```yaml
   # minimumReleaseAge: 2880
   ```
3. Run `pnpm install` to update the lockfile.
4. **Immediately restore** the `minimumReleaseAge` line to its original value:
   ```yaml
   minimumReleaseAge: 2880
   ```
5. Verify with `pnpm install` that the lockfile is now consistent with the age restriction re-enabled. If this second install fails, the package truly cannot be resolved — remove that override and report the issue to the user.

**CRITICAL**: Never leave `minimumReleaseAge` commented out. Always restore it, even if subsequent steps fail.

## Phase 5: Clean Up Stale Overrides

After the lockfile is updated, check whether any existing overrides in `pnpm.overrides` are now unnecessary:

1. Read the current `pnpm.overrides` from root `package.json`.
2. For each override entry, temporarily remove it and run `pnpm audit --json`.
3. If the audit still passes clean for that package (no new vulnerability), the override is stale — leave it removed.
4. If removing it reintroduces a vulnerability, restore it.
5. After testing all overrides, run a final `pnpm install` to ensure the lockfile is consistent.

Test overrides one at a time so you can isolate which ones are still needed.

## Phase 6: Final Verification

1. Run `pnpm audit` one final time and report the results.
2. Run `pnpm install --frozen-lockfile` to verify the lockfile is consistent.
3. Summarize all changes made:
   - Packages upgraded directly
   - Overrides added
   - Overrides removed (stale)
   - Any vulnerabilities that could not be fixed (and why)
