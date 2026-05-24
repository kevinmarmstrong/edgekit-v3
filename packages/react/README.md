# @kevinmarmstrong/edgekit-react

React primitives for Edgekit.

Use the package when a React app wants idiomatic hooks while keeping Edgekit's browser-native runtime and web component renderer.

```tsx
import { EdgeChat, useEdgeAgent } from '@kevinmarmstrong/edgekit-react'

function Assistant({ agent }) {
  const edge = useEdgeAgent(agent)

  return (
    <>
      <EdgeChat
        systemPrompt="You are a concise app assistant."
        onReady={chat => chat.useAgent?.(agent)}
      />
      {edge.state.activities.map(activity => (
        <p key={activity.id}>{activity.label}</p>
      ))}
    </>
  )
}
```

The React package does not replace `@kevinmarmstrong/edgekit-ui`; it wraps the same `<edge-chat>` element and provides a small state controller for custom React surfaces.
