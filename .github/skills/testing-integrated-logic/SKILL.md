---
name: testing-integrated-logic
description: 'Write and validate integration tests for complete user workflows, API-backed components, and multi-component interactions. Use post-implementation before merge, when behavior spans components and data sources, or during regression checks.'
argument-hint: '[feature-name]'
allowed-tools:
  - Read
  - Bash
  - Edit
  - Write
  - Glob
  - Grep
version: 1.0.0
---

# Testing Integrated Logic

## Purpose

Validate complete feature behavior by exercising user workflows, component interactions, routing/context providers, data fetching, and realistic async states. Every test asserts a user-observable outcome, not an implementation detail. Keep integration tests in their own CI lane so fast deterministic unit checks stay separate from slower API-backed or browser-backed workflows.

## When To Use

- Post-implementation before merge or release
- When behavior spans multiple components, hooks, services, routes, stores, or data sources
- During regression checks for user workflows, async data flow, or infrastructure-sensitive tests
- When a defect appears only after multiple pieces are wired together

## Inputs

- Feature acceptance criteria and UX states
- Implemented feature components, routes, providers, and services
- Project test runner config and shared test utilities
- Network/API mock handlers and response fixtures, if the workflow fetches data
- CI failure logs, especially import-time failures, `0 test`, API 404s, browser reloads, or unhandled request output

## Workflow

### Phase 1 - Choose the Test Lane

1. Ask enough questions to choose the right lane before writing tests:
   - Is this a pure rule/transform that belongs in a unit test, or a user workflow that needs integration coverage?
   - Does the workflow require a real browser, service worker, layout engine, or browser-only behavior, or will a DOM simulator cover it?
   - Which API calls should be handled globally, and which scenario-specific handlers belong in the test?
   - What CI symptom are we preventing: wrong test selection, missing handler, late mock startup, client cache/request races, lazy bundler reload, browser concurrency, or teardown work?
2. Map scenarios before writing tests:

   | Category | Scenarios to cover |
   |---|---|
   | **Happy path** | Primary user workflow completes with expected content visible |
   | **Loading state** | Spinner, skeleton, pending copy, or disabled controls are visible before data resolves |
   | **Empty state** | Correct message or affordance appears when data is absent |
   | **Error state** | User-visible error or retry path appears when an API fails |
   | **Permission-gated** | Actions are hidden, disabled, or blocked for unauthorized roles |
   | **Feature/config off** | Feature, route, or capability is unavailable when disabled |
   | **User interactions** | Clicks, typing, submissions, inline edits, navigation, or selections produce visible outcomes |
   | **Accessibility** | Keyboard navigation, focus management, labels, and roles work for the workflow |

   For mixed-scope features, cover deterministic rules in unit tests and cross-component, provider, or data-flow behavior in integration tests. Avoid duplicating the same assertion across lanes unless each test verifies a distinct contract.

### Phase 2 - Keep Ownership Explicit

3. Align filenames and test config with intent:
   - Unit config should own unit-style names such as `*.unit.test.*`, `*.api.unit.test.*`, and any generic `*.test.*` files that are intentionally unit/component tests.
   - Integration config should own only explicit integration names such as `*.integration.test.*`.
   - Browser-backed integration should usually be a separate command/config from DOM-simulated integration.
   - Coverage should point at the intended config instead of falling back to an ambiguous default.
4. Create or update the integration test file using project conventions:

   ```ts
   import { renderWithProviders } from "<test-support>/renderWithProviders";

   describe("Feature Name Integration", () => {
     beforeAll(() => { /* environment stubs if needed */ });
     afterEach(() => { /* clear navigation or scenario mocks */ });

     it("Use Case: ...", async () => { ... });
   });
   ```

   Rules:
   - All `it(...)` descriptions must start with `"Use Case:"`.
   - Prefer one top-level `describe` per feature/page; nest only for distinct sub-workflows.
   - Use the project render helper with required providers/router/context; avoid bare render for provider-backed workflows.

### Phase 3 - Mock APIs Faithfully

5. Use the project network mocking layer consistently:
   - Mock lifecycle belongs in global setup, not individual test files.
   - Start request interception before app modules can import clients, route loaders, or services that issue requests.
   - Use environment-appropriate mocking: server-side interception for node/DOM-simulated tests; browser/service-worker interception for real-browser tests.
   - Do not statically import server-only mocking code into browser bundles.
   - In real-browser mode, prefer a long-lived browser worker/interceptor and reset handlers between tests.
   - Register shared handlers in the central handler list; add per-test scenario handlers only for scenario overrides.
6. Keep response fixtures faithful to production contracts:
   - Provide success, empty, and error variants.
   - Preserve schema shape, pagination, metadata, and wrapper fields that production clients depend on.
   - Avoid double-wrapping payloads. Handler responses should match what the client receives from production.
   - If a client validates operation names, URLs, or headers, make those match exactly in mocks.

### Phase 4 - Assert Behavior

7. Assert only user-observable outcomes:

   ```ts
   await waitFor(() => {
     expect(screen.getByText("Acme Healthcare")).toBeInTheDocument();
   });

   const user = userEvent.setup();
   await user.click(screen.getByRole("button", { name: /add/i }));
   expect(screen.getByText(/added successfully/i)).toBeInTheDocument();
   ```

   - Wrap data-dependent async assertions in the project async-wait helper.
   - Use high-level user interaction helpers instead of low-level event dispatch unless the project requires otherwise.
   - Query by role, label, visible text, or accessible name; use test IDs only when no semantic alternative exists.
   - Do not assert internal state, private props, hook internals, or implementation-only call counts.

### Phase 5 - Stabilize CI and Browser Runs

8. When integration tests run in a real browser or heavy component environment:
   - Disable or reduce file parallelism when tests share a browser worker, request interceptor, global client setup, or heavy component-library mocks.
   - Pre-bundle or pre-warm dependencies imported by setup files and first-render paths so the dev server/bundler does not reload mid-test.
   - Filter unhandled-request reporting to warn on app/API calls while ignoring virtual modules, source files, third-party packages, and static assets.
   - Do not globally clear client caches while requests may still be in flight. Prefer fresh clients, no-cache test defaults, cleanup, and handler resets.
   - Treat API 404s from the client as a request-interception or URL mismatch failure until proven otherwise.
   - Treat `0 test` output as an import/setup failure, not as an empty spec. Read earlier logs for network, bundler, mock-factory, or environment errors.
   - Normalize package/CSS imports to the active bundler; avoid framework-specific import syntax that cold-cache runs cannot resolve.

### Phase 6 - Pre-Handoff Checklist

| Check | Criteria |
|---|---|
| **"Use Case:" prefix** | Every `it(...)` description starts with `"Use Case:"` |
| **All matrix rows considered** | Happy, loading, empty, error, permission, config, interaction, and accessibility states are covered or explicitly deferred |
| **No implementation assertions** | No state, private props, hook internals, or internal helper call-count assertions |
| **Provider render helper used** | Workflow renders with required router/context/provider setup |
| **Mock data contract-accurate** | Fixtures preserve production response shape and client-required metadata |
| **Async assertions wrapped** | Data-dependent assertions wait for the observable state |
| **User-level events used** | Interactions mirror how a user acts |
| **Tests pass in isolation** | Each test can run alone without shared mutable state |
| **Suite passes by lane** | Unit, DOM integration, and browser integration run as separate steps where applicable |
| **Mocks start early** | Global setup starts request interception before imports can issue API calls |
| **Browser lane stable** | Browser config avoids unsafe parallelism, lazy reloads, and noisy non-app request warnings |

## Deliverables

- Feature-level integration tests covering the behavior matrix
- Shared and scenario-specific API handlers with success/empty/error variants
- Contract-accurate fixtures or builders
- Clear unit/DOM integration/browser integration ownership in config or documentation
- Pre-handoff checklist completed; residual gaps noted

## Guardrails

- Keep the skill framework-agnostic: follow the project's runner, render helper, and mock library conventions.
- Do not manage global request mocking lifecycle in individual test files.
- Do not let integration globs collect generic unit/component tests.
- Do not ignore client-side API 404s in integration tests; they usually mean a request escaped interception or hit the wrong URL.
- Do not write tests that only verify a page renders. If there is no user-observable outcome, use a unit test or document the skip.

## Reference: Failure Triage

When CI shows import-time stderr, `0 test`, client API 404s, unhandled requests, or browser reloads, debug in this order:

1. Confirm the file belongs to exactly one test lane.
2. Confirm global setup starts request interception before importing modules that create clients, loaders, stores, or services.
3. Confirm the client request URL matches the mock handler URL exactly, including base path.
4. Confirm operation names, methods, headers, and wrapper fields match the production contract.
5. Confirm browser tests use browser-compatible request mocking and DOM tests use node/server-compatible mocking.
6. Re-run one focused file, then a multi-file run. Passing alone but failing in batch points to shared worker/client state, test parallelism, lazy bundler reloads, or teardown work.

## Reference: When to Skip Integration Tests

Use a documented skip when a scenario cannot be tested through stable user-observable outcomes:

```ts
// Skipped: dynamic field manipulation is fragile in the mocked environment.
// The underlying validation rules are covered in formRules.unit.test.ts.
it.skip("Use Case: allows user to add another email address", async () => {});
```