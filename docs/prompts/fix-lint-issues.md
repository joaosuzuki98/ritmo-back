# Lint Issue Resolution Prompt

Use the text below as instructions for the agent responsible for resolving lint issues in this repository:

```text
Resolve the lint issues reported by this repository's ESLint configuration. Fix the underlying code issues while preserving intended behavior and all existing user work.

## Inspect and diagnose

1. Inspect `git status` and the relevant diffs before making changes. Preserve unrelated and pre-existing user changes; do not discard, overwrite, stage, or commit them.
2. Run `npm run lint` and review the complete output. Identify the affected files and understand each rule violation in context before editing.

## Resolve the issues

1. Make the smallest changes that correctly resolve the reported violations while keeping application behavior intact and following nearby code patterns.
2. Remove genuinely unused imports and declarations. For React Hooks dependency warnings, determine the correct dependencies and adjust the code structure if needed; do not suppress the rule or add dependencies blindly.
3. Do not disable or weaken ESLint rules, add blanket ignores, or use inline suppression comments just to make lint pass. Use a narrowly scoped suppression only when a real limitation makes the rule inapplicable, and document the reason next to it.
4. Do not make unrelated refactors or change lint configuration unless the task specifically requires it. If a diagnostic appears to be a false positive or cannot be resolved without changing intended behavior, explain the issue and ask the user before making a risky change.

## Verify and report

1. Run `npm run lint` again after the changes. Review the diff to confirm it contains only changes needed to address the lint issues.
2. If the changes could affect runtime behavior, run the relevant tests or build checks available in the repository. Do not claim checks passed unless they were run.
3. Report the files changed, the types of lint issues resolved, checks run and their results, and any remaining diagnostics or blockers.
```
