---
name: testing-unit-logic
description: 'Write and validate unit tests for pure functions, utilities, data transforms, and isolated business logic. Use when adding or modifying business rules, refactoring utility modules, or when defects indicate rule-level regressions in a single module.'
argument-hint: '[module-path]'
allowed-tools:
  - Read
  - Bash
  - Edit
  - Write
  - Glob
  - Grep
version: 1.0.0
---

# Testing Unit Logic

## Purpose

Validate internal business logic at module scope: functions, methods, transforms, predicates, validators, and formatting rules. Unit tests must not rely on rendered UI, routing, network interception, browser behavior, shared clients, or service workers. They are the fast deterministic CI lane.

## When To Use

- After adding or modifying business rules
- During refactors of utilities, helpers, validators, mappers, selectors, and service-free modules
- When defects indicate rule-level regressions in a single module
- When an integration failure can be reduced to a deterministic input/output rule

## Inputs

- Module(s) being changed and directly related utilities
- Acceptance criteria tied to business-rule outcomes
- Existing lightweight fixtures, examples, enums, and type definitions
- Any integration failure logs that suggest a lower-level rule regression

## Workflow

### Phase 1 - Classify the Test

1. Ask enough questions before editing:
   - Is the behavior deterministic with plain inputs and outputs?
   - Does it require rendering, routing, permissions, network mocks, browser APIs, timers, or client cache behavior? If yes, use integration coverage instead.
   - Is the existing filename/config causing this test to run in the wrong CI lane?
   - What risk are we covering: branch regression, boundary handling, invalid input, schema drift, or accidental infrastructure dependency?
2. Determine what belongs in a unit test vs. an integration test:

   | Unit test | Integration test instead |
   |---|---|
   | Pure function input -> output | Component rendering or user interaction |
   | Data transformation or mapping | Multi-component workflow |
   | Validation or formatting rule | API wiring, route loader, or provider setup |
   | Conditional branch in a utility | Permission checks requiring app context |
   | Error thrown for invalid input | Network-backed data flow |
   | Cache-free selector or predicate | Browser/service-worker/client behavior |

3. List every logical branch: happy path, invalid input, boundary values, null/undefined, empty collections, enum/status values, unknown values, and type coercion cases.

### Phase 2 - Keep Ownership Explicit

4. Align filenames and test config with intent:
   - Name rule-level tests with the project's explicit unit convention, such as `[module].unit.test.*` or `[module].api.unit.test.*`.
   - Generic `[module].test.*` files should belong to the unit lane unless the project has an explicit different convention.
   - Integration config should not include generic test names merely to collect component tests.
   - Do not add network, router, browser, or app-provider setup just to make a unit pass. Move that scenario to integration coverage.
5. Create or update the unit test file:

   ```ts
   import { describe, it, expect } from "<test-runner>";
   import { myFunction } from "./myModule";

   describe("myFunction", () => {
     it("Use Case: returns expected value for valid input", () => {
       expect(myFunction("valid")).toBe("expected");
     });

     it("Use Case: throws when input is null", () => {
       expect(() => myFunction(null)).toThrow();
     });
   });
   ```

   Rules:
   - All `it(...)` descriptions must start with `"Use Case:"`.
   - Do not mock the module under test; mock only external dependencies it calls.
   - No render helper, router, request interceptor, browser API, or DOM unless this project explicitly classifies isolated component tests in the unit lane.
   - Keep fixtures inline or as small constants. Avoid large production JSON unless the unit specifically validates fixture parsing.

### Phase 3 - Write Assertions

6. Assert the output, not how it was computed:

   ```ts
   expect(mapStatusLabel("ACTIVE")).toBe("Active");
   expect(calculateTotal([])).toBe(0);
   expect(() => parseRequired(null)).toThrow(/required/i);
   ```

7. Cover edge cases systematically:

   | Edge-case category | Examples |
   |---|---|
   | **Boundary values** | min/max numbers, empty string vs whitespace |
   | **Null / undefined** | missing optional args, undefined fields |
   | **Empty collections** | `[]`, `{}`, zero-length string |
   | **Type coercion** | numeric string where number expected |
   | **Enum/status values** | every valid enum value plus unknown/invalid value |
   | **Error paths** | invalid input that should throw or return a sentinel |
   | **Immutability** | input object/array is not mutated when that is part of the contract |

### Phase 4 - Integration Boundary Checks

8. Escalate to integration tests when the unit would need to fake too much infrastructure:
   - API clients, request interception, cache behavior, route loaders, or provider setup
   - Browser service workers, layout engine behavior, or real DOM event timing
   - Permission-gated UI, feature flags, navigation, or multi-component workflows
   - Component library behavior that requires rendering or user events
9. Keep fixtures minimal even when production data is complex. Test the local rule with the smallest object that exercises the branch. If correctness depends on full API response shape, pagination metadata, or client wrapping, that belongs in integration coverage.

### Phase 5 - Pre-Handoff Checklist

| Check | Criteria |
|---|---|
| **"Use Case:" prefix** | Every `it(...)` description starts with `"Use Case:"` |
| **Single-module scope** | No app render, network mock, router context, or browser dependency |
| **Every branch covered** | Each conditional path has at least one test |
| **Edge cases explicit** | Null, undefined, empty, boundary, unknown, and error inputs are tested |
| **No implementation assertions** | No private helper, internal state, or internal call-count assertions |
| **Fixtures minimal** | Inline values or small constants with only relevant fields |
| **Deterministic** | Time, random, timers, locale, and environment are fixed or injected |
| **Tests pass in isolation** | Each test can run alone without shared mutable state |
| **Risks flagged** | Scenarios requiring component, router, client, network, or browser context are noted for integration follow-up |
| **Correct CI lane** | Filename and config keep this in the unit run |

## Deliverables

- Module-scoped unit tests with deterministic outcomes
- Explicit branch and edge-case coverage
- Minimal fixtures or builders
- Note of any uncovered risk requiring integration tests

## Guardrails

- Keep the skill framework-agnostic: follow the project's runner and assertion library conventions.
- Keep tests isolated and fast: no DOM, no network, no routing, no request interception, no browser worker, no shared app client.
- Assert outputs and thrown errors; avoid implementation-detail assertions.
- Do not broaden integration globs to capture unit tests. Rename or move tests instead.
- Do not overfit fixtures to production objects when only one field matters.

## Reference: Unit Test Standards

### Core Philosophy

Test what callers observe, never internal machinery.

**Test:**
- Return values for meaningful inputs
- Error behavior for invalid inputs
- Data transformation across valid input shapes
- Boundary and fallback behavior

**Do not test:**
- Private helper calls
- Internal state variables
- Framework lifecycle internals
- Network, routing, browser, or app-provider behavior

### Common Shape

```ts
import { describe, it, expect, beforeEach, afterEach } from "<test-runner>";
```

Use mocks sparingly. If a test needs many mocks, it may be an integration test wearing a unit-test name.

### Translation or Formatting Helpers

When logic depends on translation, locale, date, or environment values, inject or mock only that boundary. Keep readiness flags and fallback behavior faithful to the project's production contract.

### Test Description Convention

All `it(...)` descriptions must begin with `"Use Case:"`:

```ts
it("Use Case: returns Active for ACTIVE status", () => {});
```