# Releasing plotleaf

Use the npm registry and a Node-compatible package. Bun is a maintainer tool, not a consumer prerequisite. Current public examples are the explicitly fictional storefront, adoption, onboarding and catalogue reports, plus their cumulative showcase. Internal-project demos and owner-supplied design screenshots do not belong in a release.

Current public release: **0.3.1 / agent discovery**, published on 8 November 2026 after owner authorization and final release verification. The renderer is unchanged from owner-approved M4/0.3.0. See the [release record](releases/0.3.1.md) for exact source, CI, archive integrity and public verification. [M4 contracts](m4-rich-tables.md) cover local image/sparkline cells and the cumulative review report. Use a new version for every subsequent publication.

Before publishing, run the repository typechecks, build, core tests and browser suite.

The owner must also complete a manual visual review of the running preview. Keep publication paused while that review is pending, including after a renderer fix. Automated checks and agent screenshot inspection are supporting evidence, not owner acceptance. Any renderer change invalidates the previously reviewed artifact: rebuild, audit and test the replacement before a future publish.

After the visual review, pack once into the ignored release directory:

```bash
mkdir -p .cache/releases
npm pack --ignore-scripts --pack-destination .cache/releases
node scripts/audit-package.mjs .cache/releases/plotleaf-0.1.0.tgz
PLOTLEAF_PACKAGE_TARBALL="$PWD/.cache/releases/plotleaf-0.1.0.tgz" bun run test:consumer
```

The audit pins the exact hashes of approved example rasters and enumerates every file, checks all public example reports identify fictional data, rejects internal demo context/local paths/source maps/credential-shaped strings and records SHA-512 integrity. Manually review the README, examples, metadata, compiled CLI/runtime and license notices. The approved list deliberately excludes source tests, generated report HTML, caches, reference images and development/planning documents. Change it only for an intentional public addition. Pattern checks cannot replace content review.

Check the logged-in npm identity, live name/version and authentication. Publish the exact audited/tested archive:

```bash
npm whoami --registry=https://registry.npmjs.org/
npm publish .cache/releases/plotleaf-0.1.0.tgz --access public --tag latest --registry=https://registry.npmjs.org/
```

Use npm's interactive authentication if required; never place account credentials or OTP values in project files. After publication, verify registry integrity against the reviewed archive and run an independent `npx --yes plotleaf@0.1.0` validation/build/preview from a temporary directory with no Bun on PATH. Update local delivery status only after registry success. Do not republish or change an existing version's contents.

## Source and CI gate

Public source lives at [LoueeD/plotleaf](https://github.com/LoueeD/plotleaf). Before a future release, require a passing [verification workflow](https://github.com/LoueeD/plotleaf/actions/workflows/ci.yml) for the exact source commit: Linux/Windows consumers on Node 22/24/26, compiler/security/watch tests and Chromium/WebKit checks. CI never publishes. Manual owner visual review remains a separate release gate.

Use a new version for changes after `0.1.0`; the examples above show the original release, so substitute the candidate version in every archive/command. Record the source commit, owner review, audit integrity and CI run with each release. Tag the approved source without moving existing tags, then publish that exact archive. Once published, independently verify the public archive and installed command.

The immutable `v0.1.0` tag reproduces all 18 original published files. Its pinned-archive comparison runs in CI through `scripts/verify-published.mjs`. Repository metadata added after that baseline is included in 0.2.0; it does not alter the published `0.1.0` package. GitHub release pages and automatic npm publication are not required.
