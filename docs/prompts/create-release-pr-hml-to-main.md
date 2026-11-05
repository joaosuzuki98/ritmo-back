# Release Pull Request: hml to main

Use the text below as instructions for the agent responsible for creating a release pull request from `hml` to `main`:

````text
Create a release pull request from `hml` into `main`. Include and describe every commit on `hml` since the most recent completed promotion from `hml` to `main`.

## Resolve branches and release range

1. Inspect `git status`, the current branch, and available local and remote-tracking references. Do not switch branches or modify, stage, commit, or discard working-tree changes.
2. Resolve the intended `hml` and `main` branches on the same remote. Prefer their current remote-tracking references and fetch them if needed and permitted. Verify the references are up to date before calculating the release range. If the remote or either branch is ambiguous or unavailable, stop and report the blocker rather than choosing a different branch.
3. Find the most recent merged pull request whose head is `hml` and base is `main` using the repository's GitHub workflow (for example, `gh pr list --state merged --base main --head hml`). Verify its merge time and head commit SHA. If no such pull request is available, use Git history to identify the most recent completed merge of `hml` into `main` only when its source boundary can be established unambiguously. If the previous promotion cannot be identified reliably, stop and ask how to proceed.
4. Define the release range as every commit on the resolved `hml` branch after the source/head SHA of that last merged promotion through the current `hml` tip. Verify the previous source SHA is an ancestor of the current `hml` tip; if it is not, stop and report that the range cannot be determined safely. For the first promotion, include all commits reachable from `hml` that are not already contained in `main`.
5. Inspect the complete commit list and changes in the range, not only the latest commit. Also inspect the full `hml`-to-`main` comparison that the pull request will present, so the PR accurately reflects its actual net changes. Exclude unrelated working-tree changes. If the commit range or net diff is empty, do not create an empty release PR; report that there is nothing to promote.

## Set the pull request title

- Use the project's title format `<type>: <English description>`, without a scope.
- Use `release` for this release promotion. The title must be exactly `release: Promote hml to main`.
- Do not end the title with a period.

## Write the pull request description

- Inspect the descriptions of the most recent merged release pull requests from `hml` to `main` using the repository's GitHub workflow. Follow their release-specific format, not `.github/pull_request_template.md`, which is for feature pull requests into `dev`.
- Use exactly these headings, in this order, with no additional sections:

  ```markdown
  # Description

  [Explain that this promotes the updates accumulated in `hml` since the previous completed promotion, and identify that previous PR by number.]

  # Changes

  - [Summarize a related group of changes]

  # Checklist

  - [ ] Included PRs merged into `dev`
  - [ ] Commits and diff reviewed for promotion to `hml`
  - [ ] Database schema and migrations reviewed
  - [ ] Tests, lint, and Android build passing in CI
  - [ ] App validated in `hml`
  ```

- Write the description in English. Preserve the release format's exact headings (`# Description`, `# Changes`, `# Checklist`) and their order. Do not add the feature PR template's emoji headings, `How to test`, or `Issue` sections.
- Use the full release range to prepare a concise but complete, behavior-focused summary under `# Changes`. Read the commits and diff, group related changes into bullets like the existing release PRs, and include relevant merged PR numbers in the checklist when available. Do not add a commit-by-commit SHA list unless that is how the latest release PRs format the description.
- In `# Description`, state that this promotes the updates accumulated in `hml` since the previous completed promotion and identify the previous promotion PR number. If no previous promotion exists, state that this is the first promotion.
- Mark checklist items based only on evidence. Identify included PRs accurately; review the aggregate commits and diff; inspect whether database schema or migrations changed and select the appropriate wording; check CI before marking tests, lint, and Android build as passing; and mark app validation complete only if it was actually performed. Leave unverified items unchecked and briefly report blockers or pending validation in the description when relevant, following the existing release PR style.

## Create the pull request

- Set the base/target branch to `main` and the head/source branch to `hml`, regardless of the current branch or any GitHub default.
- Create the pull request without switching branches. Do not push unless required by the repository's established PR workflow; if pushing is required, push only `hml`.
- Before creating it, verify the title, complete description, source and target branches, and that the description covers every commit in the identified release range.
- Use the repository's available GitHub workflow (for example, `gh pr create`). If the PR cannot be created, report the prepared title and description, the blocker, and any URL if one was created.
- When finished, report the PR URL, title, source and target branches, the previous promotion used as the range boundary, the commit range and count, and checks and their outcomes.
````
