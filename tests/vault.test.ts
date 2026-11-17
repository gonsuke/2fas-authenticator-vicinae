/**
 * Integration tests: 2FAS export parsing, vault encryption roundtrip against
 * a real Secret Service, and RFC 6238 TOTP vectors.
 *
 * Run with `npm test` (tests/run.mjs bundles this file with esbuild, aliasing
 * @vicinae/api to the stub, then executes it with node:test).
 *
 * Isolation guarantees:
 * - vault files are written to a temp support directory (stubbed environment)
 * - keyring entries use a separate namespace (VICINAE_2FAS_KEY_NAMESPACE), so
 *   a real vault installed on this machine is never read, overwritten or
 *   deleted by a test run
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  parse2FASExport,
  InvalidPasswordError,
} from "../src/lib/import-2fas";
import {
  createVault,
  replaceVault,
  loadVault,
  lockVault,
  deleteVault,
  isVaultConfigured,
  type VaultService,
} from "../src/lib/vault";
import { generateTOTP } from "../src/lib/totp";
import {
  diagnoseKeychain,
  storeVaultKey,
  retrieveVaultKey,
  isVaultKeyStored,
  deleteVaultKey,
} from "../src/lib/keychain";

// --- fixtures ---------------------------------------------------------------

const PLAIN_EXPORT = {
  schemaVersion: 1,
  services: [
    {
      name: "RFC Vector",
      // base32 of the RFC 6238 test key "12345678901234567890"
      secret: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
      otp: {
        issuer: "RFC",
        account: "test@example.com",
        digits: 8,
        period: 30,
        algorithm: "SHA1",
        tokenType: "TOTP",
      },
      order: { position: 0 },
    },
    {
      name: "HOTP-only",
      secret: "AAA",
      otp: { digits: 6, period: 30, tokenType: "HOTP" }, // must be skipped
    },
  ],
};

const ENCRYPT_PASSWORD = "hunter2";

function buildEncryptedExport(): object {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(ENCRYPT_PASSWORD, salt, 10000, 32, "sha256");
  // 2FAS decrypts to a bare services array (not wrapped in {services: [...]})
  const inner = JSON.stringify([
    {
      name: "Encrypted Corp",
      secret: "JBSWY3DPEHPK3PXP",
      otp: {
        issuer: "Corp",
        account: "alice@corp.io",
        digits: 6,
        period: 30,
        algorithm: "SHA256",
        tokenType: "TOTP",
      },
    },
  ]);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([
    cipher.update(inner, "utf-8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return {
    schemaVersion: 1,
    servicesEncrypted: `${enc.toString("base64")}:${salt.toString("base64")}:${iv.toString("base64")}`,
    reference: "x.2fas",
  };
}

const PLAIN_PATH = join(environment_supportPath(), "plain.2fas");
const ENC_PATH = join(environment_supportPath(), "enc.2fas");

function environment_supportPath(): string {
  // mirror of the stubbed environment.supportPath, for fixture files
  return process.env.VICINAE_TEST_SUPPORT_PATH ?? ".";
}

writeFileSync(PLAIN_PATH, JSON.stringify(PLAIN_EXPORT));
writeFileSync(ENC_PATH, JSON.stringify(buildEncryptedExport()));

// --- parsing ----------------------------------------------------------------

test("parse plain export: TOTP kept, HOTP skipped", () => {
  const services = parse2FASExport(PLAIN_PATH);
  assert.equal(services.length, 1);
  assert.equal(services[0].name, "RFC Vector");
  assert.equal(services[0].account, "test@example.com");
  assert.equal(services[0].algorithm, "SHA1");
});

test("parse encrypted export without password throws InvalidPasswordError", () => {
  assert.throws(() => parse2FASExport(ENC_PATH), InvalidPasswordError);
});

test("parse encrypted export with password", () => {
  const services = parse2FASExport(ENC_PATH, ENCRYPT_PASSWORD);
  assert.equal(services.length, 1);
  assert.equal(services[0].account, "alice@corp.io");
  assert.equal(services[0].algorithm, "SHA256");
});

test("parse encrypted export with wrong password throws InvalidPasswordError", () => {
  assert.throws(() => parse2FASExport(ENC_PATH, "wrong"), InvalidPasswordError);
});

// --- TOTP (RFC 6238 vectors) --------------------------------------------------

test("RFC 6238 SHA1 / 8 digits, T=59 -> 94287082", () => {
  const code = generateTOTP(
    { secret: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", algorithm: "SHA1", digits: 8, period: 30 },
    59,
  );
  assert.equal(code.code, "94287082");
});

// --- keychain + vault (require a live Secret Service) -------------------------

const diagnostic = diagnoseKeychain();
const serviceReady = diagnostic.toolAvailable && diagnostic.serviceAvailable;
const skipReason = serviceReady
  ? false
  : "requires secret-tool and a running Secret Service provider";

test(
  "keychain roundtrip: store -> retrieve -> delete",
  { skip: skipReason },
  () => {
    const key = randomBytes(32);
    storeVaultKey(key);
    assert.ok(isVaultKeyStored());
    assert.ok(retrieveVaultKey().equals(key));
    deleteVaultKey();
    assert.equal(isVaultKeyStored(), false);
  },
);

test(
  "vault lifecycle: create -> load -> replace -> lock -> delete",
  { skip: skipReason },
  () => {
    const services: VaultService[] = [
      ...parse2FASExport(PLAIN_PATH),
      ...parse2FASExport(ENC_PATH, ENCRYPT_PASSWORD),
    ];

    createVault(services);
    assert.ok(isVaultConfigured());
    const vaultFile = join(environment_supportPath(), "vault.enc");
    assert.ok(existsSync(vaultFile));
    assert.equal(statSync(vaultFile).mode & 0o777, 0o600);
    assert.ok(isVaultKeyStored());

    const loaded = loadVault();
    assert.equal(loaded.length, 2);
    assert.ok(loaded.every((s) => s.secret.length > 0));

    // replace must reuse the stored key, never re-key an existing vault
    const keyBefore = retrieveVaultKey();
    replaceVault(parse2FASExport(ENC_PATH, ENCRYPT_PASSWORD));
    assert.ok(retrieveVaultKey().equals(keyBefore));
    assert.equal(loadVault().length, 1);

    // lock drops the in-memory cache; next load re-reads disk + keyring
    lockVault();
    assert.equal(loadVault().length, 1);

    deleteVault();
    assert.equal(existsSync(vaultFile), false);
    assert.equal(isVaultKeyStored(), false);
  },
);
