# Contributing

Thanks for helping with the Vicinae port. This is an unofficial Linux port of
the [2FAS Authenticator Raycast extension](https://github.com/LockeAG/raycast-2fas-authenticator)
by Adrian Galvez (LockeAG), used under MIT. Please keep the upstream provenance
intact when changing shared code.

## Where to report

- **Port-specific issues** (Secret Service/keyring, Vicinae APIs, build and
  install): open an issue in this repository.
- **Shared logic** (2FAS export parsing, TOTP generation, vault format): please
  also report upstream at
  <https://github.com/LockeAG/raycast-2fas-authenticator/issues>. Fixes there
  benefit both projects.
- **Security**: do not open a public issue. Follow [SECURITY.md](SECURITY.md)
  and use GitHub's private advisory form.

## Upstream sync

The current upstream base is recorded in [NOTICE.md](NOTICE.md),
[CHANGELOG.md](CHANGELOG.md) and the commit trailers.

1. Fetch the upstream extension directory at the current (or a newer) commit
   from `raycast/extensions` or `LockeAG/raycast-2fas-authenticator`.
2. Diff the shared files against upstream, starting with
   `src/lib/import-2fas.ts`, `src/lib/totp.ts`, `src/lib/vault.ts` and
   `src/lib/cache.ts`.
3. Keep Linux-specific code in `src/lib/keychain.ts` and Vicinae API changes in
   the UI files, so shared files stay easy to compare.
4. Update the base commit in `NOTICE.md` and `CHANGELOG.md` when you sync.
5. Run `npm test`, `npx tsc --noEmit` and `npm run lint`.

## Commit trailers

When porting or syncing upstream code, add these trailers to the commit
message:

```text
Based-on: https://github.com/raycast/extensions/tree/<commit>/extensions/2fas-authenticator
Original-author: Adrian Galvez (LockeAG)
```

Keep the original copyright notice in [LICENSE](LICENSE) and do not remove the
per-file provenance headers.

## License

By contributing, you agree that your changes are released under the MIT
license, so they can be contributed back upstream.
