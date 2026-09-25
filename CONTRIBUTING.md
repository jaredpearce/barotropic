# Contributing to Barotropic

Thank you for your interest in contributing to Barotropic! This document provides guidelines for contributing.

## Requirements

- **Node.js**: 24.0.0 or higher
- **pnpm**: 9.0.0 or higher

## Code Standards

### TypeScript

- Use strict mode (enabled by default)
- Avoid `any` types - use proper typing
- Use interfaces for object shapes
- Use type aliases for unions and primitives
- Leverage TypeScript 5.6+ features

### Components

- Keep components small and focused
- Use functional components with hooks
- Prop types should be well-defined
- Add JSDoc comments for complex components
- Take advantage of React 19 features

### Styling

- Use Tailwind CSS utility classes
- Create custom components in `src/components` for reusable styles
- Use CSS modules for component-specific styles if needed
- Follow the weather-themed color palette

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run type checking: `pnpm type-check`
4. Run linting: `pnpm lint`
5. Format code: `pnpm format`
6. Create a pull request

## Installation

```bash
pnpm install
```

Note: We use pnpm for this project. It's faster and more efficient than npm or yarn.

## Code Formatting

Code is automatically formatted with Oxcformatter. Before committing:

```bash
pnpm format
```

## Linting

Lint your code with Oxlint:

```bash
pnpm lint
```

Fix linting issues automatically where possible:

```bash
pnpm lint -- --fix
```

## Type Checking

Ensure all types are correct:

```bash
pnpm type-check
```

## Commit Messages

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Tests
- `chore:` Maintenance

## Pull Request Process

1. Update README.md if needed
2. Ensure all code is formatted: `pnpm format:check`
3. Ensure linting passes: `pnpm lint`
4. Ensure types check: `pnpm type-check`
5. Ensure tests pass (when tests are added)
6. Add relevant labels
7. Request review from maintainers

## Questions?

Feel free to open an issue or discussion for questions.
