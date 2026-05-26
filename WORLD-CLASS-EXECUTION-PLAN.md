# Edgekit — World-Class Execution Plan

**Created:** 2026-05-26  
**Purpose:** This is the master execution plan to reach the criteria defined in `WORLD-CLASS-DEFINITION.md`.

We will run this in waves. Each wave has clear outcomes, success criteria, and a verification step. The final wave includes a comprehensive test against the Definition of Done.

---

## Guiding Principles

- **Outcome Quality First**: Nothing matters if the research harness (real local models) does not show high scores on realistic missions.
- **Harden Before Expand**: Fix the sharp edges identified in the third-party review before heavily promoting the Skills + Profiles pattern.
- **Visibility**: Every wave will update `LOOP-STATUS.md` with timestamps and concrete progress.
- **Two Personas**: Every major deliverable must consider both the elite programmer and the agent-assisted vibe coder.
- **No Vanity Progress**: We stop a wave only when its success criteria are met or we have a clear, documented reason to adjust.

---

## Current Baseline (as of 2026-05-26)

From `ARCHITECTURE.md` and `LOOP-STATUS.md`:
- Strong primitives and research harness infrastructure.
- Initial `EdgeSkill` + `EdgeMissionProfile` types introduced.
- Two mission profiles exist (public catalog shopping + docs Q&A).
- Some public demos have been partially moved to the new pattern.
- Major gaps remain in: demo quality, onboarding ergonomics, production guidance, and proving the pattern at scale with high outcome quality.

---

## Wave Structure

### Wave 0: Pattern Hardening (Safety & Correctness)

**Goal**: Eliminate the foot-guns and false-positive risks identified in the external review so the public pattern is responsible to promote.

**Key Tasks**:
- Make `profileToAgentOptions()` safe by default (already partially done — complete and verify).
- Fix async issues in `synthesisFaithfulness` harness (already done in previous turn — verify with new run).
- Add a first-class, safe `applyMissionProfile()` / `configureWithProfile()` helper on the chat element and in core.
- Clarify and document the relationship between `registerTools()` (executable) and profile-provided tools.
- Add runtime warnings or validation when a profile attempts to override tools unsafely.
- Write a dedicated section in docs about current limitations of the descriptor fields (synthesis, policy, uiAffordances).

**Success Criteria**:
- No known ways for a profile to silently break executable tool registration.
- The public harness no longer has the `Boolean(Promise)` false-positive risk.
- A new adopter following the docs cannot easily create the problems described in the review.

**Verification**:
- Run the full research harness (strict mode, real local model) after changes.
- Add or update a test that specifically exercises the public Pages ecommerce sidecar action card execution path.

**Dependencies**: None (can start immediately).

---

### Wave 1: Documentation & Mental Model Dominance

**Goal**: Make the three-layer model (Primitives → Skills → Mission Profiles) the clearly dominant and best-documented way to use Edgekit.

**Key Tasks**:
- Update README to lead with the new pattern (partially done).
- Significantly expand `ARCHITECTURE.md` with diagrams, decision records, and upgrade stories.
- Improve `AGENTS.md` with explicit guidance on when to work in Primitives vs Skills vs Profiles.
- Create a "Mission Profile Authoring Guide" (how to design good Skills, what belongs in a Profile, synthesis rules, etc.).
- Update or replace the current Getting Started materials so the profile-first path is the default story.
- Add clear "Before / After" examples showing raw `configure()` vs Skills + Profile.

**Success Criteria**:
- An elite programmer can explain the architecture and upgrade story after one reading of the key docs.
- An agent-assisted developer can generate a reasonable first draft of a new mission profile using only the documentation + examples.

**Verification**:
- "Dogfood" test: Have the agent (or a simulated new user) create a small new mission profile using only the docs and achieve a passing harness score on first attempt.

---

### Wave 2: Demo & Example Quality

**Goal**: Make the live demos and example profiles feel like real, production-grade surfaces rather than technical demos.

**Key Tasks**:
- Audit and improve all current demo surfaces (ecommerce public site, docs Q&A, admin, AG-UI, mission control).
- Ensure every major demo is primarily implemented via a clean Mission Profile + Skills.
- Add production-oriented notes to each demo (telemetry usage, what would change in a real app, error handling patterns, etc.).
- Create at least one additional realistic mission example (e.g., support workflow or internal tools surface).
- Improve visual and interaction quality of the public demos where it affects perceived production readiness.

**Success Criteria**:
- Demos achieve high harness scores with real local models.
- A competent developer would feel comfortable copying the structure into a real product.

**Verification**:
- Run the research harness against the public-facing demo surfaces (not just the standalone ones).

---

### Wave 3: Onboarding & Time-to-Value

**Goal**: Hit the time-to-value targets in the Definition of Done.

**Key Tasks**:
- Create a "30-Minute to Production Sidecar" guided path for agent-assisted developers.
- Create a "90-Minute Deep Dive" path for elite programmers.
- Build interactive or copy-paste friendly templates for common mission types.
- Add "Troubleshooting & Common Pitfalls" guide based on real harness failures.
- Create a small "Mission Profile Starter Kit" (recommended folder structure, example tests, etc.).

**Success Criteria**:
- A simulated agent-assisted developer can reach a harness-passing sidecar for a realistic mission in under 45 minutes using the materials.
- An elite programmer can integrate a high-quality sidecar into one of their own surfaces in under 90 minutes.

**Verification**:
- Time-boxed "adopter simulation" tests (documented).

---

### Wave 4: Production Readiness

**Goal**: Provide the confidence and guardrails that both personas need to ship to real users.

**Key Tasks**:
- Documented upgrade & migration strategy with examples.
- Best practices guide for telemetry, error handling, testing your own sidecars, and monitoring.
- Clear guidance on local model vs escalation decision frameworks.
- Security & safety checklist for sidecars (PII, approvals, tool policy, audit).
- Versioning and compatibility story for Skills and Profiles.
- "What changes when you go to production" checklist.

**Success Criteria**:
- Both personas have clear, high-confidence answers to the production concerns listed in the Definition of Done.

**Verification**:
- External-style review of the production guidance materials (or simulated via the harness + adoption-quality eval).

---

### Wave 5: Final Verification & Outcome Quality

**Goal**: Prove we have met (or are very close to) the full Definition of Done.

**Key Tasks**:
- Run the complete research harness suite (agents + suite + adoption-quality + model cascade) in strict mode with real local models across all core missions.
- Demonstrate "New Mission Creation" success criteria (a developer/agent creates a new realistic mission and hits ≥ 0.95 on first serious run).
- Run simulated adopter time-to-value tests for both personas.
- Perform an internal "extremely proud" review against the full Definition of Done.
- Create a final release-readiness summary.

**Success Criteria**:
- All measurable criteria in `WORLD-CLASS-DEFINITION.md` are met or have a clear, time-boxed path to completion.
- We (as creators) can confidently say we would recommend this to top-tier teams for real production use today.

---

## Overall Execution Approach

- **Waves are sequential but with overlap**: We can start documentation work while hardening the pattern.
- **Parallel work where possible**: Documentation and demo improvements can often run in parallel with core fixes.
- **Harness is the arbiter**: Any wave that claims progress on outcome quality must show it via the research harness with real local models.
- **Visibility**: Every wave ends with an update to `LOOP-STATUS.md` + a short summary of movement against the world-class criteria.

---

## Final Verification (End of Wave 5)

We will only declare the goals met when we can point to:

1. Passing harness results meeting the quantitative bars.
2. Clear evidence (via simulated or real tests) that both target personas can achieve high-quality results quickly.
3. Documentation and demos that we are genuinely proud of.
4. A production-ready pattern that does not contain the sharp edges identified in the review.

Until then, we keep running the loop.

---

**Next Step**: Once this plan is reviewed and approved, we will begin Wave 0 with concrete tasks, owners, and checkpoints.
