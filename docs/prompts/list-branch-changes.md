# Current Branch Change Summary Prompt

Use the text below as instructions for the agent responsible for summarizing project changes in the current Git branch:

```text
Analyze and summarize the project changes associated with the current branch. Do not modify files, stage changes, create commits, or push.

## Identify the branch and comparison point

1. Run `git branch --show-current` and `git status --short`.
2. If the current branch is exactly `main`, `dev`, or `hml`, clearly warn at the start of the response: "This is not a feature branch; the current branch is `<branch>`." Continue with the change summary where a meaningful comparison point is available.
3. Always use `dev` as the comparison branch, regardless of the current branch's upstream tracking branch. Resolve the available local or remote `dev` ref (for example, `dev` or `origin/dev`) and state which ref was used. If no `dev` ref is available, say so and ask the user to provide or fetch it; do not silently substitute another base branch.

## Inspect all relevant changes

1. Review the full commit range from the merge base of the current branch and `dev` through `HEAD`, including commit messages and the aggregate diff. This comparison must be against `dev` so changes already shared by both branches are not counted as branch-specific.
2. Also inspect the working tree: staged and unstaged diffs, changed file names, and untracked files. Inspect untracked file contents when needed to describe them accurately.
3. Distinguish committed branch changes from uncommitted working-tree changes. Do not attribute pre-existing changes to the branch's commits or omit them from the report.
4. Read relevant code and documentation for context. Summarize the actual behavior or purpose of the changes rather than merely repeating commit messages or listing filenames.

## Report

1. Begin with the current branch name and the `dev` ref/merge base used. Include the non-feature-branch warning when applicable.
2. Group related changes into concise, understandable bullets and cite the relevant file paths.
3. Separate committed changes from uncommitted changes, and identify staged, unstaged, and untracked work where present.
4. Mention verification only if checks were actually run during this task. Do not claim checks passed based on assumptions or prior runs.
5. Clearly state any limitations, such as a missing `dev` ref, and avoid claiming the summary is complete when the comparison could not be established.
```
