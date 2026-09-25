# Barotropic

**Weather Intelligence Platform**

Barotropic is a weather forecasting platform designed around a simple premise: Weather forecasting should be a process of examining evidence, recognizing atmospheric patterns, forming a hypothesis, and communicating a forecast—not simply consuming a generated forecast.

## Tech Stack

- **Runtime**: [Node.js 24+](https://nodejs.org/)
- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5.6+](https://www.typescriptlang.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Linting**: [Oxlint](https://oxc-project.github.io/docs/guide/linter.html)
- **Formatting**: [Oxcformatter](https://oxc-project.github.io/docs/guide/formatter.html)
- **Deployment**: [Vercel](https://vercel.com/)

## Project Structure

```
src/
├── app/                 # Next.js App Router pages and layouts
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/          # Reusable React components
├── lib/                # Utility functions and helpers
├── styles/             # Global styles
└── types/              # TypeScript type definitions
```

## Prerequisites

- **Node.js**: 24.0.0 or higher
- **pnpm**: 9.0.0 or higher

## Getting Started

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Available Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run Oxlint
pnpm format           # Format code with Oxcformatter
pnpm format:check     # Check formatting without making changes
pnpm type-check       # Check TypeScript types
```

## Key Features

- ✅ **React 19** - Latest React features and improvements
- ✅ **TypeScript 5.6+** - Full type safety with latest features
- ✅ **Node.js 24** - Modern runtime with latest capabilities
- ✅ **Next.js App Router** - Modern routing and server components
- ✅ **Tailwind CSS** - Utility-first styling
- ✅ **pnpm** - Fast, disk-space efficient package management
- ✅ **Oxlint** - Fast, zero-config linting (Rust-based)
- ✅ **Oxcformatter** - High-performance code formatting (Rust-based)
- ✅ **Path Aliases** - Clean imports with `@/` prefix
- ✅ **Environment Variables** - Secure configuration

## Code Quality

### Linting with Oxlint

Oxlint is a Rust-based linter that's significantly faster than ESLint:

```bash
pnpm lint
```

### Formatting with Oxcformatter

Oxcformatter provides high-performance code formatting:

```bash
# Format all files
pnpm format

# Check formatting without making changes
pnpm format:check
```

### Type Checking

Ensure full type safety:

```bash
pnpm type-check
```

## Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

## Deployment

This project is optimized for deployment on [Vercel](https://vercel.com/):

1. Push your code to GitHub
2. Import your repository in Vercel
3. Vercel automatically detects pnpm and configures the build
4. Environment variables are automatically configured
5. Deploy with a single click

Alternatively, you can deploy anywhere that supports Node.js 24+.

## Architecture Decisions

### React 19

React 19 includes:

- New compiler and optimizations
- Enhanced form handling
- Improved server component support
- Better TypeScript integration

### Node.js 24

Node.js 24 provides:

- Latest V8 JavaScript engine
- Improved performance and memory efficiency
- Latest ES features support
- Enhanced built-in APIs

### TypeScript 5.6+

Latest TypeScript enables:

- Better type inference
- Improved performance
- New language features
- Enhanced IDE support

### pnpm

pnpm offers:

- **Speed**: Faster installation and resolution
- **Efficiency**: Monorepo-friendly with workspace support
- **Security**: Stricter dependency management
- **Compatibility**: Drop-in npm/yarn replacement

### Oxlint & Oxcformatter

Rust-based tools provide:

- **Performance**: 10-100x faster than ESLint/Prettier
- **Zero-config**: Works out of the box with sensible defaults
- **Modern**: Built for performance and developer experience
- **Next.js optimized**: Built-in rules for Next.js best practices

### Next.js App Router

The App Router provides:

- Improved performance with Server Components
- Simplified routing with file-based structure
- Built-in API routes for backend functionality
- Better error handling with error boundaries

### Tailwind CSS

Tailwind provides:

- Rapid UI development
- Consistent design system
- Weather-themed color palette
- Responsive design out of the box

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.
