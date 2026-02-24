# ng-diagram

ng-diagram is a robust Angular library for building interactive diagrams, node-based editors, and visual programming interfaces. Built on Angular signals and templates, it provides a complete toolkit for creating sophisticated, customizable, and high-performance diagramming applications with features like draggable nodes, customizable edges, grouping, zoom/pan controls, and an extensible plugin architecture.

The library is Angular-first, leveraging Angular 18+ signals for optimal performance and seamless integration. It supports flow diagrams, node-based editors, network diagrams, mind maps, circuit diagrams, and any custom visualization through custom node and edge templates. Key features include draggable/resizable/rotatable nodes, multiple edge routing options (polyline, bezier, orthogonal), built-in design system with CSS variables, embedded drag-and-drop palette, minimap navigation, and clipboard operations.

## Installation and Setup

Install the package and import required styles in your global stylesheet.

```bash
npm install ng-diagram
```

```css
/* src/styles.scss - IMPORTANT: Import in global file for CSS variables */
@import 'ng-diagram/styles.css';
```

## Basic Diagram Setup

Initialize a model and render the diagram using `NgDiagramComponent` with required providers.

```typescript
import { Component } from '@angular/core';
import { NgDiagramComponent, initializeModel, provideNgDiagram } from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  standalone: true,
  imports: [NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `<ng-diagram [model]="model" />`,
  styles: [`
    :host {
      flex: 1;
      display: flex;
      height: 100%;
    }
  `],
})
export class DiagramComponent {
  model = initializeModel({
    nodes: [
      { id: '1', position: { x: 100, y: 150 }, data: { label: 'Node 1' } },
      { id: '2', position: { x: 400, y: 150 }, data: { label: 'Node 2' } },
    ],
    edges: [
      {
        id: 'e1',
        source: '1',
        sourcePort: 'port-right',
        target: '2',
        targetPort: 'port-left',
        data: {},
      },
    ],
  });
}
```

## NgDiagramComponent Events

The main diagram component emits events for user interactions like selection changes, edge drawing, and node manipulation.

```typescript
import { Component } from '@angular/core';
import {
  NgDiagramComponent,
  initializeModel,
  provideNgDiagram,
  DiagramInitEvent,
  SelectionChangedEvent,
  EdgeDrawnEvent,
  NodeResizedEvent,
  PaletteItemDroppedEvent,
} from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `
    <ng-diagram
      [model]="model"
      [config]="config"
      (diagramInit)="onDiagramInit($event)"
      (selectionChanged)="onSelectionChanged($event)"
      (edgeDrawn)="onEdgeDrawn($event)"
      (nodeResized)="onNodeResized($event)"
      (paletteItemDropped)="onPaletteItemDropped($event)"
    />
  `,
})
export class DiagramComponent {
  model = initializeModel({ nodes: [], edges: [] });
  config = { zoom: { max: 2, zoomToFit: { onInit: true } } };

  onDiagramInit(event: DiagramInitEvent) {
    console.log('Diagram initialized with', event.nodes.length, 'nodes');
  }

  onSelectionChanged(event: SelectionChangedEvent) {
    console.log('Selected nodes:', event.selectedNodes.map(n => n.id));
    console.log('Selected edges:', event.selectedEdges.map(e => e.id));
  }

  onEdgeDrawn(event: EdgeDrawnEvent) {
    console.log('New edge:', event.edge.id, 'from', event.source.id, 'to', event.target.id);
  }

  onNodeResized(event: NodeResizedEvent) {
    console.log('Node resized:', event.node.id, 'new size:', event.node.size);
  }

  onPaletteItemDropped(event: PaletteItemDroppedEvent) {
    console.log('Dropped:', event.node.id, 'at', event.dropPosition);
  }
}
```

## NgDiagramModelService

Provides methods for accessing and manipulating the diagram's model including nodes, edges, and metadata.

```typescript
import { Component, inject, effect } from '@angular/core';
import {
  NgDiagramComponent,
  NgDiagramModelService,
  initializeModel,
  provideNgDiagram,
  Node,
  Edge,
} from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `<ng-diagram [model]="model" />`,
})
export class DiagramComponent {
  private modelService = inject(NgDiagramModelService);
  model = initializeModel({ nodes: [], edges: [] });

  constructor() {
    // Reactive access to model data via signals
    effect(() => {
      console.log('Current nodes:', this.modelService.nodes());
      console.log('Current edges:', this.modelService.edges());
    });
  }

  // Add nodes and edges
  addNode() {
    const newNode: Node = {
      id: 'new-node',
      position: { x: 200, y: 200 },
      data: { label: 'New Node' },
    };
    this.modelService.addNodes([newNode]);
  }

  addEdge() {
    const newEdge: Edge = {
      id: 'new-edge',
      source: 'node-1',
      target: 'node-2',
      data: {},
    };
    this.modelService.addEdges([newEdge]);
  }

  // Update node properties
  updateNode() {
    this.modelService.updateNode('node-1', {
      position: { x: 300, y: 300 },
      selected: true,
    });
  }

  // Update node data with type safety
  updateNodeData() {
    this.modelService.updateNodeData<{ label: string }>('node-1', { label: 'Updated Label' });
  }

  // Delete nodes and edges
  deleteItems() {
    this.modelService.deleteNodes(['node-1', 'node-2']);
    this.modelService.deleteEdges(['edge-1']);
  }

  // Query methods
  queryModel() {
    const node = this.modelService.getNodeById('node-1');
    const connectedEdges = this.modelService.getConnectedEdges('node-1');
    const connectedNodes = this.modelService.getConnectedNodes('node-1');
    const overlapping = this.modelService.getOverlappingNodes('node-1');
    const children = this.modelService.getChildren('group-1');
    const hierarchy = this.modelService.getParentHierarchy('nested-node');

    // Serialize model to JSON
    const json = this.modelService.toJSON();
  }
}
```

## NgDiagramService

Main service providing access to configuration, events, middleware, routing, transactions, and linking.

```typescript
import { Component, inject, effect } from '@angular/core';
import {
  NgDiagramComponent,
  NgDiagramService,
  NgDiagramModelService,
  initializeModel,
  provideNgDiagram,
  Middleware,
  EdgeRouting,
} from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `<ng-diagram [model]="model" />`,
})
export class DiagramComponent {
  private diagramService = inject(NgDiagramService);
  private modelService = inject(NgDiagramModelService);
  model = initializeModel({ nodes: [], edges: [] });

  constructor() {
    // Check initialization status
    effect(() => {
      if (this.diagramService.isInitialized()) {
        console.log('Diagram ready!');
      }
    });

    // Track action state (dragging, resizing, etc.)
    effect(() => {
      console.log('Current action:', this.diagramService.actionState());
    });
  }

  // Update configuration
  updateConfig() {
    this.diagramService.updateConfig({ debugMode: true });
  }

  // Event listeners
  setupEventListeners() {
    const unsubscribe = this.diagramService.addEventListener('selectionChanged', (event) => {
      console.log('Selection changed:', event.selectedNodes);
    });

    // One-time listener
    this.diagramService.addEventListenerOnce('diagramInit', (event) => {
      console.log('Diagram initialized once');
    });

    // Remove specific listener
    this.diagramService.removeEventListener('selectionChanged', unsubscribe);

    // Remove all listeners
    this.diagramService.removeAllEventListeners();
  }

  // Transactions for atomic updates
  async performTransaction() {
    // Synchronous transaction
    this.diagramService.transaction(() => {
      this.modelService.addNodes([{ id: 'n1', position: { x: 0, y: 0 }, data: {} }]);
      this.modelService.addEdges([{ id: 'e1', source: 'n1', target: 'n2', data: {} }]);
    });

    // Async transaction with waitForMeasurements
    await this.diagramService.transaction(async () => {
      const nodes = await fetch('/api/nodes').then(r => r.json());
      this.modelService.addNodes(nodes);
    }, { waitForMeasurements: true });
  }

  // Custom middleware
  registerCustomMiddleware() {
    const myMiddleware: Middleware = {
      name: 'myMiddleware',
      execute: (state, update, helpers, next) => {
        console.log('Processing update:', update);
        return next(state, update, helpers);
      },
    };
    const unregister = this.diagramService.registerMiddleware(myMiddleware);
    // Later: unregister() or this.diagramService.unregisterMiddleware('myMiddleware');
  }

  // Custom edge routing
  registerCustomRouting() {
    const customRouting: EdgeRouting = {
      name: 'custom',
      computePoints: (context) => [context.sourcePosition, context.targetPosition],
      computePath: (points) => `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`,
      computePointOnPath: (points, position) => points[0],
    };
    this.diagramService.registerRouting(customRouting);
    this.diagramService.setDefaultRouting('custom');
  }

  // Manual linking (programmatic edge creation)
  startManualLinking(nodeId: string, portId?: string) {
    const node = this.modelService.getNodeById(nodeId);
    if (node) {
      this.diagramService.startLinking(node, portId);
    }
  }
}
```

## NgDiagramSelectionService

Manages selection state of nodes and edges with reactive signals.

```typescript
import { Component, inject, effect } from '@angular/core';
import {
  NgDiagramComponent,
  NgDiagramSelectionService,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `<ng-diagram [model]="model" />`,
})
export class DiagramComponent {
  private selectionService = inject(NgDiagramSelectionService);
  model = initializeModel({ nodes: [], edges: [] });

  constructor() {
    // Reactive selection tracking
    effect(() => {
      const { nodes, edges } = this.selectionService.selection();
      console.log('Selected:', nodes.length, 'nodes,', edges.length, 'edges');
    });
  }

  // Select specific nodes and edges
  selectItems() {
    this.selectionService.select(['node-1', 'node-2'], ['edge-1']);
  }

  // Deselect specific items
  deselectItems() {
    this.selectionService.deselect(['node-1'], ['edge-1']);
  }

  // Deselect everything
  deselectAll() {
    this.selectionService.deselectAll();
  }

  // Delete current selection
  deleteSelection() {
    this.selectionService.deleteSelection();
  }
}
```

## NgDiagramViewportService

Controls viewport panning, zooming, and coordinate conversion.

```typescript
import { Component, inject, effect } from '@angular/core';
import {
  NgDiagramComponent,
  NgDiagramViewportService,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `<ng-diagram [model]="model" />`,
})
export class DiagramComponent {
  private viewportService = inject(NgDiagramViewportService);
  model = initializeModel({ nodes: [], edges: [] });

  constructor() {
    // Reactive viewport tracking
    effect(() => {
      const viewport = this.viewportService.viewport();
      console.log('Viewport:', viewport.x, viewport.y, 'scale:', viewport.scale);
    });

    // Track zoom capabilities
    effect(() => {
      console.log('Can zoom in:', this.viewportService.canZoomIn());
      console.log('Can zoom out:', this.viewportService.canZoomOut());
    });
  }

  // Move viewport to specific coordinates
  moveViewport() {
    this.viewportService.moveViewport(100, 200);
  }

  // Move viewport by delta
  pan() {
    this.viewportService.moveViewportBy(50, 50);
  }

  // Zoom operations
  zoomIn() {
    this.viewportService.zoom(1.2); // 20% zoom in
  }

  zoomOut() {
    this.viewportService.zoom(0.8); // 20% zoom out
  }

  zoomToCenter(clientX: number, clientY: number) {
    this.viewportService.zoom(1.5, { x: clientX, y: clientY });
  }

  // Fit content in viewport
  zoomToFit() {
    // Fit all content with default padding
    this.viewportService.zoomToFit();

    // Custom padding [top, right, bottom, left]
    this.viewportService.zoomToFit({ padding: [50, 100, 50, 100] });

    // Fit specific nodes only
    this.viewportService.zoomToFit({ nodeIds: ['node-1', 'node-2'] });
  }

  // Center on specific node or rectangle
  centerOnNode(nodeId: string) {
    this.viewportService.centerOnNode(nodeId);
  }

  centerOnRect() {
    this.viewportService.centerOnRect({ x: 100, y: 100, width: 200, height: 150 });
  }

  // Coordinate conversion
  convertCoordinates(clientX: number, clientY: number) {
    const flowPos = this.viewportService.clientToFlowPosition({ x: clientX, y: clientY });
    const clientPos = this.viewportService.flowToClientPosition(flowPos);
    console.log('Flow position:', flowPos, 'Client position:', clientPos);
  }
}
```

## NgDiagramNodeService

Provides methods for manipulating individual nodes including movement, resize, rotation, and z-ordering.

```typescript
import { Component, inject } from '@angular/core';
import {
  NgDiagramComponent,
  NgDiagramNodeService,
  NgDiagramModelService,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `<ng-diagram [model]="model" />`,
})
export class DiagramComponent {
  private nodeService = inject(NgDiagramNodeService);
  private modelService = inject(NgDiagramModelService);
  model = initializeModel({ nodes: [], edges: [] });

  // Move nodes by delta
  moveNodes() {
    const nodes = this.modelService.nodes().filter(n => n.selected);
    this.nodeService.moveNodesBy(nodes, { x: 50, y: 50 });
  }

  // Resize a node (requires autoSize: false)
  resizeNode(nodeId: string) {
    this.nodeService.resizeNode(
      nodeId,
      { width: 200, height: 150 },
      { x: 100, y: 100 }, // optional new position
      true // disable autoSize
    );
  }

  // Rotate a node
  rotateNode(nodeId: string, angle: number) {
    this.nodeService.rotateNodeTo(nodeId, angle); // 0-360 degrees
  }

  // Z-order management
  bringToFront() {
    this.nodeService.bringToFront(['node-1', 'node-2'], ['edge-1']);
  }

  sendToBack() {
    this.nodeService.sendToBack(['node-1'], ['edge-1']);
  }
}
```

## NgDiagramGroupsService

Manages node groups including adding/removing members and highlighting.

```typescript
import { Component, inject } from '@angular/core';
import {
  NgDiagramComponent,
  NgDiagramGroupsService,
  NgDiagramModelService,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `<ng-diagram [model]="model" />`,
})
export class DiagramComponent {
  private groupsService = inject(NgDiagramGroupsService);
  private modelService = inject(NgDiagramModelService);

  model = initializeModel({
    nodes: [
      { id: 'group-1', position: { x: 0, y: 0 }, data: {}, isGroup: true, highlighted: false },
      { id: 'node-1', position: { x: 50, y: 50 }, data: {} },
      { id: 'node-2', position: { x: 150, y: 50 }, data: {} },
    ],
    edges: [],
  });

  // Add nodes to a group
  addToGroup() {
    this.groupsService.addToGroup('group-1', ['node-1', 'node-2']);
  }

  // Remove nodes from a group
  removeFromGroup() {
    this.groupsService.removeFromGroup('group-1', ['node-1']);
  }

  // Highlight group (e.g., during drag over)
  highlightGroup(groupId: string) {
    const nodes = this.modelService.nodes().filter(n => n.groupId === groupId);
    this.groupsService.highlightGroup(groupId, nodes);
  }

  // Clear all highlights
  clearHighlights() {
    this.groupsService.highlightGroupClear();
  }
}
```

## NgDiagramClipboardService

Handles clipboard operations including copy, cut, and paste.

```typescript
import { Component, inject } from '@angular/core';
import {
  NgDiagramComponent,
  NgDiagramClipboardService,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `<ng-diagram [model]="model" />`,
})
export class DiagramComponent {
  private clipboardService = inject(NgDiagramClipboardService);
  model = initializeModel({ nodes: [], edges: [] });

  // Copy current selection
  copy() {
    this.clipboardService.copy();
  }

  // Cut current selection
  cut() {
    this.clipboardService.cut();
  }

  // Paste at specific position
  paste(x: number, y: number) {
    this.clipboardService.paste({ x, y });
  }
}
```

## Custom Node Templates

Create custom node components implementing `NgDiagramNodeTemplate` interface with ports.

```typescript
import { Component, input, computed } from '@angular/core';
import {
  NgDiagramNodeTemplate,
  NgDiagramPortComponent,
  NgDiagramNodeSelectedDirective,
  NgDiagramNodeResizeAdornmentComponent,
  NgDiagramNodeRotateAdornmentComponent,
  Node,
} from 'ng-diagram';

interface CustomNodeData {
  title: string;
  description: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-custom-node',
  standalone: true,
  imports: [
    NgDiagramPortComponent,
    NgDiagramNodeResizeAdornmentComponent,
    NgDiagramNodeRotateAdornmentComponent,
  ],
  hostDirectives: [{ directive: NgDiagramNodeSelectedDirective, inputs: ['node'] }],
  template: `
    <div class="custom-node">
      <h3>{{ node().data.title }}</h3>
      <p>{{ node().data.description }}</p>
      @if (imageUrl()) {
        <img [src]="imageUrl()" alt="Node image" />
      }

      <!-- Input port on left side -->
      <ng-diagram-port id="input" type="target" side="left" />

      <!-- Output port on right side -->
      <ng-diagram-port id="output" type="source" side="right" />

      <!-- Bidirectional port on bottom -->
      <ng-diagram-port id="io" type="both" side="bottom" originPoint="bottomCenter" />
    </div>

    <!-- Optional: resize handles -->
    @if (node().resizable) {
      <ng-diagram-node-resize-adornment />
    }

    <!-- Optional: rotation handle -->
    @if (node().rotatable) {
      <ng-diagram-node-rotate-adornment />
    }
  `,
  styles: [`
    .custom-node {
      background: white;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 16px;
      min-width: 150px;
    }
    :host(.selected) .custom-node {
      border-color: var(--ngd-node-stroke-primary-hover);
    }
  `],
})
export class CustomNodeComponent implements NgDiagramNodeTemplate<CustomNodeData> {
  node = input.required<Node<CustomNodeData>>();
  imageUrl = computed(() => this.node().data?.imageUrl);
}

// Register in template map
import { NgDiagramNodeTemplateMap } from 'ng-diagram';

const nodeTemplateMap = new NgDiagramNodeTemplateMap([
  ['custom', CustomNodeComponent],
]);

// Usage in diagram component
@Component({
  template: `<ng-diagram [model]="model" [nodeTemplateMap]="nodeTemplateMap" />`,
})
export class DiagramComponent {
  nodeTemplateMap = nodeTemplateMap;
  model = initializeModel({
    nodes: [
      {
        id: '1',
        type: 'custom', // matches key in template map
        position: { x: 100, y: 100 },
        data: { title: 'Custom Node', description: 'With custom template' },
        resizable: true,
        rotatable: true,
      },
    ],
    edges: [],
  });
}
```

## Custom Edge Templates

Create custom edge components implementing `NgDiagramEdgeTemplate` interface.

```typescript
import { Component, input, computed } from '@angular/core';
import { NgDiagramEdgeTemplate, NgDiagramBaseEdgeComponent, Edge } from 'ng-diagram';

interface CustomEdgeData {
  label: string;
  color: string;
}

@Component({
  selector: 'app-custom-edge',
  standalone: true,
  imports: [NgDiagramBaseEdgeComponent],
  template: `
    <ng-diagram-base-edge
      [edge]="edge()"
      [routing]="'bezier'"
      [stroke]="edge().data.color"
      [strokeWidth]="2"
      [targetArrowhead]="'arrow'"
    />
    @if (labelPosition()) {
      <foreignObject
        [attr.x]="labelPosition()!.x - 40"
        [attr.y]="labelPosition()!.y - 12"
        width="80"
        height="24"
      >
        <div class="edge-label">{{ edge().data.label }}</div>
      </foreignObject>
    }
  `,
  styles: [`
    .edge-label {
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 12px;
      text-align: center;
    }
  `],
})
export class CustomEdgeComponent implements NgDiagramEdgeTemplate<CustomEdgeData> {
  edge = input.required<Edge<CustomEdgeData>>();

  labelPosition = computed(() => {
    const labels = this.edge().measuredLabels;
    return labels?.[0]?.position;
  });
}

// Register in template map
import { NgDiagramEdgeTemplateMap } from 'ng-diagram';

const edgeTemplateMap = new NgDiagramEdgeTemplateMap([
  ['custom-edge', CustomEdgeComponent],
]);

// Usage
@Component({
  template: `<ng-diagram [model]="model" [edgeTemplateMap]="edgeTemplateMap" />`,
})
export class DiagramComponent {
  edgeTemplateMap = edgeTemplateMap;
  model = initializeModel({
    nodes: [
      { id: '1', position: { x: 100, y: 100 }, data: {} },
      { id: '2', position: { x: 400, y: 100 }, data: {} },
    ],
    edges: [
      {
        id: 'e1',
        type: 'custom-edge',
        source: '1',
        target: '2',
        data: { label: 'Connection', color: '#3b82f6' },
      },
    ],
  });
}
```

## NgDiagramBackgroundComponent

Renders background patterns for the diagram canvas.

```typescript
import { Component } from '@angular/core';
import {
  NgDiagramComponent,
  NgDiagramBackgroundComponent,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent, NgDiagramBackgroundComponent],
  providers: [provideNgDiagram()],
  template: `
    <ng-diagram [model]="model">
      <!-- Dotted background (default) -->
      <ng-diagram-background type="dots" />

      <!-- Grid background -->
      <!-- <ng-diagram-background type="grid" /> -->

      <!-- Custom background via content projection -->
      <!--
      <ng-diagram-background>
        <svg width="100%" height="100%">
          <pattern id="custom" patternUnits="userSpaceOnUse" width="50" height="50">
            <circle cx="25" cy="25" r="2" fill="#ccc" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#custom)" />
        </svg>
      </ng-diagram-background>
      -->
    </ng-diagram>
  `,
})
export class DiagramComponent {
  model = initializeModel({ nodes: [], edges: [] });
}
```

## NgDiagramMinimapComponent

Displays a bird's-eye view minimap with navigation support.

```typescript
import { Component } from '@angular/core';
import {
  NgDiagramComponent,
  NgDiagramMinimapComponent,
  NgDiagramMinimapNodeTemplateMap,
  initializeModel,
  provideNgDiagram,
  MinimapNodeStyle,
  Node,
} from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent, NgDiagramMinimapComponent],
  providers: [provideNgDiagram()],
  template: `
    <ng-diagram [model]="model">
      <ng-diagram-minimap
        position="bottom-right"
        [width]="200"
        [height]="150"
        [showZoomControls]="true"
        [nodeStyle]="nodeStyle"
        [minimapNodeTemplateMap]="minimapTemplateMap"
      />
    </ng-diagram>
  `,
})
export class DiagramComponent {
  model = initializeModel({ nodes: [], edges: [] });
  minimapTemplateMap = new NgDiagramMinimapNodeTemplateMap();

  // Custom node styling in minimap
  nodeStyle = (node: Node): MinimapNodeStyle => ({
    fill: node.selected ? '#3b82f6' : '#9ca3af',
    stroke: node.selected ? '#1d4ed8' : undefined,
    strokeWidth: node.selected ? 2 : undefined,
    opacity: 0.8,
    shape: node.type === 'circle' ? 'circle' : 'rect',
  });
}
```

## Palette Drag and Drop

Implement a palette for drag-and-drop node creation.

```typescript
import { Component } from '@angular/core';
import {
  NgDiagramComponent,
  NgDiagramPaletteItemComponent,
  NgDiagramPaletteItemPreviewComponent,
  NgDiagramPaletteItem,
  PaletteItemDroppedEvent,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  imports: [
    NgDiagramComponent,
    NgDiagramPaletteItemComponent,
    NgDiagramPaletteItemPreviewComponent,
  ],
  providers: [provideNgDiagram()],
  template: `
    <div class="palette">
      @for (item of paletteItems; track item.id) {
        <ng-diagram-palette-item [item]="item">
          <div class="palette-item">{{ item.data.label }}</div>
          <ng-diagram-palette-item-preview>
            <div class="preview">{{ item.data.label }}</div>
          </ng-diagram-palette-item-preview>
        </ng-diagram-palette-item>
      }
    </div>

    <ng-diagram
      [model]="model"
      (paletteItemDropped)="onItemDropped($event)"
    />
  `,
  styles: [`
    :host { display: flex; height: 100%; }
    .palette { width: 200px; padding: 16px; background: #f5f5f5; }
    .palette-item { padding: 8px; margin: 4px 0; background: white; border: 1px solid #ddd; cursor: grab; }
    .preview { padding: 8px; background: white; border: 2px dashed #3b82f6; }
  `],
})
export class DiagramComponent {
  model = initializeModel({ nodes: [], edges: [] });

  paletteItems: NgDiagramPaletteItem[] = [
    {
      id: 'simple-node',
      type: 'node',
      data: { label: 'Simple Node' },
    },
    {
      id: 'group-node',
      type: 'group',
      data: { label: 'Group Node' },
    },
  ];

  onItemDropped(event: PaletteItemDroppedEvent) {
    console.log('Dropped node:', event.node.id, 'at:', event.dropPosition);
  }
}
```

## Diagram Configuration

Comprehensive configuration options for customizing diagram behavior.

```typescript
import { Component } from '@angular/core';
import {
  NgDiagramComponent,
  NgDiagramConfig,
  configureShortcuts,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';

@Component({
  selector: 'app-diagram',
  imports: [NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `<ng-diagram [model]="model" [config]="config" />`,
})
export class DiagramComponent {
  model = initializeModel({ nodes: [], edges: [] });

  config: NgDiagramConfig = {
    // Zoom configuration
    zoom: {
      min: 0.25,
      max: 4,
      step: 0.1,
      zoomToFit: {
        onInit: true,
        padding: [50, 50, 50, 50], // [top, right, bottom, left]
      },
    },

    // Resize configuration
    resize: {
      allowResizeBelowChildrenBounds: false,
    },

    // Background grid configuration
    background: {
      cellSize: { width: 20, height: 20 },
    },

    // Snapping configuration
    snapping: {
      shouldSnapDragForNode: (node) => true,
      shouldSnapResizeForNode: (node) => true,
    },

    // Virtualization for large diagrams
    virtualization: {
      enabled: true,
      bounds: { x: 0, y: 0, width: 10000, height: 10000 },
    },

    // Custom keyboard shortcuts
    shortcuts: configureShortcuts([
      {
        actionName: 'keyboardMoveSelectionUp',
        bindings: [{ key: 'w' }, { key: 'ArrowUp' }],
      },
      {
        actionName: 'keyboardMoveSelectionDown',
        bindings: [{ key: 's' }, { key: 'ArrowDown' }],
      },
      {
        actionName: 'keyboardMoveSelectionLeft',
        bindings: [{ key: 'a' }, { key: 'ArrowLeft' }],
      },
      {
        actionName: 'keyboardMoveSelectionRight',
        bindings: [{ key: 'd' }, { key: 'ArrowRight' }],
      },
      {
        actionName: 'copy',
        bindings: [{ key: 'c', modifiers: ['ctrl'] }],
      },
      {
        actionName: 'paste',
        bindings: [{ key: 'v', modifiers: ['ctrl'] }],
      },
      {
        actionName: 'deleteSelection',
        bindings: [{ key: 'Delete' }, { key: 'Backspace' }],
      },
    ]),

    // Debug mode
    debugMode: false,
  };
}
```

## Summary

ng-diagram provides a comprehensive solution for building interactive diagram applications in Angular. The library's main use cases include workflow editors, process flow visualizations, network topology diagrams, mind mapping tools, and any node-based visual programming interface. Its reactive architecture built on Angular signals ensures optimal performance, while the template-based customization system allows for complete control over node and edge rendering.

Integration patterns typically involve importing `NgDiagramComponent` with `provideNgDiagram()` providers, initializing a model with `initializeModel()`, and using the various services (`NgDiagramService`, `NgDiagramModelService`, `NgDiagramSelectionService`, `NgDiagramViewportService`, `NgDiagramNodeService`, `NgDiagramGroupsService`, `NgDiagramClipboardService`) to programmatically control the diagram. Custom node and edge templates are registered via `NgDiagramNodeTemplateMap` and `NgDiagramEdgeTemplateMap`, with components implementing the `NgDiagramNodeTemplate` and `NgDiagramEdgeTemplate` interfaces. The library supports transactions for atomic updates, custom middleware for extending functionality, and comprehensive event handling for user interactions.
