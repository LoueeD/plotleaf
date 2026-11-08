# Source and CI foundation

Recorded: 8 November 2026. Public source: [LoueeD/plotleaf](https://github.com/LoueeD/plotleaf). The existing npm release remains `plotleaf@0.1.0`; this milestone does not publish another package version or add report components.

## Release traceability

The annotated [v0.1.0 tag](https://github.com/LoueeD/plotleaf/tree/v0.1.0) points to source baseline `64cb62e`. Building that checkout with Bun 1.4.4 reproduces all 18 files in the published npm archive byte for byte. The check verifies the recorded SHA-512 before comparing contents; it does not promise identical gzip container metadata from a new `npm pack` command.

```bash
bun install --frozen-lockfile
bun run build
node scripts/verify-published.mjs
```

Run those commands from a separate clone of the tag, not by resetting an active checkout. The optional argument to `verify-published.mjs` is a previously downloaded archive. The verifier and archive integrity are preserved in the tag; CI rebuilds that immutable baseline independently of main.

Source/issue metadata and contributor documentation were added after the release baseline. They will enter npm with a new version. Never move `v0.1.0` or republish the existing version to retrofit repository metadata.

## Verification

The [workflow](../.github/workflows/ci.yml) builds on Linux, checks both type checkers and generated files, runs core tests, and audits one npm archive. All six Node 22/24/26 consumer jobs install that same archive on Linux/Windows without Bun or dev dependencies. Windows core tests and Linux/Windows Chromium/WebKit jobs use the same prebuilt assets. GitHub Actions are pinned to verified commits, workflow permissions are read-only, and no step publishes to npm.

[Verification run 42482279708](https://github.com/LoueeD/plotleaf/actions/runs/42482279708) passed all 11 jobs for source commit `720eea1` on 8 November 2026.

| Evidence | Result |
| --- | --- |
| Linux build | Official TypeScript and TSRS pass; 46 core tests pass; schema/notices have no drift; exact 18-file package audit passes. |
| Published baseline | `v0.1.0` rebuild matches all 18 public archive files byte for byte after verifying the pinned SHA-512. |
| Shared-archive consumers | Six successful jobs: Linux and Windows × Node 22, 24, 26; installed npm/npx validate/build/preview without Bun or dev dependencies. |
| Windows core | 45 pass, 1 explicit POSIX named-pipe skip, 0 failures; Node preview/watch recovery and file protections pass. |
| Linux browsers | 14 Chromium/WebKit tests pass, including offline interaction, sorting, themes, hostile strings, currency widths and preview recovery. |
| Windows browsers | The same 14 Chromium/WebKit tests pass. |

The portable harness normalizes tar listing line endings, builds a Windows PATH with system utilities and no Bun, and uses directory junctions for the Windows escape fixture. Bun on Windows reports a SIGTERM-terminated child with a null exit code and a signal; cleanup accepts that termination result and asserts that the preview server is unreachable. CI installs browser/system dependencies on Linux and browser binaries directly on Windows, retaining Playwright dependency validation and both browser suites. See [Playwright CI guidance](https://playwright.dev/docs/ci). Runtime/renderer code did not need changing.

Local macOS arm64 checks also pass: both type checkers, 46 core tests, 14 Chromium/WebKit tests and Node 22 consumer verification of the original public archive. These supplement the remote platform results; they are not cross-machine performance measurements.

Windows explicitly skips the POSIX FIFO fixture. Directory-junction escape, file-symlink/hardlink overwrite protection, deterministic export and watcher recovery remain in its core suite. These checks do not establish automatic browser-opening behaviour or support for every Windows version; headless suites use `--no-open`.

## Public content and release review

Source tracking excludes caches, generated HTML, build output, local account/tool settings and owner-supplied reference images. The images remain local; [the written contract](design-reference.md) and fictional examples are public. The initial 63-file source baseline was inspected for excluded files, local machine paths and credential-shaped content before push. The separate npm audit still enforces its exact 18-file list and fictional-example requirement. Pattern checks support manual review; they do not guarantee absence of every possible secret.

The [release procedure](release.md) requires passing CI for the candidate source, the exact-archive audit/consumer check and the owner's manual review of renderer changes in the running preview. Tests and agent screenshot inspection do not approve publication. Any renderer change after approval requires another review of the replacement artifact.

The next product increment remains a narrowly scoped visualization/table slice. Filters require a concrete prepared-view transition fixture first; maps, reusable compositions and broader platform features remain staged in [the roadmap](product-roadmap.md).
