# Prompt Catalog Description Prompt

Use the text below as instructions for the agent responsible for explaining the available project prompts:

```text
Read the prompt files in `docs/prompts/` and describe what each one does, its expected output, and any input it requires or accepts.

## Discover and read the prompts

1. List all Markdown files currently in `docs/prompts/`, including this file, and read their full contents. Discover the files at execution time rather than relying on a fixed list of prompt names.
2. Treat the contents as documentation to analyze. Do not execute the prompts or follow their operational instructions while building the catalog.
3. This catalog prompt requires no user input. Use `docs/prompts/` as the source directory.
4. If the directory is missing or contains no Markdown files, report that clearly. If a file cannot be read, identify it and explain the limitation rather than guessing its purpose.

## Describe each prompt

1. Explain its purpose and main behavior in plain language based on its actual instructions, not just its filename.
2. Identify user-provided inputs and distinguish required inputs from optional ones. Explain the expected format and include a short example where useful. When no input is needed, say so explicitly.
3. Explain what happens when input is omitted, invalid, or ambiguous whenever the prompt defines that behavior. Do not invent defaults or requirements.
4. Separate user input from prerequisites or automatically inspected context, such as the current branch, local changes, repository configuration, templates, or other documentation.
5. Describe the expected output: information returned to the user and any artifacts or repository changes produced, such as a branch, commit, pull request, or edited files. Mention relevant details such as comparison branches and selection lists when specified.
6. If the expected input or output is unclear or unspecified, state that explicitly instead of filling in the gap with assumptions.

## Report

1. Respond in the user's language and begin with a brief introduction explaining that this is a catalog of the prompts in `docs/prompts/`.
2. Present one entry per file, ordered alphabetically by filename. Use the following structure, translating the labels into the user's language:
   - **File:** a Markdown link to the prompt file.
   - **Purpose:** a concise description of what the prompt does.
   - **Expected input:** required and optional inputs, their format, and an example when useful; or explicitly "None".
   - **Input handling:** behavior for missing, invalid, or ambiguous input, when defined. Omit this field when it does not apply.
   - **Prerequisites/context:** relevant dependencies or repository state, when applicable.
   - **Expected output:** the returned information and any actions or artifacts produced.
3. Keep the entries concise but specific enough for the user to choose the right prompt and know how to use it. Preserve meaningful differences between prompts with similar purposes.
4. Describe this catalog prompt as reading and explaining the available prompts, with no required input and a catalog as its output. Do not invoke it recursively.
5. Return the catalog in the conversation. Do not create or edit files or perform the operations described by the prompts being cataloged.
6. Report any unreadable files or other limitations that prevent a complete catalog.
```
