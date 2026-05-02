# Branch Protection — `master`

Configure these rules at GitHub Settings → Branches → master. They are not configured in repo files; this document is the source of truth that the maintainer should mirror in the GitHub UI.

## Required rules

- Require a pull request before merging — at least 1 approving review
- Require status checks to pass — required check: `validate` (job from [.github/workflows/ci.yml](../.github/workflows/ci.yml))
- Dismiss stale pull request approvals when new commits are pushed
- Require linear history — squash or rebase merges only
- Restrict force-pushes — block force-push and branch deletion

## Bypass actor

The local [scripts/release.ts](../scripts/release.ts) runs `git push origin master` directly to land the `Release x.y.z` commit before pushing the tag. To allow this without disabling the rules:

- Add the maintainer's GitHub user as a bypass actor under "Allow specified actors to bypass required pull requests".
- Alternative: change `release.ts` to push a release branch and auto-merge a PR. More work for a single-maintainer repo and not recommended unless multiple maintainers ship releases.

## Optional / future

- Require signed commits — only enable once `release.ts` and Dependabot are configured to sign their commits. Today neither does.

## Verification

- Open a draft PR; the `validate` job runs and is required.
- `git push --force origin master` is blocked.
- `bun run release:patch` from master succeeds via the bypass actor allowlist.
