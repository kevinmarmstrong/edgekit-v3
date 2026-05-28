Audience: contributor

# ADR: UI Depends On Skills

`@kevinmarmstrong/edgekit-ui` depends on `@kevinmarmstrong/edgekit-skills` because `<edge-chat>` is the primary adopter surface for applying Mission Profiles and rendering profile-aware workflow guidance. The alternative is to make every host app manually translate Skills and Mission Profiles into UI configuration before mounting the component, adding friction at the exact point Edgekit is meant to absorb. The dependency keeps profile composition discoverable while core remains the unopinionated runtime harness.
