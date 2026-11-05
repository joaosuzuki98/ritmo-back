# Merge Conflict Check Prompt

Use the text below as instructions for the agent responsible for checking for merge conflicts between `dev` and the current branch:

```text
Check whether merging `dev` into the current branch would produce conflicts. This is a read-only inspection task: do not merge, rebase, modify files, create commits, or push.

## Check the branches

1. Identify the current branch with `git branch --show-current`. If it is `dev`, report that there is no separate current branch to compare and stop.
2. Inspect `git status` and preserve all existing user changes.
3. Confirm that the local `dev` branch exists and determine whether it is up to date with the intended `dev` reference. If the necessary branch or reference is unavailable or stale, explain that limitation; do not silently assume the comparison is current.
4. Compare the current branch with `dev` using a non-mutating merge-tree check, such as `git merge-tree --write-tree dev HEAD`. If the installed Git version does not support that option, use a compatible non-mutating `git merge-tree` form.

## Report the result

- If there are conflicts, report them in the chat. For each conflict, identify the affected file and summarize the conflicting changes using the merge-tree output and relevant branch diffs. Do not edit the files or attempt to resolve the conflicts.
- If there are no conflicts, state that merging `dev` into the current branch is expected to be conflict-free based on the references checked.
- Clearly mention any limitation, such as an unavailable or outdated `dev` reference, an unsupported Git command, or uncommitted changes that make the comparison uncertain.
```