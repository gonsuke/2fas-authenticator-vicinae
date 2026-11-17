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

## Development

```bash
npm install
npx vici develop   # or: npm run dev
```

Build checks:

```bash
npm run build
npm run lint
```

## Credits

- Original extension: [2FAS Authenticator for Raycast](https://github.com/raycast/extensions/tree/main/extensions/2fas-authenticator) by Lock (Adrian Galvez), MIT licensed.
- [Vicinae](https://github.com/vicinaehq/vicinae) — Raycast-compatible launcher for Linux.
