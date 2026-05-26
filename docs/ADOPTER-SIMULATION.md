# Adopter Simulation

Use this protocol to prove Edgekit is understandable for both target users in `WORLD-CLASS-DEFINITION.md`.

The simulation must use only public docs, package APIs, and starter artifacts. Private repo knowledge is a failure signal.

## 30-Minute Agent-Assisted Path

Start from [30-Minute Production Sidecar](./30-MINUTE-PRODUCTION-SIDECAR.md) and the concrete support starter in `docs/templates/mission-profile-starter/`.

Record:

- Start and finish time.
- Files copied or created.
- Every point where the coding agent needed extra clarification.
- Validation output from `validateMissionProfile(profile, { registeredTools })`.
- Outcome scenario scores.

Required sequence:

1. Choose one narrow mission.
2. Copy the support starter and rename it for the app surface.
3. Replace sample tool `execute` bodies with app-owned APIs.
4. Mount `<edge-chat>` and apply the Mission Profile.
5. Register tools and add telemetry.
6. Run the starter outcome scenarios.
7. Tune only Skill/Profile text or scenario expectations unless a reusable Edgekit bug is found.

## 90-Minute Elite Programmer Path

1. Read `ARCHITECTURE.md`, `docs/RUNTIME-GUARANTEES.md`, and `docs/PRODUCTION-READINESS.md`.
2. Inspect core extension points for model routing, tool execution, approvals, telemetry, audit, redaction, identity, and state.
3. Build one profile-owned sidecar against real app tools.
4. Add telemetry, audit, state, identity, and RBAC-filtered tool manifests.
5. Add local outcome scenarios.
6. Run the full test battery and provider matrix.

## Passing Standard

The sidecar must reach average score `>= 0.95` on its first serious harness run after reasonable tuning. The evaluation must include final answer quality, generated UI, approval boundaries, telemetry, app state, and host-app authority.

## Report Format

```md
# Adopter Simulation Report

- Persona: agent-assisted developer | elite programmer
- Mission:
- Time to first working sidecar:
- Time to passing outcome score:
- Validation errors:
- Outcome score:
- Required failures:
- Friction points:
- Fixes made:
- Remaining risks:
```
