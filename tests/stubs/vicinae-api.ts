/**
 * Test double for @vicinae/api used by the integration tests.
 *
 * Bundled in via esbuild's alias option by tests/run.mjs. The support path is
 * a throwaway directory so tests never touch a real vault under the Vicinae
 * data directory.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const environment = {
  supportPath:
    process.env.VICINAE_TEST_SUPPORT_PATH ??
    mkdtempSync(join(tmpdir(), "2fas-vault-test-")),
};

export const LocalStorage = {
  /* not exercised by the vault/keychain integration tests */
};
