# Pull Request Creation Prompt

Use the text below as instructions for the agent responsible for creating a pull request:

````text
Analyze the changes for this task and create a pull request, following these instructions carefully.

## Review the changes

1. Check the current branch with `git branch --show-current` and review `git status`.
2. Review the commits and complete diff for this branch against `dev`. Identify the purpose of the changes and any checks already run or still needed.
3. Do not include unrelated or pre-existing changes in the pull request. Preserve the working tree and do not rewrite commits.

## Set the pull request title

- Use the format `<type>: <English description>`, without a scope.
- Choose a Conventional Commits type that accurately represents the change, such as `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, or `chore`.
- Write a brief, specific description in English, starting with an uppercase verb in the imperative mood, such as `Add`, `Fix`, or `Update`.
- Do not end the title with a period.
- Example: `feat: Add signup form validation`.

## Write the pull request description

- Read `.github/pull_request_template.md` and use its exact section order and structure:

  ```markdown
  # 📝 Description

  [Brief, task-specific description]

  # 🔧 Changes

  * [Key change]

  # 🧪 How to test

  1. [Preconditions or setup, concrete action/input, and expected observable result]

  # 🎯 Checklist

  - [ ] My code follows the project's standards
  - [ ] I added/updated tests
  - [ ] I updated the documentation
  - [ ] Lints passed
  - [ ] I did a self-review of the code

  # 🔗 Issue

  [Closes #issue-number, or N/A]
  ```

- Write all pull request description content in English. Keep the template's headings, emojis, section order, checklist items, and overall structure. Replace its example text with concise, task-specific content; do not add, remove, rename, or reorder sections or checklist items.
- List the actual key changes under `# 🔧 Changes`. Use `# 🧪 How to test` as a manual, task-specific verification guide: give any required setup or preconditions, concrete actions and input values, and the observable result the reviewer should expect. For example: `Open the Add Habit modal, enter “Read”, select Monday, save; confirm that “Read” appears on Monday.`
- Do not use `# 🧪 How to test` to report automated test counts, suite totals, pass/fail summaries, or commands as a substitute for feature-verification steps. Report automated checks and their results separately in the final response to the user.
- Do not claim manual scenarios were performed unless they were. If manual verification was not run, still provide the steps and expected results, and state that manual verification was not run.
- Mark checklist items accurately: check an item only when the change and available evidence support it. In particular, do not mark tests added/updated, documentation updated, or lints passed unless that is true. Report automated check failures or checks that were not run separately from the manual `# 🧪 How to test` instructions.
- Use an issue number only when it is provided by the user in the input accompanying this prompt. Do not infer one from the branch name, task context, commits, or repository. In `# 🔗 Issue`, write `Closes #<number>` when the user provided an issue number; otherwise write exactly `N/A`.
- If `.github/pull_request_template.md` is missing or unreadable, do not invent a replacement description. Report the problem and ask how to proceed.

## Create the pull request

- Always set the base/target branch to `dev`, regardless of the current branch or any default suggested by GitHub.
- Create the pull request from the current branch into `dev`. Do not change branches or push unless required by the repository's established PR workflow; if pushing is required, push only the current branch.
- Before creating it, verify the final title, description, source branch, and that the base is `dev`.
- Use the repository's available GitHub workflow (for example, `gh pr create`) to create the pull request. If it cannot be created, report the prepared title and description, the blocker, and any URL if one was created.
- When finished, report the pull request URL, title, source and target branches, and the checks and their outcomes.
````
