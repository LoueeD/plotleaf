# Releasing plotleaf

Use the npm registry and a Node-compatible package. Bun is a maintainer tool, not a consumer prerequisite. Current public examples are the explicitly fictional storefront and adoption reports. Internal-project demos and owner-supplied design screenshots do not belong in a release.

Before publishing, run the repository typechecks, build, core tests and browser suite.

The owner must also complete a manual visual review of the running preview. Keep publication paused while that review is pending, including after a renderer fix. Automated checks and agent screenshot inspection are supporting evidence, not owner acceptance. Any renderer change invalidates the previously reviewed artifact: rebuild, audit and test the replacement before a future publish.

After the visual review, pack once into the ignored release directory:

```bash
mkdir -p .cache/releases
npm pack --ignore-scripts --pack-destination .cache/releases
node scripts/audit-package.mjs .cache/releases/plotleaf-0.1.0.tgz
PLOTLEAF_PACKAGE_TARBALL="$PWD/.cache/releases/plotleaf-0.1.0.tgz" bun run test:consumer
```

The audit enumerates every file, checks all public example reports identify fictional data, rejects internal demo context/local paths/source maps/credential-shaped strings and records SHA-512 integrity. Manually review the README, examples, metadata, compiled CLI/runtime and license notices. The approved list deliberately excludes source tests, generated report HTML, caches, reference images and development/planning documents. Change it only for an intentional public addition. Pattern checks cannot replace content review.

Check the logged-in npm identity, live name/version and authentication. Publish the exact audited/tested archive:

```bash
npm whoami --registry=https://registry.npmjs.org/
npm publish .cache/releases/plotleaf-0.1.0.tgz --access public --tag latest --registry=https://registry.npmjs.org/
```

Use npm's interactive authentication if required; never place account credentials or OTP values in project files. After publication, verify registry integrity against the reviewed archive and run an independent `npx --yes plotleaf@0.1.0` validation/build/preview from a temporary directory with no Bun on PATH. Update local delivery status only after registry success. Do not republish or change an existing version's contents.

Source repository creation, GitHub release pages and automatic publishing workflows are separate tasks; there is no configured Git remote in this checkout yet.
