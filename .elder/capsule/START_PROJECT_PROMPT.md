# Start This Product Under Elder Protocol

You are initializing or adopting this repository under its repository-local Elder capsule.
Do not implement the product yet.

## Phase 1: Verify The Local Elder Capsule

1. Inspect the current repository without modifying product-owned files.
2. Read `.elder/capsule/README.md` and `.elder/capsule/manifest.json`.
3. Run `./elder.ps1 capsule status --project-root .`.
4. Run `./elder.ps1 validate`.
5. Stop and report the exact blocker if capsule verification or protocol validation fails.

## Phase 2: Understand The Product

Interview the human owner. Ask only the unanswered questions required to establish:

- product name and concise mission;
- target users and the job they need completed;
- measurable success outcomes;
- explicit failure outcomes and unacceptable behavior;
- constraints, non-goals, deadlines, and budget limits;
- whether this is a new repository or an existing product;
- repository topology, languages, frameworks, package managers, and deployment targets;
- lifecycle: prototype, production, or regulated;
- risk tier and data sensitivity;
- maximum agent autonomy;
- accountable human, product, architecture, security, release, and code owners;
- authoritative repository, document, data, and external knowledge sources;
- required capability packs and any forbidden skills;
- whether the product itself needs application memory, kept separate from mandatory Elder
  build memory.

Do not invent missing answers. Restate the resulting project model and unresolved questions
before generating files.

## Phase 3: Create And Ratify The Profile

Write the agreed intake answers to:

`.elder/runtime/bootstrap/intake-answers.json`

Use `.elder/capsule/intake-answers.example.json` only as the field-shape example. Then run:

```powershell
./elder.ps1 intake `
  --answers .elder/runtime/bootstrap/intake-answers.json `
  --output .elder/runtime/bootstrap/draft-profile.json
```

Present the complete draft profile to the human owner. Do not ratify it without explicit
approval. After approval, run:

```powershell
./elder.ps1 ratify-profile `
  --profile .elder/runtime/bootstrap/draft-profile.json `
  --approved-by <human-owner-identity> `
  --output .elder/runtime/bootstrap/ratified-profile.json
```

## Phase 4: Safely Personalize The Repository

If this repository already contains work, inspect Git status and preserve the current state.
Run:

```powershell
./elder.ps1 compile `
  --profile .elder/runtime/bootstrap/ratified-profile.json `
  --output . `
  --dry-run `
  --diff
```

Review every proposed path. Do not use `--force` to replace an existing project-owned
`AGENTS.md`, `ARCHITECTURE.md`, or governed document. Stop and propose an explicit
reconciliation when paths conflict.

After human approval of the dry-run:

```powershell
./elder.ps1 compile `
  --profile .elder/runtime/bootstrap/ratified-profile.json `
  --output .
```

Verify that the repository now contains `AGENTS.md`, `.codex/`, the compiled `.elder/`
contracts, and `.elder/memory/trusted.json`.

## Phase 5: Configure Mandatory Build Memory

Create `.elder/runtime/memory.env` from `.env.example`. The `.elder/runtime/` boundary is
ignored by the compiled repository contract, so this does not overwrite or depend on a
product-owned root `.env`. The Elder Azure values are development-governance credentials, not
product runtime credentials.

Run:

```powershell
./elder.ps1 dreaming readiness `
  --project-root . `
  --env-file .elder/runtime/memory.env `
  --live
```

Stop if Mem0, embeddings, Qdrant, or Luna readiness fails.

## Phase 6: Restart And Activate

Tell the human owner to restart Codex in this repository so the compiled `AGENTS.md`,
`.codex/config.toml`, and native Elder skills are loaded. In the new session, read
`AGENTS.md` and run:

```powershell
./elder.ps1 session activate `
  --project-root . `
  --task "<current product request>" `
  --env-file .elder/runtime/memory.env `
  --memory-live `
  --output .elder/runtime/activation.json
```

Confirm that activation returned `status: ready` and `build_memory.status: ready`. Summarize
the recalled build memory, routed skills, boundaries, risks, and verification ladder.

Only then propose the smallest evidence-bearing implementation plan. During work, follow the
project's generated Elder contracts. Before declaring completion, run the required tests and
`./elder.ps1 session close` with immutable evidence so Mem0 can propose new build-memory
candidates. Never self-promote those candidates.
