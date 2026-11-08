# Contributing to plotleaf

Read [AGENTS.md](AGENTS.md) for the architecture, language, security and design boundaries. Keep changes focused and update the generated component specification whenever the registry changes. Users run Node 22+ through `npx plotleaf`; Bun is only a maintainer dependency.

## Local workflow

Install Bun 1.4.4 and Node 22+, then run:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run typecheck:tsrs
bun run build
bun test
bun run test:consumer
node node_modules/@playwright/test/cli.js install chromium webkit
bun run test:browser
git diff --exit-code -- schema/components.json THIRD_PARTY_NOTICES.txt
```

Build before integration checks. Official TypeScript is authoritative; TSRS is an additional candidate check. Consumer checks use npm, install only production dependencies and remove Bun from PATH. `PLOTLEAF_NODE` selects the actual Node executable for core/browser subprocesses. `PLOTLEAF_PACKAGE_TARBALL` selects an already packed archive; `PLOTLEAF_OFFLINE=1` uses a previously warmed npm cache.

Use `bun run format` for code/configuration. Do not run an ordinary Markdown formatter over report directives: leaf directives must retain one line, and nested containers require their longer outer fences.

## Continuous integration

The [verification workflow](.github/workflows/ci.yml) runs on pushes to `main`, pull requests and manual dispatch. Actions are pinned to verified commit SHAs; the workflow has read-only repository permissions and never publishes to npm.

| Check | Platform | Runtime |
| --- | --- | --- |
| TypeScript, TSRS, build, core/Node integration, generated-file drift and package audit | Linux | Bun 1.4.4 / Node 22 |
| Same audited npm archive: installed `npx` validate/build/preview without Bun or dev dependencies | Linux and Windows | Node 22, 24, 26 |
| Compiler/security and Node preview/watch recovery | Windows | Bun 1.4.4 / Node 22 |
| Offline `file://` reports, tooltips, sorting, themes, narrow currency layout, preview recovery | Linux and Windows | Chromium and WebKit / Node 22 |
| `v0.1.0` source build compared byte for byte with the public archive and pinned SHA-512 | Linux | Bun 1.4.4 / Node 22 |

The Linux build creates one audited archive used by all six consumer jobs. Browser and Windows core jobs use the same prebuilt assets. CI uploads the package audit and browser failure artifacts for inspection. A POSIX named-pipe test is explicitly skipped on Windows; symlink/junction and hardlink protections remain tested there. Windows process termination differs from POSIX signals, so the test harness accepts forced termination as an exit status or a SIGTERM event and asserts that the server has closed.

## Source and release traceability

The annotated `v0.1.0` tag preserves the source that reproduces the 18 published files. From that tag, after installing/building, run `node scripts/verify-published.mjs`. It downloads the public archive, checks its recorded integrity and compares every file. An optional archive path allows an offline comparison. Run it from a separate clone when working on later changes; do not reset an active checkout or move the release tag.

Main may contain unreleased changes while `package.json` still names the last published version. Bump the version before packing a new release and create an immutable tag for that reviewed source. Follow [the release procedure](docs/release.md); publish the exact audited/tested archive, with no automatic npm publishing workflow.

## Design and public content

The [written design contract](docs/design-reference.md) and fictional examples describe the established visual direction. Owner-supplied screenshots are local, ignored references and are not redistributed. Do not add internal/customer reports, local settings, credentials, generated HTML or caches to source or package artifacts.

Every renderer change requires the owner's manual review of the running preview before a release. Automated tests and contributor screenshot inspection support that review. They do not approve publication. A renderer change after approval requires review of the replacement artifact.
