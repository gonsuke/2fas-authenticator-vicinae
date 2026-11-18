# 2FAS Authenticator (Vicinae)

> **Unofficial Linux port.** This is a community port of the
> [2FAS Authenticator Raycast extension](https://github.com/LockeAG/raycast-2fas-authenticator)
> by [Adrian Galvez (LockeAG)](https://github.com/LockeAG), used under the MIT
> license. It is not affiliated with or endorsed by the original author,
> Raycast, or 2FAS. If you are on macOS or Windows, use the
> [original extension](https://www.raycast.com/Lock/2fas-authenticator).

Search and copy 2FA (TOTP) codes from your [2FAS Authenticator](https://2fas.com/) export, stored offline in an encrypted local vault.

This is a **Linux port** of the [Raycast extension by Adrian Galvez (LockeAG)](https://github.com/LockeAG/raycast-2fas-authenticator) for [Vicinae](https://vicinae.com/). Most vault logic, TOTP generation and UI come from the original extension (base commit [`3627d9b`](https://github.com/raycast/extensions/tree/3627d9b15ba4506ca8c8ac9d93c4585c5d2ec7ae/extensions/2fas-authenticator), MIT); the platform-specific keychain layer was replaced with a Linux equivalent. See [NOTICE.md](NOTICE.md) for file-level provenance.

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

Not submitted. This repository is a source-only port; install from source as
described above. If it is ever submitted, the listing will be clearly marked as
an unofficial port.

### Uninstall

Search **Uninstall Extension** in the root search, or delete `~/.local/share/vicinae/extensions/2fas-authenticator`. Deleting the extension does not remove your vault; use *Setup → Delete Vault* first if you want the encrypted vault file and the keyring entry gone too.

## First run

1. **Setup** — check the *Keyring (Secret Service)* diagnostics: libsecret tools, Secret Service provider and vault key should all be green (install hints are shown otherwise).
2. **Import Vault** — pick your `.2fas` export file and enter the export password if you set one.
3. **Search OTP** — live codes with 1-second refresh; Enter copies the code and closes the window.

## Upstream and provenance

- Upstream source: [LockeAG/raycast-2fas-authenticator](https://github.com/LockeAG/raycast-2fas-authenticator)
  (also published in the [Raycast store](https://www.raycast.com/Lock/2fas-authenticator)).
- Base commit: [`3627d9b15ba4506ca8c8ac9d93c4585c5d2ec7ae`](https://github.com/raycast/extensions/tree/3627d9b15ba4506ca8c8ac9d93c4585c5d2ec7ae/extensions/2fas-authenticator).
- File-level provenance and the list of verbatim files: [NOTICE.md](NOTICE.md).
- License: [MIT](LICENSE), with the original copyright notice retained.

Upstream is tracked on a best-effort basis. Security fixes to shared logic will
be ported when they apply and noted in [CHANGELOG.md](CHANGELOG.md). The Linux
keychain layer is deliberately isolated and MIT-licensed so it can be
contributed back upstream if the original author wants Linux support.

## Contributing back

- **Shared logic** (2FAS export parsing, TOTP generation, vault format): please
  also report or fix upstream at
  [LockeAG/raycast-2fas-authenticator](https://github.com/LockeAG/raycast-2fas-authenticator/issues).
- **Port-specific issues** (Secret Service/keyring, Vicinae APIs, installation):
  open an issue in this repository.
- Security reports: follow [SECURITY.md](SECURITY.md) and use a private advisory.
- Do not copy upstream store badges, screenshots or reviews into this
  repository; take your own screenshots if needed.
- Upstream sync steps and commit-trailer conventions are in
  [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

- Original extension: [2FAS Authenticator for Raycast](https://github.com/LockeAG/raycast-2fas-authenticator)
  by [Adrian Galvez (LockeAG)](https://github.com/LockeAG), MIT. Also on the
  [Raycast store](https://www.raycast.com/Lock/2fas-authenticator).
- Windows support in the upstream extension: MushuDG (not included in this
  Linux port).
- [Vicinae](https://github.com/vicinaehq/vicinae) — Raycast-compatible launcher for Linux.

## License

MIT. The original copyright notice is retained; see [LICENSE](LICENSE) and
[NOTICE.md](NOTICE.md).
