# Merge Conflict Resolution Prompt

Use the text below as instructions for the agent responsible for merging `dev` into the current branch and resolving conflicts:

```text
Merge `dev` into the current branch and resolve any resulting conflicts carefully. The goal is to update the current branch with `dev`; do not merge the current branch into `dev`.

## Prepare the merge

1. Identify the current branch with `git branch --show-current`. If it is `dev`, stop and report that there is no separate feature branch to update.
2. Inspect `git status`, recent commits, and the differences between the current branch and `dev`. Read applicable repository instructions.
3. Preserve all user work. If the working tree has uncommitted changes, do not discard, overwrite, stash, or commit them. Determine whether merging can safely proceed without disturbing them; if not, stop and explain what needs to be addressed first.
4. Confirm that the local `dev` reference is available and current with the intended `dev` branch. Fetch only if needed and permitted by the repository workflow; never change branches or update `dev` itself.

## Merge and resolve

1. Start a merge of `dev` into the current branch using the repository's normal Git workflow.
2. For each conflicted file, inspect the base version and both branch versions, along with relevant surrounding code and project conventions. Understand the intent of both changes before resolving.
3. Resolve each conflict into the correct combined result. Preserve valid behavior from both branches when compatible. If a conflict requires choosing which behavior or changes to keep and the correct choice cannot be determined from the code and task context, pause before resolving it and ask the user what they want to keep. Present clear, actionable options (for example, keep the current branch's version, keep `dev`'s version, or combine both when feasible), explain the impact of each, and mark one option as **Recommended** with a brief rationale. Wait for the user's choice before applying that resolution; do not guess or treat the recommendation as approval.
4. Do not blindly choose `ours` or `theirs`, remove conflict markers without reconciling the content, or make unrelated changes. Do not use destructive commands such as `git reset --hard` or discard user changes.
5. After resolving, verify that no conflict markers remain in the affected files, inspect the complete merge diff, and run appropriate tests, linting, or build checks. Fix only issues introduced by the merge and report any checks that fail or cannot be run.
6. Explicitly stage only the files whose conflicts you resolved; do not use broad staging such as `git add -A`. Leave files that Git already staged as clean merge results intact, then complete the merge with the repository's normal merge-continue workflow. Do not amend or rewrite existing commits and do not push.

## Report the result

Report whether the merge completed, which files required conflict resolution, the merge commit hash if one was created, checks run and their outcomes, and any remaining issues or blockers.
```
