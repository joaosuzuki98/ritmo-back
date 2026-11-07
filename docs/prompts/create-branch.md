# Branch Creation Prompt

Use the text below as instructions for the agent responsible for creating a new branch:

```text
Create a new local branch based on the latest `dev` branch from the appropriate remote. The user provides a natural-language description of what they intend to do on the new branch. Infer the branch type and name from that description.

## Interpret the input and choose the branch name

1. Read the user's description of the intended work. If it is missing or too vague to identify the goal, ask what they intend to do; do not ask them to supply a branch name or type.
2. Follow any documented repository branch-naming convention. Otherwise, use `<type>/<short-description>` and select the type that best matches the primary intent:
   - `feat`: add or change user-facing functionality or behavior.
   - `fix`: correct a bug or broken behavior.
   - `refactor`: restructure code without changing its behavior.
   - `perf`: improve performance.
   - `docs`: add or update documentation.
   - `test`: add or update tests.
   - `ci`: change continuous integration workflows.
   - `build`: change build tooling or dependencies.
   - `chore`: other maintenance work.
3. Generate a concise, descriptive name in English using lowercase kebab-case after the type prefix. Base it only on the stated intent; do not invent issue numbers or extra scope. When multiple types could apply, choose the one that best represents the main goal, asking for clarification only if the intent cannot reasonably be inferred.
4. For example, `I will change the login flow` becomes `feat/update-login-flow`; `I'm going to fix login errors` becomes `fix/login-error` and so on.
5. Validate the generated name with `git check-ref-format --branch <branch-name>`. If it is invalid, adjust it and validate again.

## Inspect the repository and check for conflicts

1. Inspect the current branch, configured remotes, and `git status`. Review staged, unstaged, and untracked changes so you know what must be preserved.
2. If a local branch or remote branch with the generated name already exists, do not reset, overwrite, or reuse it. Choose another descriptive name derived from the same intent, or append a numeric suffix such as `-2`, then validate it and check for conflicts again.

## Update the remote `dev` reference

1. Identify the repository's appropriate remote (use the current branch's upstream remote when clearly configured, otherwise use `origin` if it is the only appropriate remote). If the correct remote is ambiguous, ask the user which remote to use.
2. Fetch the latest `dev` from that remote and verify the resulting remote-tracking reference, such as `<remote>/dev`.
3. Do not check out, pull into, reset, or otherwise update the local `dev` branch or its working tree. Fetching the remote reference must not alter files in the worktree. Never base the new branch on a stale local `dev` when the fetched remote-tracking branch is available.
4. If the fetch fails or the remote `dev` branch cannot be verified, stop without creating the branch and report the issue.

## Create the branch safely

1. Create the new branch from the fetched remote-tracking `dev` reference, not from the current branch. For example, use `git switch -c <branch-name> <remote>/dev` when it is safe to switch.
2. Preserve every pre-existing change in the working tree, including staged, unstaged, and untracked files. Do not edit, stage, discard, stash, commit, or overwrite any such changes.
3. If the working tree is not clean, do not switch the checked-out branch, because doing so could carry or disturb existing work. Create only the branch reference from `<remote>/dev` (for example, `git branch <branch-name> <remote>/dev`) and leave the current branch and all files untouched. Tell the user the branch was created but not checked out.
4. If switching would overwrite or conflict with any existing file, do not force it. Leave the current branch and files untouched; if appropriate, keep only the newly created branch reference and tell the user it was not checked out.
5. Do not push the new branch.

## Verify and report

- Verify that the new branch points to the same commit as the fetched `<remote>/dev` reference.
- If it was safe to switch, verify that the new branch is checked out. Otherwise, verify that the original branch remains checked out and the worktree changes are preserved.
- Report the user's intended goal, the selected branch type and name with a brief rationale, its base remote and commit, whether it was checked out, and any preserved working-tree changes or blockers.
```
