Audience: contributor

# ADR: React Depends On UI

`@kevinmarmstrong/edgekit-react` depends on `@kevinmarmstrong/edgekit-ui` because the React package is an idiomatic wrapper around the canonical `<edge-chat>` web component, not a second renderer. The alternative would duplicate Lit component behavior, approval state, EdgeView rendering, and event bridging inside React, which would fragment the UI contract and make fixes land twice. This dependency keeps React as a thin framework adapter over the app-owned UI primitive.
