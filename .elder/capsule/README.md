# Portable Elder Capsule

This repository contains its own pinned Elder Protocol 0.5.1 runtime.

Run `./elder.ps1 validate` to create or refresh the ignored tooling environment. The product's
own virtual environment and dependencies remain separate.

Initial personalization:

1. Start Codex in the product repository.
2. Ask it to read `.elder/capsule/START_PROJECT_PROMPT.md`.
3. Complete the Wayfinder interview and approve the generated profile.
4. Preview and compile the project-specific Elder overlay.
5. Configure the ignored `.elder/runtime/memory.env`.
6. Restart Codex and run live memory activation.

The capsule wheel and manifest are versioned. `.elder/runtime/` is derived local state.
