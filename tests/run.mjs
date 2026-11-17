/**
 * Test runner: bundles tests/vault.test.ts with esbuild (stubbing
 * @vicinae/api) and executes it with the node:test runner.
 *
 * Isolation from any real vault on this machine:
 * - VICINAE_TEST_SUPPORT_PATH: temp directory for vault files
 * - VICINAE_2FAS_KEY_NAMESPACE: separate Secret Service namespace
 */
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workDir = mkdtempSync(join(tmpdir(), "2fas-authenticator-test-"));
const outFile = join(workDir, "vault.test.cjs");

try {
  await build({
    entryPoints: [join(root, "tests/vault.test.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    outfile: outFile,
    alias: {
      "@vicinae/api": join(root, "tests/stubs/vicinae-api.ts"),
    },
    logLevel: "error",
  });

  const result = spawnSync(process.execPath, [outFile], {
    stdio: "inherit",
    env: {
      ...process.env,
      VICINAE_TEST_SUPPORT_PATH: workDir,
      VICINAE_2FAS_KEY_NAMESPACE: "vicinae-2fas-test",
    },
  });

  process.exitCode = result.status ?? 1;
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
