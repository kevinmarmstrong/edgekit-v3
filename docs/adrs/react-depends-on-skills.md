Audience: contributor

# ADR: React Depends On Skills

`@kevinmarmstrong/edgekit-react` depends on `@kevinmarmstrong/edgekit-skills` so React adopters can apply Mission Profiles through the same typed profile contract used by the web component. The alternative is to re-declare profile and Skill-facing types in React or force every React app to manually bridge profile application outside the wrapper. Keeping the dependency preserves the Primitives -> Skills -> Profiles model while leaving core independent of the React package.
