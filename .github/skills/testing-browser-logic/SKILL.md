---
name: testing-browser-logic
description: 'Write and validate real-browser tests with Playwright for end-to-end user workflows, browser behavior, navigation, and layout. Use when behavior depends on an actual browser or crosses the full application boundary.'
argument-hint: '[workflow-name]'
allowed-tools:
  - Read
  - Bash
  - Edit
  - Write
  - Glob
  - Grep
version: 1.0.0
---

# Testing Browser Logic

## Purpose

Validate user-visible workflows in a real browser with Playwright. This lane covers browser behavior and end-to-end wiring that DOM-simulated integration tests cannot faithfully exercise. Keep it separate from fast unit tests and Vitest integration tests; assert observable outcomes rather than implementation details.

## Test Ownership

| Lane | Owns |
|---|---|
| Unit | Pure rules, transforms, validators, and formatting with deterministic inputs and outputs |
| DOM integration | Component/provider/API wiring that can be validated in Vitest without a real browser |
| Browser E2E | Actual browser navigation, rendering/layout, browser APIs, and a small number of complete user workflows |

For mixed-scope features, test pure rules in the unit lane, app wiring in DOM integration, and only browser-specific or end-to-end contracts in Playwright. Avoid repeating the same assertion across lanes unless each assertion verifies a distinct contract.

## When To Use

- A behavior depends on browser layout, native browser APIs, navigation, or real event timing
- A critical user workflow crosses routes, client/server boundaries, or several integrated features
- A DOM simulator cannot reproduce the failure or user-visible behavior reliably
- A release-critical smoke path needs validation in the actual application runtime

Use unit or DOM integration tests instead when the behavior can be established without a real browser. Do not move a pure rule into browser tests merely because it is used by a page.

## Project Defaults

- Browser tests live in `tests/e2e/` and use `@playwright/test`.
- Run the lane with `bun run e2e`; use `bun run e2e tests/e2e/<file>.spec.ts` for a focused file.
- The current Playwright project is Desktop Chromium only. Add other browsers or viewports only when acceptance criteria or a specific risk requires them.
- Playwright starts the app with `bun run dev -- --hostname 127.0.0.1 --port 4173`. The configured base URL can be overridden with `PLAYWRIGHT_BASE_URL`.
- `fullyParallel` is disabled. CI retries twice; local runs do not retry.
- Traces are captured on the first retry, screenshots on failure, and videos retained on failure. Inspect these artifacts when diagnosing a failing run.
- Reuse the configured `webServer`; do not start a second development server unless the test intentionally targets a separately managed environment.

Re-check `playwright.config.ts` before relying on these defaults; update this guidance when the project configuration changes.

## Inputs

- User workflow and acceptance criteria, including visible success/failure states
- Relevant routes, components, and API boundaries
- `playwright.config.ts`, E2E helpers, and existing specs
- Deterministic test data or an agreed API interception strategy
- CI failure output and Playwright trace/screenshot/video artifacts, when debugging

## Workflow

### Phase 1 - Confirm Browser Ownership

1. Decide whether a real browser is necessary:
   - Is the risk about actual navigation, browser APIs, rendering/layout, focus, or browser event timing?
   - Can the behavior be asserted with a pure unit test or Vitest DOM integration test instead?
   - For a mixed feature, which distinct contract belongs in each lane?
2. Inspect the Playwright configuration and nearby E2E specs. Confirm the test directory, project/device, base URL, web-server lifecycle, retries, artifacts, and parallelism before writing or debugging tests.
3. Select a small set of high-value workflows. Consider happy path, loading, empty, error/retry, navigation, and accessibility behavior when relevant; cover or explicitly defer scenarios that do not apply.

### Phase 2 - Write User-Level Browser Tests

4. Add the spec under `tests/e2e/` and follow the repository's Playwright conventions:

   ```ts
   import { expect, test } from "@playwright/test";

   test("Use Case: opens the forecast dashboard", async ({ page }) => {
     await page.goto("/dashboard");

     await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
   });
   ```

   Rules:
   - Prefix each `test(...)` title with `"Use Case:"`, matching existing E2E specs.
   - Interact through the `page` and browser-facing controls as a user would.
   - Prefer locators by role, label, placeholder, or accessible name; use test IDs only when semantic locators are not practical.
   - Use Playwright's web-first assertions, which wait for observable conditions. Do not add fixed sleeps to hide races.
   - Assert meaningful outcomes such as visible content, URL/navigation, enabled state, form results, or browser-observable layout. Do not inspect React internals, private state, or implementation-only call counts.

### Phase 3 - Keep Network Behavior Deterministic

5. Use deterministic test data by default; do not make browser tests depend on live NWS or other external services.
   - Use Playwright request routing for requests initiated by the browser when that is the correct interception boundary.
   - Match the method, URL, status, headers, and response body the application expects. Keep fixtures minimal but contract-accurate.
   - Reset or close route handlers and browser contexts between tests so one scenario cannot affect another.
   - Do not silently fulfill every request or suppress unexpected app/API traffic; unexpected requests should remain diagnosable.
6. Intercept at the layer that actually makes the request. `page.route()` sees browser-originated requests; it does not intercept server-to-server calls made by a Next.js API route to an upstream service. For those flows, use a controllable test upstream or another explicit server-side test seam. Do not mistake a browser mock for coverage of the server-side API contract.

### Phase 4 - Exercise Browser-Specific Risks

7. Add viewport, keyboard, focus, accessibility, or cross-browser coverage only when it addresses an acceptance criterion or a concrete risk.
   - Keep the default project aligned with Desktop Chromium unless the workflow requires another viewport or browser.
   - For responsive behavior, choose representative viewport sizes tied to layout breakpoints; assert the user-visible result rather than pixel details unless visual regression is the explicit goal.
   - For keyboard and focus behavior, use keyboard input and assert focus or accessible outcomes.
   - Avoid duplicating broad scenario suites across browsers without a browser-specific reason.

### Phase 5 - Stabilize and Diagnose

8. Keep specs deterministic and isolated:
   - Do not depend on test order, shared browser state, persisted application data, or live upstream availability.
   - Use unique test data when the app persists state, and clean up through supported test APIs or isolated contexts.
   - Keep the configured serial execution unless the suite is proven independent and parallelism is intentionally changed.
   - Treat retries as diagnostic support, not a substitute for fixing flakiness.
9. Triage failures in this order:
   - Confirm the spec is in `tests/e2e/` and selected by the Playwright command/project.
   - Confirm the configured app server is ready at the expected base URL.
   - Inspect failed request URLs and determine whether the request originates in the browser or on the server.
   - Check route fixtures against the actual request and production response contract.
   - Inspect the failure screenshot, retained video, and trace; rerun the focused spec before the full E2E lane.
   - If the test passes alone but fails in a suite, investigate persisted state, handler/context cleanup, shared resources, and ordering assumptions.

## Pre-Handoff Checklist

| Check | Criteria |
|---|---|
| **Correct lane** | Test requires a real browser and does not replace unit or DOM integration coverage |
| **Use Case title** | Every Playwright `test(...)` title starts with `"Use Case:"` |
| **User-observable assertions** | Outcomes use browser-visible content, navigation, interaction, or relevant browser state |
| **Semantic locators** | Roles, labels, and accessible names are preferred |
| **No fixed sleeps** | Readiness uses web-first assertions or explicit condition waits |
| **Deterministic network** | External services are not required; interception is applied at the correct request boundary |
| **Isolated scenarios** | Browser contexts, routes, and persisted test data do not leak across tests |
| **Scoped browser matrix** | Additional browsers/viewports are justified by requirements or risk |
| **Failure artifacts reviewed** | Screenshot, video, or trace is used when diagnosing a failure |
| **Lane passes** | Focused spec and `bun run e2e` pass in the intended environment |

## Deliverables

- Focused Playwright specs for high-value real-browser workflows
- Deterministic request fixtures or documented test-upstream setup
- Correct ownership boundaries with unit and DOM integration tests
- Relevant browser/device coverage based on feature risk
- Residual gaps or intentionally deferred scenarios called out

## Guardrails

- Keep Playwright for real-browser behavior and end-to-end contracts, not pure rules or routine component assertions.
- Do not rely on live external APIs for default E2E runs.
- Do not claim browser-side routing mocks cover server-to-server requests.
- Do not use fixed delays, blanket request suppression, or retries to conceal race conditions.
- Do not expand the browser matrix without a concrete requirement or risk.
- Keep tests focused on observable outcomes; a page merely rendering is not a workflow assertion unless it is an intentional smoke check.