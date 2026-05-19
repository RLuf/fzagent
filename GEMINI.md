# fzagent Project Instructions

Foundational mandates and conventions for the fzagent project. These instructions take absolute precedence over general workflows.

## Core Architectural Mandates

- **Monorepo Structure:** Respect the 6-package separation (`core`, `providers`, `memory`, `agent`, `skills`, `cli`). Avoid circular dependencies.
- **Strict ESM:** Use pure Node.js ESM. Relative imports MUST include the `.js` extension (even if the source is `.ts`).
- **Strict TypeScript:** Adhere to the `strict: true` configuration. Use Zod for all input validation (tools and skills).
- **Secondary Brain:** Maintain the hybrid SQLite (FTS5) + Qdrant (vector) approach for the wiki.
- **Dependency Flow:** cli -> agent -> providers -> core; agent -> memory -> core; skills -> core.

## Development Workflows

- **Testing:** Use Vitest. Add/update tests in the `tests/` directory or package-specific `src/__tests__/` if they exist. Always run `npm test` before considering a task complete.
- **Validation:** Use `zod` for parsing tool inputs and config objects.
- **Logging:** Use the project's custom logger from `@fzagent/core`. Do not use `console.log` in library code.
- **Build System:** Use `tsup` for bundling. Run `npm run build` after structural changes.
- **API Documentation:** If modifying public exports in `packages/*/src/index.ts`, run `npm run docs:api` to update the auto-generated documentation.

## Coding Standards & Style

- **Conventions:** Follow the patterns in `AGENTS.md` and `docs/architecture.md`.
- **Naming:** Use camelCase for variables/functions, PascalCase for classes/types.
- **Errors:** Use the custom error classes defined in `@fzagent/core/errors`.
- **Commits:** Follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).

## Security & Safety

- **High-Risk Tools:** Tools with `permissions: 'high'` (like `shell.exec`) require explicit confirmation or specific environment variable bypasses.
- **Secrets:** Never log or commit API keys. Mask secrets in any debug output.

## References

- [Architecture](./docs/architecture.md)
- [Operations](./docs/operations.md)
- [Skill Contract](./wiki/concepts/skill-contract.md)
- [Agents Guide](./AGENTS.md)
