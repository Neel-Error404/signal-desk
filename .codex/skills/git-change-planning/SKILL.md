---
name: git-change-planning
description: "Use when decomposing work into branches, worktrees, commits, stacked pull requests, review units, release provenance, or rollback-safe change sequences."
---

# Git Change Planning

## Workflow

1. Declare the outcome, change class, contracts, evidence, and rollback.
2. Split work by independently understandable and reversible concerns.
3. Define branch and worktree ownership for each concurrent work item.
4. Use stacked PRs only when dependency order remains reviewable.
5. Keep unrelated changes outside the branch and commit.
6. Link PR, commit, artifact, deployment, and observed result.

Never stage, commit, push, reset, clean, or rewrite history without explicit permission.
