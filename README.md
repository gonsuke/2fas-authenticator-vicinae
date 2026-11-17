# 2FAS Authenticator (Vicinae)

Search and copy 2FA (TOTP) codes from your [2FAS Authenticator](https://2fas.com/) export, stored offline in an encrypted local vault.

This is a **Linux port** of the [Raycast extension by Lock (Adrian Galvez)](https://github.com/raycast/extensions/tree/main/extensions/2fas-authenticator) for [Vicinae](https://vicinae.com/). All vault logic, TOTP generation and UI come from the original extension; the platform-specific keychain layer was replaced with a Linux equivalent.

## How it works

- Export your tokens from the 2FAS mobile app (`Settings > 2FAS Backup > Export`), optionally protected with a password.
- Import the `.2fas` file once with the **Import Vault** command. Services are re-encrypted with a random AES-256-GCM key and written to `vault.enc` under the extension's support directory.
- The vault key is stored in your **system keyring** via the freedesktop Secret Service API, so the file on disk is useless without it.
- **Search OTP** / **Recent OTP** generate codes locally with RFC 6238 (SHA-1/256/512, 5–10 digits, custom periods supported). Codes never leave your machine.

## Requirements

| Dependency | Purpose | Notes |
| --- | --- | --- |
| Secret Service provider | Vault key storage | `gnome-keyring` (GNOME), `kwalletd` + Secret Service layer (KDE) or KeePassXC with Secret Service integration |
| `secret-tool` | Keyring access from the extension | Debian/Ubuntu: `libsecret-tools`, Arch/Fedora: `libsecret` |

The login keyring is normally unlocked by PAM at login, so no prompt appears during use. If your keyring is locked, a desktop unlock prompt appears when the vault is first accessed; dismissing it is reported as a missing key.

The **Setup** command shows a live diagnostic of all three pieces (libsecret tools, Secret Service provider, stored vault key) with install hints when something is missing.

## Commands

- **Search OTP** — live TOTP list with 1-second refresh, expiry coloring, copy code/account, pin services
- **Recent OTP** — recently used services first, pins, cleanup of stale entries
- **Import Vault** — parse a `.2fas` export (encrypted or plain) into the vault; re-import replaces the vault atomically and keeps the old one on any failure
- **Setup** — vault status, keyring diagnostics, lock/delete vault

## Security notes

- Secrets are generated and used locally; nothing is sent over the network.
- Vault file: AES-256-GCM with a random 32-byte key, atomic writes (`vault.enc.new` + rename), `0600` permissions.
- Key storage relies on your desktop keyring's threat model, which is equivalent to the Windows DPAPI path of the original extension (per-user, per-boot unlock). Unlike the macOS version, codes retrieval does not re-prompt per access; use **Lock Vault Now** to drop the in-memory cache.
- See [SECURITY.md](SECURITY.md) for details and responsible disclosure.

## Building

```bash
npm install
npm run build
```

`npm run build` (vici build) type-checks the sources and installs the bundle into Vicinae's extension directory (`~/.local/share/vicinae/extensions/2fas-authenticator`). Exported commands become searchable in the root search immediately — no server restart required. Pass `-o <dir>` to write the bundle elsewhere (e.g. for CI artifacts) instead of installing.

Other checks:

```bash
npm run lint          # manifest validation (vici lint)
npx tsc --noEmit      # type-check only
npm run format        # biome format
```

## Testing

```bash
npm test
```

Runs the integration suite (node:test, bundled with esbuild via `tests/run.mjs`):

- 2FAS export parsing: plain exports, password-protected exports (PBKDF2 + AES-256-GCM), wrong password rejection, HOTP-only entries skipped
- RFC 6238 test vectors (e.g. SHA-1 / 8 digits at T=59 → `94287082`)
- Keychain roundtrip against a real Secret Service: store → retrieve → delete
- Vault lifecycle: create → load → replace (key reuse) → lock → delete, including `0600` file permissions

Requirements: `secret-tool` and a running Secret Service provider. If either is missing, the keychain/vault tests are **skipped automatically** with a hint instead of failing, so the suite is still usable in minimal CI environments.

**Your real vault is never touched by tests.** The suite writes vault files to a throwaway temp directory and uses a dedicated keyring namespace (`application=vicinae-2fas-test`) instead of the production one, so a vault you already imported stays untouched.

## Installing into Vicinae

### From this source tree

```bash
git clone <this-repo> 2fas-authenticator
cd 2fas-authenticator
npm install
npm run build
```

That's it — open Vicinae's root search and look for **Search OTP**, **Recent OTP**, **Import Vault** or **Setup**. No restart needed.

### Development mode

```bash
npm run dev    # or: npx vici develop
```

Starts a development session with hot reload. Note that a dev session and an installed (built) copy are treated as two separate extensions — running both shows duplicates in the UI, so uninstall one of them first.

### From the Vicinae store

Not published yet. The intended route is a PR to the [vicinaehq/extensions](https://github.com/vicinaehq/extensions) store repository; until then, install from source as above.

### Uninstall

Search **Uninstall Extension** in the root search, or delete `~/.local/share/vicinae/extensions/2fas-authenticator`. Deleting the extension does not remove your vault; use *Setup → Delete Vault* first if you want the encrypted vault file and the keyring entry gone too.

## First run

1. **Setup** — check the *Keyring (Secret Service)* diagnostics: libsecret tools, Secret Service provider and vault key should all be green (install hints are shown otherwise).
2. **Import Vault** — pick your `.2fas` export file and enter the export password if you set one.
3. **Search OTP** — live codes with 1-second refresh; Enter copies the code and closes the window.

## Credits

- Original extension: [2FAS Authenticator for Raycast](https://github.com/raycast/extensions/tree/main/extensions/2fas-authenticator) by Lock (Adrian Galvez), MIT licensed.
- [Vicinae](https://github.com/vicinaehq/vicinae) — Raycast-compatible launcher for Linux.
