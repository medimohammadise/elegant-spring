# JPA Domain Model Diagram Viewer

This repository renders a backend-provided domain model in **ng-diagram** inside a **CoreUI Angular admin shell** and exposes entity details in a right-hand properties panel.

Current focus:
- backend contract for JPA entities and relationships
- live diagram rendering over REST + WebSocket
- entity inspection in a sidebar
- sample domain: `Employee`, `Department`, `Salary`

## Architecture

- `mcp-server/`
  - Node.js + TypeScript
  - uses the official `@modelcontextprotocol/sdk` TypeScript library
  - validates incoming payloads with `zod`
  - persists the latest snapshot in `mcp-server/data/current-diagram.json`
  - exposes a real MCP server over `stdio`
  - serves `GET /api/diagram`
  - broadcasts updates over `ws://localhost:3100/ws/diagram`
- `ngdiagram-app/`
  - Angular 18 + CoreUI + `ng-diagram`
  - CoreUI dashboard shell with sidebar, top navigation, breadcrumbs, and footer
  - dedicated `Domain Model` route for the entity diagram
  - floating bottom-right `AI Chat` client launcher
  - loads the initial graph from `/api/diagram`
  - listens for WebSocket updates
  - renders the model and a properties sidebar

## Domain Model Payload

The server now expects JPA-oriented metadata rather than generic node blobs.

### Entity shape

```json
{
  "id": "employee",
  "label": "Employee",
  "type": "entity",
  "status": "healthy",
  "layoutHint": { "x": 180, "y": 140 },
  "metadata": {
    "kind": "jpa-entity",
    "packageName": "com.example.hr.domain",
    "tableName": "employees",
    "idField": "id",
    "description": "Core workforce record.",
    "annotations": ["@Entity", "@Table(name = \"employees\")"],
    "businessRules": ["Every employee must belong to a department."],
    "fields": [
      {
        "name": "id",
        "type": "Long",
        "column": "id",
        "id": true,
        "nullable": false
      },
      {
        "name": "department",
        "type": "Department",
        "column": "department_id",
        "nullable": false
      }
    ]
  }
}
```

### Relationship shape

```json
{
  "id": "employee-department",
  "source": "employee",
  "target": "department",
  "label": "@ManyToOne",
  "channel": "JPA",
  "metadata": {
    "relationType": "ManyToOne",
    "sourceField": "department",
    "targetField": "employees",
    "cardinality": "N:1",
    "owningSide": true,
    "fetch": "LAZY"
  }
}
```

### Validation rules

- `entities` must be non-empty
- relationship `source` and `target` must reference existing entities
- entity metadata must match the JPA schema
- relationship metadata must use one of:
  - `OneToOne`
  - `OneToMany`
  - `ManyToOne`
  - `ManyToMany`

Validation lives in [contracts.ts](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/src/contracts.ts).

## Sample Domain

The server boots with a default sample domain stored in [current-diagram.json](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/data/current-diagram.json):

- `Employee`
- `Department`
- `Salary`

Sample payload is also stored in [graph-mock.json](/Users/mehdi/MyProject/elegent-spring-diagram/graph-mock.json).

Relationships in the sample:
- `Employee -> Department` via `@ManyToOne`
- `Employee -> Salary` via `@OneToOne`

## UI Behavior

The Angular graph view is implemented in [graph.component.ts](/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts).

Current behavior:
- the app opens inside a CoreUI dashboard layout
- top bar includes:
  - `Dashboard`
  - `Users`
  - `Settings`
- sidebar includes:
  - `Dashboard`
  - `Domain Model`
- a bottom-right `AI Chat` launcher opens a CoreUI offcanvas assistant panel
- entities render as selectable nodes
- a minimap appears after `diagramInit`
- larger diagrams auto-fit to the visible canvas on load or restore when the saved viewport no longer matches the current graph
- clicking an entity opens the right sidebar
- sidebar shows:
  - description
  - table name
  - package
  - primary key
  - annotations
  - fields
  - business rules
  - relationships connected to that entity

The sidebar currently uses entity selection as the main inspection path for relationships. Relationship metadata is shown inside the selected entity’s `Relationships` section.

For large diagrams, use `Reset / Load -> Fit to Screen` to reframe the current graph after importing a saved layout or switching between samples with very different sizes.

## Routes

- `/#/dashboard`
  - CoreUI starter-style dashboard page
- `/#/domain-model`
  - NgDiagram entity view in a CoreUI-standardized workspace
- `/#/users`
  - placeholder page
- `/#/settings`
  - placeholder page

## Run Locally

Terminal A:

```bash
cd mcp-server
npm install
npm run dev
```

Terminal B:

```bash
cd ngdiagram-app
npm install
npm start
```

Open:

```bash
http://localhost:4200
```

## Run As A Real MCP Server

Build the server first:

```bash
cd mcp-server
npm install
npm run build
```

Then run the stdio MCP entrypoint:

```bash
npm run start:mcp
```

This MCP server exposes:

- tools:
  - `get_current_diagram`
  - `get_entity_details`
  - `set_current_diagram`
  - `reset_sample_diagram`
- resources:
  - `diagram://current`
  - `diagram://entities/{entityId}`
- prompts:
  - `generate-jpa-diagram-json`

The HTTP dashboard server and the stdio MCP server share the same persisted file state, so updates made through MCP are visible to the Angular dashboard.

## IntelliJ IDEA Setup

If you want to run the Node services inside IntelliJ IDEA first:

1. Open `/Users/mehdi/MyProject/elegent-spring-diagram`.
2. Configure a Node interpreter in `Settings -> Languages & Frameworks -> Node.js`.
3. Create an `npm` run configuration for [mcp-server/package.json](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/package.json) with script `dev`.
4. Create another `npm` run configuration for [ngdiagram-app/package.json](/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/package.json) with script `start`.
5. Create a third `npm` run configuration for [mcp-server/package.json](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/package.json) with script `start:mcp` after you have run `npm run build`.

Use the first configuration for the dashboard backend, the second for the Angular UI, and the third when an MCP client should spawn the real MCP server.

## JetBrains / Codex MCP Registration

For local IDE integrations, prefer `stdio`. Official MCP guidance recommends `stdio` for local process-spawned servers and Streamable HTTP for remote deployments.

An example client configuration looks like this:

```json
{
  "mcpServers": {
    "spring-dashboard": {
      "command": "node",
      "args": [
        "/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/dist/stdio.js"
      ]
    }
  }
}
```

If your client supports a working directory field, set it to:

```text
/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server
```

## Post Your Own Domain Model

```bash
curl -X POST http://localhost:3100/api/diagram \
  -H 'Content-Type: application/json' \
  -d @graph-mock.json
```

Or send a custom payload with your own JPA entities and relations.

## API Surface

- `GET /health`
- `GET /api/diagram`
- `POST /api/diagram`
- `WS /ws/diagram`
- `stdio MCP server` via [stdio.ts](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/src/stdio.ts)

## Key Files

- [server.ts](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/src/server.ts)
- [stdio.ts](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/src/stdio.ts)
- [mcp-server.ts](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/src/mcp-server.ts)
- [diagram-store.ts](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/src/diagram-store.ts)
- [current-diagram.json](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/data/current-diagram.json)
- [contracts.ts](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/src/contracts.ts)
- [app.routes.ts](/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/app.routes.ts)
- [default-layout.component.ts](/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/layout/default-layout/default-layout.component.ts)
- [default-header.component.html](/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/layout/default-layout/default-header/default-header.component.html)
- [graph.component.ts](/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/graph.component.ts)
- [diagram-api.service.ts](/Users/mehdi/MyProject/elegent-spring-diagram/ngdiagram-app/src/app/graph/services/diagram-api.service.ts)
- [graph-mock.json](/Users/mehdi/MyProject/elegent-spring-diagram/graph-mock.json)

## Current Limitations

- direct edge-click relationship selection is not the primary interaction path yet
- the Angular build emits a non-blocking component style budget warning for the graph component
- the CoreUI layout shell currently uses placeholder pages for `Users` and `Settings`
- `set_current_diagram` currently accepts the full payload as a JSON string input for broad MCP client compatibility
- Streamable HTTP MCP transport is not implemented yet; the production path here is local `stdio`

## Suggested Next Steps

1. Add explicit edge selection UX and relationship-only sidebar view.
2. Add Spring Boot sample producer code for scanning JPA metadata and sending the payload through MCP.
3. Add Streamable HTTP transport if you need a remote MCP deployment instead of local IDE/client spawning.
