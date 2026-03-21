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
  - validates incoming payloads with `zod`
  - stores the latest in-memory snapshot
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

The server boots with a default sample domain in [server.ts](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/src/server.ts):

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

## Key Files

- [server.ts](/Users/mehdi/MyProject/elegent-spring-diagram/mcp-server/src/server.ts)
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
- persistence is still in-memory only

## Suggested Next Steps

1. Add explicit edge selection UX and relationship-only sidebar view.
2. Add Spring Boot sample producer code for scanning JPA metadata and posting this payload.
3. Persist snapshots so the latest domain model survives restarts.
