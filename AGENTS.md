# Ritmo App agents.md

Before making any changes, always consult the following files:

- `docs/architecture.md`: Architectural choices, layer and domain rules, etc.
- `docs/code_conventions.md`: Naming rules, formatting rules, etc.

These conventions are normative: any generated code must follow them without exception.

In addition, use the following MCPs:

- **Context7**: To look up up-to-date documentation, information about libraries, packages, services, configurations, etc.
- **Serena**: To navigate the project's codebase to locate symbols and inspect dependencies with more precision.
- **Github**: To obtain information and context about tasks.

# Setup and running

```bash
# install dependencies
npm install

# run the application in dev mode
npm run dev

# build
npm run build

# run the application (production)
npm start

# lint
npm run lint

# lint with automatic fixing
npm run lint:fix

# run the tests
npm test

# run the tests in watch mode
npm run test:watch
```