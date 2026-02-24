# agent-workflow – ngDiagram Services & Architecture

Angular application that visualises AI-agent / Spring Modulith communication graphs
using **ng-diagram v1.0.0** and Angular 18 standalone components.

The implementation follows the
[ngDiagram Services](https://www.ngdiagram.dev/docs/intro/services/) and
[ngDiagram Architecture](https://www.ngdiagram.dev/docs/intro/architecture/)
documentation to demonstrate proper separation of concerns and reactive state
management.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Angular Application                                 │
│                                                      │
│  ┌──────────────┐     HTTP     ┌──────────────────┐  │
│  │ GraphApi     │────────────▶│ /api/graph       │  │
│  │ Service      │             │  (mock-server.js  │  │
│  │ (Angular DI) │◀── JSON ────│   or real backend)│  │
│  └──────┬───────┘             └──────────────────┘  │
│         │ graph data                                  │
│         ▼                                            │
│  ┌─────────────────────────────────────────────────┐ │
│  │  GraphComponent  (provideNgDiagram())           │ │
│  │                                                 │ │
│  │  inject(NgDiagramService)         ← init events │ │
│  │  inject(NgDiagramModelService)    ← node/edge Δ │ │
│  │  inject(NgDiagramSelectionService)← selection   │ │
│  │  inject(NgDiagramViewportService) ← zoom / fit  │ │
│  │                                                 │ │
│  │  <ng-diagram [model]="model">                   │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Key design decisions

| Concern | Where it lives | ngDiagram API used |
|---------|----------------|-------------------|
| Fetching graph JSON | `GraphApiService` (root-level Angular service) | — |
| Mapping JSON → model nodes/edges | `GraphApiService.toModelData()` | `initializeModel` |
| Reacting to diagram ready | `GraphComponent.onDiagramInit()` | `NgDiagramService.addEventListenerOnce('diagramInit', …)` |
| Live node / edge counts | `GraphComponent` template | `NgDiagramModelService.nodes()` / `.edges()` signals |
| Selection details panel | `GraphComponent` template | `NgDiagramSelectionService.selection()` signal |
| Fit-view / Zoom toolbar | `GraphComponent` methods | `NgDiagramViewportService.zoomToFit()` / `.zoom()` |

---

## ngDiagram Services used

### `NgDiagramService`
The central service for diagram lifecycle and configuration.

```typescript
readonly diagramService = inject(NgDiagramService);

// One-shot listener: auto-fit after diagram is ready
this.diagramService.addEventListenerOnce('diagramInit', () => {
  this.viewportService.zoomToFit({ padding: 40 });
});

// Reactive signal: gate toolbar buttons on initialisation
diagramService.isInitialized()  // Signal<boolean>
```

### `NgDiagramModelService`
Reactive access to the current model state.

```typescript
readonly modelService = inject(NgDiagramModelService);

// Display live element counts
modelService.nodes()  // Signal<Node[]>
modelService.edges()  // Signal<Edge[]>
```

### `NgDiagramSelectionService`
Track which nodes / edges the user has selected.

```typescript
readonly selectionService = inject(NgDiagramSelectionService);

// Selection panel driven entirely by this reactive signal
selectionService.selection()  // Signal<{ nodes: Node[], edges: Edge[] }>
```

### `NgDiagramViewportService`
Programmatic camera control.

```typescript
readonly viewportService = inject(NgDiagramViewportService);

// Fit all content into view
this.viewportService.zoomToFit({ padding: 40 });

// Zoom in / out by a factor
this.viewportService.zoom(1.2);  // +20 %
this.viewportService.zoom(0.8);  // −20 %

// Guard buttons with reactive signals
viewportService.canZoomIn()   // Signal<boolean>
viewportService.canZoomOut()  // Signal<boolean>
```

---

## Project structure

```
agent-workflow/
├── graph-mock.json          # Shared mock graph data
├── mock-server.js           # Node.js mock API server (no external deps)
└── ngdiagram-app/           # Angular 18 application
    ├── proxy.conf.json      # Dev-server proxy: /api → localhost:3000
    └── src/
        ├── styles.scss      # @import 'ng-diagram/styles.css'
        └── app/
            ├── app.component.ts
            ├── app.config.ts
            ├── services/
            │   ├── graph-api.service.ts       # HTTP + model mapping
            │   └── graph-api.service.spec.ts  # Unit tests
            └── graph/
                └── graph.component.ts         # Diagram + ngDiagram services
```

---

## Running locally

### 1 · Start the mock API

```bash
node mock-server.js
# Listening on http://localhost:3000
# GET /api/graph
# GET /api/graph?view=agents
# GET /api/graph?includeLayout=true
```

### 2 · Start the Angular app

```bash
cd ngdiagram-app
npm install
npm start          # http://localhost:4200  (proxies /api → port 3000)
```

If the mock server is not running the app falls back to the bundled
`src/assets/graph-mock.json` and shows an info banner.

### 3 · Run unit tests

```bash
cd ngdiagram-app
npm test
```

---

## Graph data model

```json
{
  "nodes": [
    { "id": "orchestrator", "name": "Orchestrator", "type": "agent",  "status": "healthy" }
  ],
  "links": [
    { "id": "l1", "source": "orchestrator", "target": "planner", "label": "delegates", "channel": "HTTP" }
  ],
  "layoutHints": [
    { "id": "orchestrator", "x": 100, "y": 80 }
  ]
}
```

`type` values: `agent` | `module` | `broker`  
`status` values: `healthy` | `warn` | `offline`

### API endpoints (mock-server.js)

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| GET | `/api/graph` | `view=all\|agents\|modules`, `includeLayout=true\|false` | Full communication graph |

---

## References

- [ngDiagram Services docs](https://www.ngdiagram.dev/docs/intro/services/)
- [ngDiagram Architecture docs](https://www.ngdiagram.dev/docs/intro/architecture/)
- [ng-diagram npm package](https://www.npmjs.com/package/ng-diagram)
- [Angular 18 standalone components](https://angular.dev/guide/components/importing)
