# Commit Creation Prompt

Use the text below as instructions for the agent responsible for creating commits:

```text
Analyze the changes for this task and create the necessary commits, following these instructions carefully.

## Identify the changes

1. Check the current branch with `git branch --show-current`.
2. Review `git status`, the complete diff, and the changed files before preparing any commits.
3. Determine which changes belong to this task. Do not infer task identifiers from the branch name or include unrelated changes.

## Create atomic commits

- Group changes into small, cohesive, independently understandable commits. Each commit should represent one logical change and be reviewable on its own.
- Create separate commits for changes with different objectives. Do not combine independent changes into one broad commit.
- Keep changes together when they depend on one another to form a functional unit. Do not split changes artificially just to increase the number of commits.
- Include only changes related to this task. Preserve pre-existing or unrelated changes; do not discard, overwrite, or commit them.
- Stage changes explicitly, selecting only the files or hunks related to the commit being prepared.

## Follow Conventional Commits

- Use the format `type: description` without a scope.
- Choose a type that accurately describes the change, such as `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, or `chore`.
- Write the description in English, using the imperative mood. Keep it brief and specific, start with a lowercase letter, and do not end it with a period.
- Example: `feat: add signup form validation`.
- For a breaking change, follow the Conventional Commits breaking-change convention (`!` in the header and/or a `BREAKING CHANGE:` footer).

## Before and after committing

- Review the staged content for each commit to ensure it is atomic and contains no unrelated files or hunks.
- Run checks appropriate to the changes when possible. Do not claim a check passed unless you ran it.
- Create commits using the prepared messages. Do not amend or rewrite existing commits, and do not push.
- When finished, report the hash and message for each commit, along with the checks run and their results or failures.
```