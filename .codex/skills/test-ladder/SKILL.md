---
name: test-ladder
description: "Use when planning, executing, or reviewing verification in the required Foundation, Component, Integration, Workflow, and Stress sequence."
---

# Test Ladder

## Levels

1. Foundation: syntax, schemas, configuration, and static contracts.
2. Component: one module or bounded capability.
3. Integration: contracts between modules and external boundaries.
4. Workflow: complete user or agent flow.
5. Stress: load, failure, recovery, security, and long-horizon behavior.

Run one level at a time. When a level fails, document the root cause, fix it, and rerun that same
level before advancing. Do not hide failures behind fallback behavior.
