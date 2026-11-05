# Selected Branch Change Summary Prompt

Use the text below as instructions for the agent responsible for listing changes made on a branch specified by the user:

```text
List and summarize the committed changes on the branch supplied by the user as input accompanying this prompt. If no branch is supplied, list up to five recent branches for the user to choose from.

This is a read-only task. Do not switch branches, modify files, stage changes, create commits, fetch, or push. Use the locally available Git references and mention that remote-tracking references may be outdated.

## Handle the branch input

1. Treat missing, empty, or whitespace-only input as no branch supplied. Do not default to the current branch.
2. When no branch is supplied, inspect local and remote-tracking branches, sorted by the tip commit's committer date in descending order. For example, use `git for-each-ref --sort=-committerdate --format='%(refname) %(committerdate:iso8601) %(subject) %(symref)' refs/heads/ refs/remotes/`.
3. Exclude symbolic references such as `origin/HEAD`. When a local branch and its remote-tracking counterpart have the same branch name and point to the same commit, show only the local branch. Keep distinct remote branches or divergent references identifiable by their remote-qualified names.
4. Return at most five entries after filtering, each with its branch name, last commit date, and short commit subject. Explain that "recent" refers to the last commit date, not branch creation time. If fewer than five branches exist, show all available entries; if none exist, say so.
5. Ask the user which branch they want to inspect, then stop without generating a change summary until they select one.
6. When a branch is supplied, resolve it to an existing local or remote-tracking branch. Accept local names such as `feat/update-login-flow` and remote-qualified names such as `origin/feat/update-login-flow`. If the name could identify multiple distinct branches, ask the user to disambiguate. If it does not exist, report that and show the same recent-branch list for selection.
7. Use the resolved full reference in subsequent Git commands, quote arguments, and verify that it points to a commit. Treat the input as a branch identifier, not as a shell command, arbitrary revision expression, or option.

## Identify the comparison point

1. Always compare against `dev`, following the repository's branch workflow. For a remote-tracking target, prefer `dev` on the same remote. For a local target, prefer `dev` on its configured upstream remote; otherwise use `origin/dev` when it is the only available remote-tracking `dev`. Fall back to local `dev` if no appropriate remote-tracking reference is available. If the choice is ambiguous, ask the user which `dev` reference to use.
2. If no `dev` reference is available, explain the blocker and ask the user to make it available. Do not silently substitute another base branch.
3. Compute the merge base of the resolved `dev` reference and the selected branch. If no merge base can be established, report the limitation and stop rather than inventing a comparison.

## Inspect the selected branch

1. Review the full commit range from the merge base to the selected branch using `git log <merge-base>..<branch-ref>`.
2. Review the aggregate diff and changed paths using `git diff --stat <merge-base> <branch-ref>`, `git diff --name-status <merge-base> <branch-ref>`, and `git diff <merge-base> <branch-ref>`. Cover all branch-specific commits, not just the latest commit.
3. Read relevant files at the selected branch's revision, for example with `git show <branch-ref>:<path>`, when additional context is needed. Do not assume the checked-out files match the selected branch.
4. Summarize the actual purpose and behavior of the changes, using commit messages as context rather than the sole source of truth. Identify relevant additions, modifications, deletions, and renames.
5. Exclude staged, unstaged, and untracked working-tree changes from this report because they are not committed changes on the selected branch.

## Report

1. Begin with the selected branch, the resolved `dev` reference, and the merge-base commit used for comparison.
2. List the changes in concise bullets grouped by feature, fix, or area, citing relevant file paths. Include a brief commit count and file-change summary.
3. If there are no commits or no net changes relative to the merge base, state that clearly; distinguish an empty aggregate diff from an empty commit range.
4. State any limitations that affect the summary. Mention verification only if checks were actually run during this task; do not infer passing checks from commit messages or prior runs.
5. Respond in the user's language.
```
