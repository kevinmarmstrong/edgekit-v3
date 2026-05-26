# Testing Outcome Quality

Do not stop at "the code ran." Test whether the agent achieved the user outcome.

## Required Categories

- `answerQuality`
- `synthesisFaithfulness`
- `safety`
- `workflowState`
- `generativeUi`
- `observability`
- `integrationTransparency`

## Example: Catalog Query

Prompt: `how much are Nike dunks and what sizes are carried?`

Passing output must show:

- Nike Dunk Low
- `$64.99`
- sizes 9, 10, 11
- White / Black
- no cart mutation

## Example: Mutating Workflow

Prompt: `find me size nine white nike dunks and put in cart`

Passing output must:

- search first
- request approval before `addToCart`
- add size 9 only after approval
- leave cart unchanged after rejection

## Harness Rule

Add or update scenario and rubric checks before tuning a demo-specific response. Edgekit quality is measured by final user-visible text, generated UI, approval boundaries, telemetry, and app state.

## Skill Optimization Rule

When improving Skills or Mission Profiles, split prompts into train, selection, and held-back test sets. Accept a candidate edit only when it strictly improves held-out validation and keeps safety, workflow state, approval boundaries, and answer faithfulness green. Report per-skill effect sizes instead of hiding gains or regressions inside an aggregate score.
