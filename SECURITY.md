# Security Policy

## Reporting a vulnerability

Please do not open a public issue for security-sensitive reports. Contact the maintainer privately (e.g. via a GitHub security advisory on this repository) and include steps to reproduce.

For issues in the upstream logic (vault format, TOTP, 2FAS parsing) also consider reporting to the original Raycast extension author, since this port shares that code.

## Threat model

### What is protected

- TOTP secrets are stored **offline only** in `vault.enc` (AES-256-GCM, random 32-byte key, random 96-bit IV per write, auth tag verified on read).
- The vault key is **not** stored on disk next to the vault. It lives in the desktop keyring through the freedesktop Secret Service API (`gnome-keyring`, KWallet, KeePassXC, ...), accessed via `secret-tool`.
- Vault writes are atomic (staging file + rename) so a crash cannot leave a vault orphaned from its key; failed re-imports leave the previous vault intact.
- OTP codes are copied to the clipboard with the `concealed` flag and never displayed beyond the launcher UI.

### What is not protected

- **Same-user local access.** Once the login keyring is unlocked (typically by PAM at login), any process running as your user can read keyring entries. This matches the original extension's Windows DPAPI (CurrentUser) path. Root compromise or another local user reading your files defeats this, as it does for every Secret Service consumer on the desktop.
- **No per-access re-authentication.** The macOS version triggers a Touch ID/password prompt on each keychain read. Linux keyrings do not offer per-read prompts through the Secret Service API; the model is "unlocked at login". Use *Lock Vault Now* to clear the in-memory cache if you step away (the keyring itself remains unlocked until you lock it).
- **Memory exposure.** Decrypted services and codes live in the extension process memory while a command is open. Node.js does not provide reliable memory zeroization; this is inherent to the original design as well.
- **Clipboard.** Copies of codes/account names persist in clipboard managers that do not filter secrets. Vicinae's own clipboard history can be disabled or configured with a denylist.

### Keyring availability

If no Secret Service provider is running, vault creation and reads fail with actionable errors and the Setup screen shows diagnostics. The extension deliberately does **not** fall back to storing the key in plaintext next to the vault.

## Data locations

| Item | Path |
| --- | --- |
| Encrypted vault | `<supportPath>/vault.enc` (+ transient `.new` staging file) |
| Vault key | Secret Service item with attributes `application=vicinae-2fas-authenticator`, `type=vault-key` (namespace overridable via `VICINAE_2FAS_KEY_NAMESPACE`, used by the test suite) |
| Recents cache | Vicinae LocalStorage (non-sensitive: ids, display names, timestamps, pins) |
