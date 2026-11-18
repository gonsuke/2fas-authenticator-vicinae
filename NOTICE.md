# Attribution and provenance

This repository is an **unofficial Linux/Vicinae port** of the 2FAS
Authenticator Raycast extension. It is not affiliated with or endorsed by the
original author, Raycast, or 2FAS.

## Upstream

- Original extension: **2FAS Authenticator for Raycast**
- Author: **Adrian Galvez (LockeAG)** — <https://github.com/LockeAG>
- Source: <https://github.com/LockeAG/raycast-2fas-authenticator>
- Raycast listing: <https://www.raycast.com/Lock/2fas-authenticator>
- License: MIT (see [LICENSE](LICENSE))
- Base commit:
  [`3627d9b15ba4506ca8c8ac9d93c4585c5d2ec7ae`](https://github.com/raycast/extensions/tree/3627d9b15ba4506ca8c8ac9d93c4585c5d2ec7ae/extensions/2fas-authenticator)
  (the extension directory in `raycast/extensions`, mirrored in the author's
  repository)

## Code provenance

Files taken verbatim or with only platform/import changes:

| This repository | Upstream file | Changes |
| --- | --- | --- |
| `src/lib/import-2fas.ts` | `src/lib/import-2fas.ts` | none |
| `src/lib/totp.ts` | `src/lib/totp.ts` | none |
| `src/lib/cache.ts` | `src/lib/cache.ts` | `@raycast/api` → `@vicinae/api` |
| `src/lib/vault.ts` | `src/lib/vault.ts` | `@raycast/api` → `@vicinae/api` |
| `src/lib/vault-ui.ts` | `src/lib/vault-ui.ts` | API imports and keychain error handling |
| `src/import-vault.tsx` | `src/import-vault.tsx` | API imports, form typing |
| `src/recent-otp.tsx` | `src/recent-otp.tsx` | API imports, shortcuts and icons |
| `src/search-otp.tsx` | `src/search-otp.tsx` | API imports, shortcuts and icons |
| `src/setup.tsx` | `src/setup.tsx` | API imports, keyring diagnostics, credits |

Rewritten for Linux:

- `src/lib/keychain.ts` — freedesktop Secret Service (`secret-tool`)
  implementation. The public interface and error taxonomy are based on the
  upstream keychain module.

The test suite in `tests/` is original to this port.

## Assets

- `assets/extension-icon.png` is the icon from the upstream MIT-licensed
  extension repository, not the official 2FAS logo. The official 2FAS marks use
  a shield symbol; see <https://2fas.com/press-kit>.
- No upstream store badges, screenshots or reviews are used in this repository.

## Upstream contributors

- **MushuDG** contributed Windows support to the upstream extension. That
  platform code is not included in this Linux port.

## License

All upstream code is used under the MIT license. The port modifications are
also released under the MIT license so they can be contributed back upstream.
See [LICENSE](LICENSE).
