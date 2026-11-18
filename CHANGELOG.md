# Changelog

All notable changes to this Vicinae port are documented here. The upstream Raycast extension's history is not reproduced.

## Provenance

- Upstream: [2FAS Authenticator for Raycast](https://github.com/LockeAG/raycast-2fas-authenticator) by Adrian Galvez (LockeAG), MIT.
- Base commit: [`3627d9b15ba4506ca8c8ac9d93c4585c5d2ec7ae`](https://github.com/raycast/extensions/tree/3627d9b15ba4506ca8c8ac9d93c4585c5d2ec7ae/extensions/2fas-authenticator).
- File-level provenance: [NOTICE.md](NOTICE.md).
- Sync policy: shared-logic fixes are ported on a best-effort basis. The Linux keychain layer is maintained here and offered back upstream under MIT.

## [0.1.0] - 2026-11-17

### Ported from the Raycast original

- Search OTP, Recent OTP, Import Vault and Setup commands (unchanged UX).
- Vault format (AES-256-GCM, atomic writes), 2FAS export parsing and TOTP generation taken verbatim from the original.

### Changed for Linux

- Keychain layer rewritten for the freedesktop Secret Service API (`secret-tool`): `storeVaultKey` / `retrieveVaultKey` / `deleteVaultKey` / `isVaultKeyStored` keep their original signatures.
- Error taxonomy adapted: `KeychainToolMissing`, `KeychainServiceUnavailable`, `VaultKeyNotFound`, `VaultKeyCorrupted`, `KeychainError` replace the macOS/Windows classes.
- Setup command gained a **Keyring (Secret Service)** diagnostics section with install hints.
- Raycast-specific details mapped for Vicinae: `@vicinae/api` imports, single-object action shortcuts (`cmd` maps to Ctrl on Linux), `Icon.Exclamationmark`.
- Manifest: Vicinae schema, `platforms: ["Linux"]`, `vici` scripts.

### Removed vs. the original

- Windows DPAPI (PowerShell) path — this port targets Linux only.
- Per-access macOS Keychain authentication (exit code 36 handling) — Linux keyrings unlock at login instead.

### Tooling

- Integration test suite (`npm test`): 2FAS export parsing, RFC 6238 vectors, keychain roundtrip and vault lifecycle against a live Secret Service, with automatic skips when no provider is available. Tests run in an isolated namespace (`VICINAE_2FAS_KEY_NAMESPACE`) and temp directory so a real vault is never touched.
- Keyring namespace overridable via `VICINAE_2FAS_KEY_NAMESPACE` (production default: `vicinae-2fas-authenticator`).
