# Changelog

All notable changes to this Vicinae port are documented here. The upstream Raycast extension's history is not reproduced.

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
