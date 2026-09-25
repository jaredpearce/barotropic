# Barotropic

**Weather Intelligence Platform**

Barotropic is a weather forecasting platform designed around a simple premise: Weather forecasting should be a process of examining evidence, recognizing atmospheric patterns, forming a hypothesis, and communicating a forecast—not simply consuming a generated forecast.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5.6+](https://www.typescriptlang.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Package Manager**: [Bun](https://bun.sh/)
- **Linting**: [Oxlint](https://oxc-project.github.io/docs/guide/linter.html)
- **Formatting**: [Oxcformatter](https://oxc-project.github.io/docs/guide/formatter.html)
- **Deployment**: [Vercel](https://vercel.com/)

## Project Structure

```
src/
├── app/                         # Next.js App Router
│   ├── dashboard/              # Dashboard pages
│   ├── forecasts/              # Forecast management
│   │   └── new/                # New forecast creation wizard
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
├── components/                 # Reusable React components
│   ├── Button.tsx              # Button component
│   └── index.ts                # Component exports
├── lib/                        # Utility functions
│   ├── forecast-utils.ts       # Forecast domain utilities
│   ├── hooks.ts                # Custom React hooks
│   └── index.ts                # Lib exports
├── styles/                     # Global styles
│   └── globals.css             # Tailwind directives
└── types/                      # TypeScript type definitions
    ├── api.ts                  # API response types
    ├── domain.ts               # Core domain types
    └── index.ts                # Type exports
```

## Domain Architecture

Barotropic is built around the core concept of **evidence-based weather forecasting**:

### Core Types

- **ForecastAnalysis**: The central forecast object combining evidence, patterns, hypothesis
- **Evidence**: Observations, satellite data, model output supporting the forecast
- **AtmosphericPattern**: Identified weather patterns (highs, lows, fronts, etc.)
- **ForecastScenario**: Alternative scenarios with probabilities
- **ForecastNarrative**: Structured communication of the forecast

### User Workflow

1. **Location & Time** - Define forecast scope
2. **Evidence Panel** - Document observations and data
3. **Pattern Analysis** - Recognize atmospheric patterns
4. **Hypothesis Formation** - State weather forecast hypothesis
5. **Scenario Comparison** - Compare possible outcomes
6. **Forecast Communication** - Articulate the forecast

## Prerequisites

- **Bun**: 1.0.0 or higher ([install Bun](https://bun.sh/docs/installation))

## Getting Started

### Installation

1. Clone the repository
2. Install dependencies:

```bash
bun install
```

### Development

Run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Available Commands

```bash
# Development
bun dev              # Start development server
bun run build        # Build for production
bun start            # Start production server

# Code Quality
bun lint             # Run Oxlint
bun format           # Format code with Oxcformatter
bun format:check     # Check formatting without making changes
bun type-check       # Check TypeScript types
```

## Key Features

- ✅ **Evidence-Based Forecasting** - Document observations and data
- ✅ **Pattern Analysis** - Recognize atmospheric patterns
- ✅ **Hypothesis Formation** - State and refine forecast hypotheses
- ✅ **Scenario Comparison** - Compare alternative forecast outcomes
- ✅ **Structured Narratives** - Communicate forecasts clearly
- ✅ **React 19** - Latest React features and improvements
- ✅ **TypeScript 5.6+** - Full type safety with latest features
- ✅ **Bun** - Lightning-fast all-in-one JavaScript runtime
- ✅ **Next.js App Router** - Modern routing and server components
- ✅ **Tailwind CSS** - Utility-first styling
- ✅ **Oxlint** - Fast, zero-config linting (Rust-based)
- ✅ **Oxcformatter** - High-performance code formatting (Rust-based)
- ✅ **Path Aliases** - Clean imports with `@/` prefix

## Application Pages

### Dashboard (`/dashboard`)

Central hub showing:
- Active forecasts
- Recent analyses
- Accuracy metrics
- Quick actions

### Forecasts (`/forecasts`)

Manage all forecasts:
- List view of forecasts
- Filter and search
- Create new forecast

### New Forecast (`/forecasts/new`)

Wizard for creating forecasts:

1. **Location & Time** - Set forecast scope
2. **Evidence Panel** - Gather supporting data
3. **Hypothesis** - Form forecast hypothesis
4. **Review & Publish** - Review and publish

## Code Quality

### Linting with Oxlint

Oxlint is a Rust-based linter that's significantly faster than ESLint:

```bash
bun lint
```

### Formatting with Oxcformatter

Oxcformatter provides high-performance code formatting:

```bash
# Format all files
bun format

# Check formatting without making changes
bun format:check
```

### Type Checking

Ensure full type safety:

```bash
bun type-check
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
3. Vercel automatically detects Bun and configures the build
4. Environment variables are automatically configured
5. Deploy with a single click

Alternatively, you can deploy anywhere that supports Bun or Node.js.

## Architecture Decisions

### Evidence-Based Forecasting

Barotropic is built on the principle that weather forecasting is a process of:
1. Examining evidence (observations, data)
2. Recognizing atmospheric patterns
3. Forming hypotheses
4. Communicating forecasts

Not simply consuming generated forecasts.

### Domain-Driven Design

The codebase uses domain-driven design principles with:
- Clear domain types in `src/types/domain.ts`
- Domain utilities in `src/lib/forecast-utils.ts`
- Structured workflows in page components

### React 19 & TypeScript 5.6+

- Full type safety across the application
- Latest React features and optimizations
- Strict mode enabled by default

### Next.js App Router

The App Router provides:
- Improved performance with Server Components
- Simplified routing with file-based structure
- Built-in API routes for backend functionality
- Better error handling with error boundaries

### Bun

Bun is a modern, all-in-one JavaScript runtime offering:
- **Speed**: 3-4x faster package installation than npm/pnpm
- **Simplicity**: Built-in package manager, test runner, and bundler
- **Compatibility**: Drop-in replacement for Node.js with better performance
- **Ecosystem**: Full npm package compatibility with native TypeScript support

### Oxlint & Oxcformatter

Rust-based tools provide:
- **Performance**: 10-100x faster than ESLint/Prettier
- **Zero-config**: Works out of the box with sensible defaults
- **Modern**: Built for performance and developer experience
- **Next.js optimized**: Built-in rules for Next.js best practices

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
