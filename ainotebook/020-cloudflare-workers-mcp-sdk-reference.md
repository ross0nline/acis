---
id: ADR-020
title: Cloudflare Workers MCP SDK — Technical Reference
status: reference
date: 2026-06-10
author: AIBuddy
tags: [mcp, cloudflare, agents-sdk, remote-mcp, mcpagent]
---

# ADR-020: Cloudflare Workers MCP SDK — Technical Reference

This is a dense technical reference for wrapping a Cloudflare Workers REST API as an MCP server. The goal is enough spec-level detail to write a design document for exposing ACIS endpoints as MCP tools.

---

## 1. Package Names and Installation

There are **two distinct packages** — do not confuse them:

| Package | Purpose | Status |
|---|---|---|
| `agents` | Cloudflare Agents SDK — includes `McpAgent`, `createMcpHandler` | **Production** |
| `workers-mcp` | Older cloudflare/workers-mcp repo — `WorkerEntrypoint` + `ProxyToSelf` pattern | **Deprecated / legacy** |
| `@cloudflare/mcp-server-cloudflare` | Cloudflare's own published MCP server (uses their own APIs) | Not the SDK |

**Use the Agents SDK:**

```bash
npm install agents zod
npm install @modelcontextprotocol/sdk
```

The `agents` package ships `McpAgent` and `createMcpHandler` from the `agents/mcp` subpath. It is part of `cloudflare/agents` on GitHub. No separate `@cloudflare/workers-mcp` install needed for modern implementations.

---

## 2. Two Implementation Patterns

### Pattern A: `McpAgent` (stateful, Durable Object-backed)

Use when you need per-session state, elicitation, or SSE legacy transport. Each MCP client session gets its own Durable Object instance with persistent SQLite storage.

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export class MyMCP extends McpAgent<Env, State, Props> {
  server = new McpServer({
    name: "ACIS MCP",
    version: "1.0.0",
  });

  initialState: State = { counter: 0 };

  async init() {
    // Called once per DO instance. Register all tools here.
    this.server.tool(
      "get_incidents",
      "List open compliance incidents",
      { status: z.enum(["Open", "Closed", "All"]).optional() },
      async ({ status }) => {
        // call upstream REST API or D1 directly
        return { content: [{ type: "text", text: "..." }] };
      }
    );
  }
}
```

`McpAgent` generic type parameters: `McpAgent<Env, State, Props>`
- `Env` — wrangler bindings interface
- `State` — persisted DO state type (defaults to `unknown`)
- `Props` — auth context injected from the fetch handler (defaults to `unknown`)

### Pattern B: `createMcpHandler` (stateless, no DO required)

Use for read-only tool exposure over simple REST. Creates a new server instance per request (required by MCP SDK 1.26.0+ to prevent cross-client response leaks).

```typescript
import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function createServer() {
  const server = new McpServer({ name: "ACIS MCP", version: "1.0.0" });
  server.tool("hello", "Greet", { name: z.string().optional() }, async ({ name }) => ({
    content: [{ type: "text", text: `Hello, ${name ?? "World"}!` }],
  }));
  return server;
}

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    const server = createServer(); // new instance per request — mandatory
    return createMcpHandler(server)(request, env, ctx);
  },
};
```

`createMcpHandler` signature:
```typescript
function createMcpHandler(
  server: McpServer,
  options?: CreateMcpHandlerOptions,
): (request: Request, env: unknown, ctx: ExecutionContext) => Promise<Response>;
```

---

## 3. Tool Definition — Zod Schemas, Parameters, Return Types

Tools are registered on the `McpServer` instance via `.tool()` or `.registerTool()`:

```typescript
// Short form (no description on tool itself)
server.tool(
  "tool_name",
  { param: z.string(), count: z.number() },
  async ({ param, count }) => ({
    content: [{ type: "text", text: "result" }],
  })
);

// Long form (with description + output schema)
server.registerTool(
  "tool_name",
  {
    title: "Human Title",
    description: "What this tool does — AI reads this to decide when to call it.",
    inputSchema: {
      param: z.string().describe("What this param is"),
      count: z.number().describe("How many to return"),
      tags: z.array(z.string()).optional().describe("Filter by tags"),
      status: z.enum(["Open", "Closed"]).describe("Filter by status"),
    },
    outputSchema: z.looseObject({}).describe("Structured output"),
  },
  async (params) => ({
    content: [{ type: "text", text: "human-readable result" }],
    structuredContent: { /* parsed data */ },
  })
);
```

Return type from a tool handler:
```typescript
type ToolResult = {
  content: Array<{ type: "text"; text: string } | { type: "image"; ... }>;
  structuredContent?: Record<string, unknown>; // if outputSchema defined
  isError?: boolean;
};
```

Error signaling:
```typescript
return {
  content: [{ type: "text", text: `Error: ${err.message}` }],
  isError: true,
};
```

---

## 4. SSE Transport and Fetch Handler Routing

### Transport Status (as of 2026)

| Transport | Path | Status |
|---|---|---|
| Streamable HTTP | `/mcp` | **Current standard** (March 2025+) |
| SSE | `/sse` | **Deprecated** — support legacy clients only via `McpAgent` |

### Authless routing pattern (McpAgent, Streamable HTTP)

```typescript
// The explicit version of what McpAgent.serve() does internally
const mcpHandler = MyMCP.serve("/mcp");

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/mcp") {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }
    // other routes...
    return new Response("Not found", { status: 404 });
  },
};
```

### `McpAgent.serve()` static method

```typescript
// Simplest form — hands the entire worker fetch to the MCP agent
export default MyMCP.serve("/mcp");

// With options
export default MyMCP.serve("/mcp", { jurisdiction: "eu" }); // "eu" | "fedramp"
```

`McpAgent.serve()` handles session routing via `mcp-session-id` request header automatically. For SSE legacy: `MyMCP.serveSSE("/sse")`.

### Session routing when mixing MCP + other endpoints

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }
    // REST API routes, health checks, etc.
    return handleRestApi(request, env, ctx);
  },
};
```

---

## 5. Auth Pattern — Bearer Token Without OAuth

The official pattern (from `jmorrell-cloudflare/mcp-bearer-auth-example`) — check Authorization header in the fetch handler before delegating to McpAgent:

```typescript
const mcpAgent = MyMcp.mount("/sse", {
  binding: "MCP_OBJECT",
  corsOptions: {
    origin: "*",
    methods: "GET, POST, OPTIONS",
    headers: "Content-Type, Authorization",
  },
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const isMcpRoute =
      url.pathname === "/sse" || url.pathname === "/sse/message";

    if (isMcpRoute) {
      const accessToken = request.headers
        .get("Authorization")
        ?.replace("Bearer ", "");

      if (!accessToken) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Validate token against env secret
      if (accessToken !== env.MCP_SECRET) {
        return new Response("Forbidden", { status: 403 });
      }

      // Inject token into ctx.props — available as this.props.accessToken in McpAgent
      (ctx as any).props = { accessToken };

      return mcpAgent.fetch(request, env, ctx);
    }

    return otherRoutes(request, env, ctx);
  },
};
```

The `ctx.props` object survives DO hibernation/resume cycles — McpAgent stores and restores it. This means auth context (user identity, token, permissions) is available in `this.props` throughout the tool handler lifetime.

For role-based conditional tool registration:
```typescript
async init() {
  // Always available
  this.server.tool("read_incidents", ...);

  // Only registered if token grants admin scope
  if (this.props.scope === "admin") {
    this.server.tool("delete_incident", ...);
  }
}
```

**OAuth alternative** — `@cloudflare/workers-oauth-provider` wraps the fetch handler:
```typescript
export default new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: MyMCP.serve("/mcp"),
  defaultHandler: GitHubHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
```
Requires `OAUTH_KV` KV namespace for token storage.

**Known gotcha**: Implementing bearer token auth without the OAuth provider wrapper can cause `IoContext timed out due to inactivity` errors during MCP protocol initialization. The OAuthProvider wrapper provides necessary keep-alive handling. The manual `ctx.props` pattern above avoids this by delegating to `mcpAgent.fetch()` directly after auth.

---

## 6. `wrangler.toml` / `wrangler.jsonc` Changes

McpAgent requires a Durable Object binding and a `new_sqlite_classes` migration. Wrangler recommends `wrangler.jsonc` for new projects.

**Minimal `wrangler.jsonc` for McpAgent:**
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "acis-mcp",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-10",
  "compatibility_flags": ["nodejs_compat"],

  "durable_objects": {
    "bindings": [
      {
        "name": "MCP_OBJECT",
        "class_name": "MyMCP"
      }
    ]
  },

  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["MyMCP"]
    }
  ],

  "observability": {
    "enabled": true
  }
}
```

**If adding OAuth KV:**
```jsonc
"kv_namespaces": [
  { "binding": "OAUTH_KV", "id": "<YOUR_KV_NAMESPACE_ID>" }
]
```

**TOML equivalent:**
```toml
name = "acis-mcp"
main = "src/index.ts"
compatibility_date = "2025-03-10"
compatibility_flags = ["nodejs_compat"]

[[durable_objects.bindings]]
name = "MCP_OBJECT"
class_name = "MyMCP"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["MyMCP"]

[observability]
enabled = true
```

Key requirements:
- `nodejs_compat` flag is **mandatory** — agents depend on Node.js crypto, streams, and net APIs
- `compatibility_date` must be 2025-03-10 or later (2025-09-15+ preferred for full feature set)
- `new_sqlite_classes` (not `new_classes`) — this gives the DO its own embedded SQLite database
- The `name` in the DO binding must match the env type declaration

---

## 7. Adding MCP to an Existing Worker vs. Standalone Worker

**You can add MCP to an existing Worker.** The pattern is fetch handler routing:

```typescript
// Existing worker that already has REST endpoints
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // New MCP surface — route before existing handlers
    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      const token = request.headers.get("Authorization")?.replace("Bearer ", "");
      if (!token || token !== env.MCP_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }
      (ctx as any).props = { token };
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Existing REST API routes unchanged
    return existingRouter(request, env, ctx);
  },
};
```

**Constraints when co-locating:**
1. The McpAgent class must be exported from the same Worker entry file (or re-exported) — Wrangler needs it for the DO binding.
2. The `wrangler.toml` must add the DO binding and migration — this triggers a DO migration on next deploy.
3. The migration (`new_sqlite_classes`) applies globally to the Worker, not per-route. It will not affect existing non-MCP functionality but does require a deploy-time migration acknowledgment.

**Recommendation for ACIS**: Add a separate Worker (`acis-mcp`) with a Cloudflare Service Binding to the main `acis` worker. This keeps the compliance-critical Worker isolated from the DO migration risk and deployment blast radius.

---

## 8. Known Limitations and Gotchas

| Issue | Detail |
|---|---|
| **New server instance per request** | `createMcpHandler` pattern requires creating `new McpServer()` inside the fetch handler, not at module scope. Global instances cause cross-client data leaks (MCP SDK 1.26.0+). |
| **IoContext timeout** | Manual bearer auth without OAuthProvider can timeout during MCP handshake. Use the `ctx.props` + `mcpAgent.fetch()` delegation pattern instead. |
| **SSE deprecated** | `/sse` endpoint still works via `McpAgent.serveSSE()` but is deprecated. Streamable HTTP (`/mcp`) is the standard. |
| **DO migrations are one-way** | Adding `new_sqlite_classes` to an existing Worker triggers an irreversible migration. Plan the DO class name carefully. |
| **`init()` runs once per DO instance** | Tool registration in `init()` is not re-run on subsequent requests to the same session. If you need request-scoped tool visibility (e.g., based on a JWT claim that changes), use the fetch handler auth gate instead. |
| **`nodejs_compat` required** | Missing this flag causes cryptic runtime failures in the agents SDK. |
| **No browser-native MCP client** | The `/mcp` endpoint cannot be accessed directly in a browser — it requires an MCP-aware client or `mcp-remote` proxy. |
| **Streamable HTTP resumability** | The transport is resumable via `Last-Event-ID` header, which handles idle-stream watchdog timeouts in long-running sessions. |
| **Hibernation is automatic** | All McpAgent instances use WebSocket Hibernation API by default — no code changes needed. You only pay for compute when the agent processes requests. |
| **`workers-mcp` package is legacy** | The `workers-mcp` / `ProxyToSelf` pattern (cloudflare/workers-mcp repo) predates the Agents SDK. It required a local Node.js proxy sidecar and JSDoc annotations instead of Zod schemas. Do not use for new implementations. |
| **DO free tier** | Durable Objects are available on the Workers paid plan. Free tier does not include DOs — MCP servers using McpAgent require a paid account. |

---

## 9. Quick Reference — ACIS Wrapping Pattern

To wrap `acis` REST endpoints as MCP tools using bearer token auth:

1. Install: `npm install agents @modelcontextprotocol/sdk zod`
2. Define `class AcisMCP extends McpAgent<Env, {}, { token: string }>` in `src/mcp.ts`
3. In `init()`, register tools that call `fetch()` against the ACIS REST API (or use the D1 binding directly for read operations)
4. In the fetch handler, check `Authorization: Bearer <ACIS_ADMIN_TOKEN>` before routing to `AcisMCP.serve("/mcp")`
5. Add DO binding + migration to `wrangler.toml`
6. Deploy endpoint: `https://acis.rossonlineservices.com/mcp`

MCP client config for Claude Desktop:
```json
{
  "mcpServers": {
    "acis": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://acis.rossonlineservices.com/mcp",
        "--header",
        "Authorization: Bearer YOUR_TOKEN"
      ]
    }
  }
}
```

---

## Sources

- [Build a Remote MCP server — Cloudflare Agents docs](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [createMcpHandler API Reference — Cloudflare Agents docs](https://developers.cloudflare.com/agents/model-context-protocol/mcp-handler-api/)
- [McpAgent API Reference — Cloudflare Agents docs](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/)
- [Transport — Cloudflare Agents docs](https://developers.cloudflare.com/agents/model-context-protocol/transport/)
- [Authorization — Cloudflare Agents docs](https://developers.cloudflare.com/agents/model-context-protocol/authorization/)
- [Agents SDK Configuration — Cloudflare docs](https://developers.cloudflare.com/agents/api-reference/configuration/)
- [cloudflare/ai demos/remote-mcp-authless (GitHub)](https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless)
- [jmorrell-cloudflare/mcp-bearer-auth-example (GitHub)](https://github.com/jmorrell-cloudflare/mcp-bearer-auth-example)
- [Build and deploy Remote MCP servers to Cloudflare (blog)](https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/)
- [Building AI agents with MCP, authn/authz, and DOs (blog)](https://blog.cloudflare.com/building-ai-agents-with-mcp-authn-authz-and-durable-objects/)
