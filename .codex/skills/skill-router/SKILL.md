---
name: skill-router
description: "Use at governed intake to deterministically rank repo-local skills from task language, selected capability packs, and declared skill dependencies."
---

# Skill Router

Route from declared metadata before loading full skill bodies.

## Workflow

1. Read the task and selected capability packs.
2. Score skill names, descriptions, triggers, and capabilities.
3. Exclude forbidden or unselected-pack skills.
4. Include declared dependencies before the matched skill.
5. Return a short ordered route with the matching evidence.
6. Escalate to Wayfinder when no route has meaningful evidence.

Routing is advisory. It does not grant tool or mutation authority.
