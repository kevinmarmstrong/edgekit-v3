Audience: contributor

# ADR: UI Depends On Governance

`@kevinmarmstrong/edgekit-ui` depends on `@kevinmarmstrong/edgekit-governance` because the UI must render and resume approval-gated actions against the same governance contracts used by the runtime: redaction, audit-ready approval state, and guarded mutation metadata. The alternative is to duplicate governance-adjacent types inside the component package, which would make the browser UI drift from the approval/audit package. The dependency is one-way and keeps the component honest about risky user actions.
