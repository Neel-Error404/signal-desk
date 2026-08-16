---
name: skill-creator
description: "Use when creating or revising concise repo-local skills with clear triggers, bounded authority, progressive disclosure, registry metadata, and validation."
---

# Skill Creator

Create only procedural context that an agent cannot reliably infer from general capability.

## Workflow

1. Collect concrete triggering examples.
2. Define the skill's authority, outputs, dependencies, and stop conditions.
3. Keep `SKILL.md` concise; move detailed reusable material into one-level references or scripts.
4. Use frontmatter containing only `name` and `description`.
5. Register capabilities, triggers, dependencies, packs, and priority separately.
6. Validate the skill and dependency graph.
7. Test any bundled deterministic script before promotion.

Do not create README, changelog, installation, or duplicated reference files inside a skill.
