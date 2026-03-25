import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, Injector, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toBlob } from 'html-to-image';
import {
  ButtonDirective,
  ToastBodyComponent,
  ToastComponent,
  ToastHeaderComponent,
  ToasterComponent,
  DropdownComponent,
  DropdownToggleDirective,
  DropdownMenuDirective,
  DropdownItemDirective,
  DropdownDividerDirective,
} from '@coreui/angular';
import {
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  type NgDiagramConfig,
  type Edge,
  NgDiagramEdgeTemplateMap,
  NgDiagramMinimapComponent,
  NgDiagramModelService,
  NgDiagramNodeTemplateMap,
  NgDiagramSelectionService,
  NgDiagramViewportService,
  type Node,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';
import { DiagramApiService, type DiagramLink, type DiagramNode, type DiagramResponse } from './services/diagram-api.service';
import { RelationshipEdgeComponent } from './relationship-edge.component';
import { EntityNodeComponent } from './nodes/entity-node.component';
import { getRelationshipEdgeType } from './relationship-edge-styles';

const DEFAULT_POSITION_SPREAD = 220;
const STATE_STORAGE_KEY = 'domain-model-diagram-state-v1';
const DEFAULT_FIT_PADDING: [number, number, number, number] = [72, 108, 72, 108];
const LARGE_DIAGRAM_FIT_PADDING: [number, number, number, number] = [40, 64, 40, 64];
const LARGE_DIAGRAM_NODE_THRESHOLD = 14;
const LARGE_DIAGRAM_EDGE_THRESHOLD = 18;
const LARGE_DIAGRAM_SPAN_X_THRESHOLD = 1600;
const LARGE_DIAGRAM_SPAN_Y_THRESHOLD = 1200;
const MIN_RESTORABLE_ZOOM = 0.18;
const MAX_RESTORABLE_ZOOM = 2.5;
const LARGE_DIAGRAM_MAX_RESTORED_ZOOM = 1.1;
const DEFAULT_STAGE_WIDTH = 980;
const DEFAULT_STAGE_HEIGHT = 620;
const MIN_NODE_WIDTH = 176;
const MAX_NODE_WIDTH = 320;
const ESTIMATED_NODE_HEIGHT = 88;

type DiagramNodeData = {
  label: string;
  entity: DiagramNode;
  presentation: GraphPresentation;
};

type DiagramEdgeData = {
  label: string;
  channel: string;
  relation?: {
    relationType?: string;
    sourceField?: string;
    targetField?: string;
    cardinality?: string;
    owningSide?: boolean;
    fetch?: 'EAGER' | 'LAZY';
  };
};

type SavedDiagramState = {
  nodes?: Array<{ id: string; position?: { x: number; y: number } }>;
  metadata?: {
    viewport?: { x?: number; y?: number; zoom?: number };
    graph?: GraphSignature;
  };
};

type GraphSignature = {
  nodeCount: number;
  edgeCount: number;
  spanX: number;
  spanY: number;
};

type GraphPresentation = {
  nodeWidth: number;
  fitPadding: [number, number, number, number];
  rect: { x: number; y: number; width: number; height: number };
};

type UiToast = {
  id: number;
  color: 'success' | 'danger' | 'warning' | 'primary';
  title: string;
  message: string;
};

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [
    CommonModule,
    ButtonDirective,
    ToasterComponent,
    ToastComponent,
    ToastHeaderComponent,
    ToastBodyComponent,
    NgDiagramComponent,
    NgDiagramBackgroundComponent,
    NgDiagramMinimapComponent,
    RelationshipEdgeComponent,
    EntityNodeComponent,
    DropdownComponent,
    DropdownToggleDirective,
    DropdownMenuDirective,
    DropdownItemDirective,
    DropdownDividerDirective,
  ],
  providers: [provideNgDiagram()],
  template: `
    <div class="graph-shell">
      <section class="panel panel--diagram">
        <div class="panel__header">
          <div>
            <p class="panel__eyebrow">Workspace</p>
            <h3>Entity Diagram</h3>
            <p class="panel__hint">Large models auto-fit on load. Use Fit to Screen to reframe the full canvas at any time.</p>
          </div>
          <div class="toolbar" role="group" aria-label="Diagram actions">
            <c-dropdown alignment="end" variant="btn-group">
              <button cButton cDropdownToggle color="primary" type="button">
                Export Image
              </button>
              <ul cDropdownMenu>
                <li><button (click)="downloadDiagramImage('png')" cDropdownItem>Save as PNG</button></li>
                <li><button (click)="downloadDiagramImage('jpg')" cDropdownItem>Save as JPG</button></li>
              </ul>
            </c-dropdown>

            <c-dropdown alignment="end" variant="btn-group">
              <button cButton cDropdownToggle color="success" type="button">
                Save
              </button>
              <ul cDropdownMenu>
                <li><button (click)="saveDiagramState()" cDropdownItem>Save to Browser</button></li>
                <li><button (click)="saveDiagramToServer()" cDropdownItem>Save to Server</button></li>
              </ul>
            </c-dropdown>

            <c-dropdown alignment="end" variant="btn-group">
              <button cButton cDropdownToggle color="secondary" type="button">
                Reset / Load
              </button>
              <ul cDropdownMenu>
                <li><button (click)="fitDiagramToView(true)" cDropdownItem>Fit to Screen</button></li>
                <li><hr cDropdownDivider></li>
                <li><button (click)="restoreDiagramState()" cDropdownItem>Restore from Browser</button></li>
                <li><button (click)="clearSavedDiagramState()" cDropdownItem>Clear saved layout (Browser)</button></li>
                <li><button (click)="loadFromServer()" cDropdownItem>Load from Server</button></li>
                <li><button (click)="browseAndLoad()" cDropdownItem>Browse and Load</button></li>
              </ul>
            </c-dropdown>
          </div>
        </div>

        <div #diagramStage class="diagram-stage">
          <div class="error" *ngIf="error">{{ error }}</div>
          <div class="empty-state" *ngIf="!error && !hasNodes()">
            <div class="empty-state-card">
              <strong>Waiting for domain model data</strong>
              <p>POST JPA entities and relationships to <code>/api/diagram</code> to render the model. Larger diagrams are auto-fitted once data arrives.</p>
            </div>
          </div>
          <ng-diagram [config]="config" [model]="model" [edgeTemplateMap]="edgeTemplateMap" [nodeTemplateMap]="nodeTemplateMap" (diagramInit)="diagramReady.set(true)">
            <ng-diagram-background type="dots"></ng-diagram-background>
            <ng-diagram-minimap
              *ngIf="diagramReady()"
              position="bottom-right"
              [width]="220"
              [height]="140"
            ></ng-diagram-minimap>
          </ng-diagram>
        </div>
      </section>

      <aside class="panel panel--sidebar">
        <ng-container *ngIf="selectedEntity(); else relationshipOrEmpty">
          <div class="sidebar__header">
            <span class="eyebrow">JPA Entity</span>
            <h2>{{ selectedEntity()!.name }}</h2>
            <p>{{ selectedEntity()!.metadata?.description || 'No entity description provided.' }}</p>
          </div>

          <div class="sidebar__section">
            <div class="info-grid">
              <div>
                <span class="label">Table</span>
                <strong>{{ selectedEntity()!.metadata?.tableName || 'n/a' }}</strong>
              </div>
              <div>
                <span class="label">Package</span>
                <strong>{{ selectedEntity()!.metadata?.packageName || 'n/a' }}</strong>
              </div>
              <div>
                <span class="label">Primary Key</span>
                <strong>{{ selectedEntity()!.metadata?.idField || 'n/a' }}</strong>
              </div>
              <div>
                <span class="label">Status</span>
                <strong>{{ selectedEntity()!.status }}</strong>
              </div>
            </div>
          </div>

          <div class="sidebar__section" *ngIf="selectedEntity()!.metadata?.annotations?.length">
            <h3>Annotations</h3>
            <div class="chips">
              <span class="chip" *ngFor="let annotation of selectedEntity()!.metadata!.annotations">{{ annotation }}</span>
            </div>
          </div>

          <div class="sidebar__section">
            <h3>Fields</h3>
            <div class="list-card" *ngFor="let field of selectedEntity()!.metadata?.fields || []">
              <div class="list-card__title">
                <strong>{{ field.name }}</strong>
                <span>{{ field.type }}</span>
              </div>
              <div class="list-card__meta">
                <span>{{ field.column || field.name }}</span>
                <span>{{ field.nullable ? 'nullable' : 'required' }}</span>
                <span *ngIf="field.id">PK</span>
                <span *ngIf="field.unique">unique</span>
              </div>
            </div>
          </div>

          <div class="sidebar__section" *ngIf="selectedEntity()!.metadata?.businessRules?.length">
            <h3>Business Rules</h3>
            <ul class="rules">
              <li *ngFor="let rule of selectedEntity()!.metadata!.businessRules">{{ rule }}</li>
            </ul>
          </div>

          <div class="sidebar__section" *ngIf="selectedEntityRelationships().length">
            <h3>Relationships</h3>
            <div class="list-card" *ngFor="let relationship of selectedEntityRelationships()">
              <div class="list-card__title">
                <strong>{{ relationship.label || relationship.metadata?.relationType || 'Association' }}</strong>
                <span>{{ relationship.source }} -> {{ relationship.target }}</span>
              </div>
              <div class="list-card__meta">
                <span>{{ relationship.metadata?.cardinality || 'n/a' }}</span>
                <span>{{ relationship.metadata?.sourceField || 'n/a' }}</span>
                <span>{{ relationship.metadata?.fetch || 'n/a' }}</span>
              </div>
            </div>
          </div>
        </ng-container>

        <ng-template #relationshipOrEmpty>
          <ng-container *ngIf="selectedRelationship(); else emptySelection">
            <div class="sidebar__header">
              <span class="eyebrow">Relationship</span>
              <h2>{{ selectedRelationship()!.data.label || 'Association' }}</h2>
              <p>{{ selectedRelationship()!.source }} -> {{ selectedRelationship()!.target }}</p>
            </div>

            <div class="sidebar__section">
              <div class="info-grid">
                <div>
                  <span class="label">Type</span>
                  <strong>{{ selectedRelationship()!.data.relation?.relationType || 'n/a' }}</strong>
                </div>
                <div>
                  <span class="label">Cardinality</span>
                  <strong>{{ selectedRelationship()!.data.relation?.cardinality || 'n/a' }}</strong>
                </div>
                <div>
                  <span class="label">Source Field</span>
                  <strong>{{ selectedRelationship()!.data.relation?.sourceField || 'n/a' }}</strong>
                </div>
                <div>
                  <span class="label">Target Field</span>
                  <strong>{{ selectedRelationship()!.data.relation?.targetField || 'n/a' }}</strong>
                </div>
                <div>
                  <span class="label">Fetch</span>
                  <strong>{{ selectedRelationship()!.data.relation?.fetch || 'n/a' }}</strong>
                </div>
                <div>
                  <span class="label">Owning Side</span>
                  <strong>{{ selectedRelationship()!.data.relation?.owningSide ? 'yes' : 'no' }}</strong>
                </div>
              </div>
            </div>

            <div class="sidebar__section">
              <h3>Transport</h3>
              <div class="list-card">
                <div class="list-card__title">
                  <strong>{{ selectedRelationship()!.data.channel || 'JPA' }}</strong>
                  <span>{{ selectedRelationship()!.id }}</span>
                </div>
              </div>
            </div>
          </ng-container>
        </ng-template>

        <ng-template #emptySelection>
          <div class="sidebar__empty">
            <span class="eyebrow">Properties</span>
            <h2>Select an entity</h2>
            <p>Click an entity or relationship to inspect JPA details.</p>
          </div>
        </ng-template>
      </aside>

      <c-toaster class="p-3" placement="top-end">
        <c-toast
          *ngFor="let toast of toasts(); trackBy: trackToast"
          [autohide]="true"
          [color]="toast.color"
          [delay]="3000"
          [visible]="true"
          (visibleChange)="onToastVisibleChange($event, toast.id)"
        >
          <c-toast-header>{{ toast.title }}</c-toast-header>
          <c-toast-body>{{ toast.message }}</c-toast-body>
        </c-toast>
      </c-toaster>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
      }

      .graph-shell {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 1rem;
        flex: 1 1 auto;
        min-height: 0;
      }

      .panel {
        display: flex;
        flex-direction: column;
        min-height: 0;
        border: 1px solid var(--cui-border-color);
        border-radius: var(--cui-border-radius-lg);
        background: var(--cui-card-bg);
        box-shadow: var(--cui-box-shadow-sm);
      }

      .panel__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem 1rem 0;
      }

      .panel__eyebrow {
        margin: 0 0 0.25rem;
        color: var(--cui-primary);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .panel__header h3 {
        margin: 0;
        font-size: 1.1rem;
      }

      .panel__hint {
        margin: 0.35rem 0 0;
        color: var(--cui-secondary-color);
        font-size: 0.86rem;
        line-height: 1.45;
        max-width: 36rem;
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .diagram-stage {
        position: relative;
        display: flex;
        min-height: 620px;
        margin: 1rem;
        border: 1px solid var(--cui-border-color-translucent);
        border-radius: var(--cui-border-radius-lg);
        background: linear-gradient(180deg, #fff, #f8fafc);
        overflow: hidden;
      }

      ng-diagram {
        flex: 1 1 auto;
        min-width: 0;
        --ngd-diagram-background-color: #ffffff;
        --ngd-minimap-background: rgba(255, 255, 255, 0.98);
        --ngd-minimap-border-color: rgba(148, 163, 184, 0.35);
        --ngd-default-edge-stroke: var(--cui-primary);
        --ngd-default-edge-stroke-hover: #1d4ed8;
        --ngd-default-edge-stroke-selected: #0f172a;
        /* Cardinality-based edge colors */
        --cardinality-1-1: #D55E00;
        --cardinality-1-n: #0072B2;
        --cardinality-n-1: #009E73;
        --cardinality-n-m: #CC79A7;
      }

      .panel--sidebar {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        min-height: 620px;
        overflow: auto;
      }

      .sidebar__header h2,
      .sidebar__empty h2 {
        margin: 8px 0 6px;
        font-size: 1.25rem;
      }

      .sidebar__header p,
      .sidebar__empty p {
        margin: 0;
        color: var(--cui-secondary-color);
        line-height: 1.5;
      }

      .eyebrow {
        display: inline-flex;
        align-self: flex-start;
        padding: 0.2rem 0.5rem;
        border-radius: 50rem;
        border: 1px solid rgba(13, 110, 253, 0.2);
        background: rgba(13, 110, 253, 0.08);
        color: var(--cui-primary);
        font-size: 0.72rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .sidebar__section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .sidebar__section h3 {
        margin: 0;
        font-size: 0.95rem;
        color: var(--cui-body-color);
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .info-grid > div,
      .list-card {
        padding: 12px;
        border-radius: var(--cui-border-radius);
        background: var(--cui-tertiary-bg);
        border: 1px solid var(--cui-border-color-translucent);
      }

      .label {
        display: block;
        margin-bottom: 6px;
        color: var(--cui-secondary-color);
        font-size: 0.72rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .list-card__title,
      .list-card__meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }

      .list-card__meta {
        margin-top: 6px;
        flex-wrap: wrap;
        color: var(--cui-secondary-color);
        font-size: 0.82rem;
      }

      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .chip {
        padding: 0.32rem 0.58rem;
        border-radius: 50rem;
        background: rgba(13, 110, 253, 0.08);
        border: 1px solid rgba(13, 110, 253, 0.16);
        color: var(--cui-primary);
        font-size: 0.8rem;
      }

      .rules {
        margin: 0;
        padding-left: 1.1rem;
        color: var(--cui-body-color);
      }

      .error {
        position: absolute;
        top: 12px;
        left: 12px;
        max-width: 440px;
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid rgba(220, 53, 69, 0.24);
        background: rgba(255, 243, 245, 0.98);
        color: #842029;
        font-size: 14px;
        z-index: 10;
      }

      .empty-state {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        color: var(--cui-body-color);
        text-align: center;
        pointer-events: none;
        z-index: 1;
      }

      .empty-state-card {
        max-width: 420px;
        padding: 18px 20px;
        border-radius: var(--cui-border-radius-lg);
        border: 1px solid var(--cui-border-color);
        background: rgba(255, 255, 255, 0.94);
        box-shadow: var(--cui-box-shadow-sm);
      }

      .empty-state-card p {
        margin: 0.5rem 0 0;
        color: var(--cui-secondary-color);
      }

      .empty-state-card code {
        padding: 0.1rem 0.35rem;
        border-radius: 0.35rem;
        background: var(--cui-secondary-bg);
      }

      @media (max-width: 1100px) {
        .graph-shell {
          grid-template-columns: 1fr;
        }

        .panel__header {
          flex-direction: column;
        }

        .diagram-stage,
        .panel--sidebar {
          min-height: 480px;
        }
      }
    `,
  ],
})
export class GraphComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly api = inject(DiagramApiService);
  private readonly modelService = inject(NgDiagramModelService);
  private readonly selectionService = inject(NgDiagramSelectionService);
  private readonly viewportService = inject(NgDiagramViewportService);
  @ViewChild('diagramStage') diagramStage?: ElementRef<HTMLElement>;

  private fallbackPosition = (idx: number) => ({
    x: DEFAULT_POSITION_SPREAD * ((idx % 3) + 1),
    y: 140 + 150 * Math.floor(idx / 3),
  });

  readonly config: NgDiagramConfig = {
    zoom: {
      min: MIN_RESTORABLE_ZOOM,
      max: MAX_RESTORABLE_ZOOM,
    },
  };

  nodeTemplateMap = new NgDiagramNodeTemplateMap([
    ['jpa-entity', EntityNodeComponent],
  ]);

  edgeTemplateMap = new NgDiagramEdgeTemplateMap([
    ['relationship-one-to-one', RelationshipEdgeComponent],
    ['relationship-one-to-many', RelationshipEdgeComponent],
    ['relationship-many-to-one', RelationshipEdgeComponent],
    ['relationship-many-to-many', RelationshipEdgeComponent],
    ['relationship-default', RelationshipEdgeComponent],
  ]);

  model = initializeModel({ nodes: [], edges: [] }, this.injector);
  graphState = signal<DiagramResponse | undefined>(undefined);
  graphPresentation = signal<GraphPresentation>(this.buildGraphPresentation());
  selectedNode = computed(() => this.selectionService.selection().nodes[0] as Node<DiagramNodeData> | undefined);
  selectedEdge = computed(() => this.selectionService.selection().edges[0] as Edge<DiagramEdgeData> | undefined);
  selectedEntity = computed(() => this.selectedNode()?.data.entity);
  selectedRelationship = computed(() => this.selectedEdge());
  selectedEntityRelationships = computed(() => {
    const entity = this.selectedEntity();
    const graph = this.graphState();
    if (!entity || !graph) return [];

    return graph.links.filter((link) => link.source === entity.id || link.target === entity.id);
  });
  error?: string;
  hasConnected = false;
  hasNodes = signal(false);
  diagramReady = signal(false);
  toasts = signal<UiToast[]>([]);
  private toastId = 0;

  ngOnInit(): void {
    const buildModel = (graph: DiagramResponse) => {
      this.hasConnected = true;
      this.rebuildModelFromGraph(graph);
      this.error = undefined;
    };

    this.api
      .fetchDiagram()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => buildModel(response),
        error: (err) => {
          const detail = err?.message ?? 'unknown error';
          this.error = `Unable to load diagram yet. Waiting for MCP server. (${detail})`;
        },
      });

    const disconnect = this.api.connectDiagramStream(buildModel);
    this.destroyRef.onDestroy(disconnect);

    interval(3000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.hasConnected) return;

        this.api.fetchDiagram().subscribe({
          next: (response) => buildModel(response),
          error: () => undefined,
        });
      });
  }

  async downloadDiagramImage(format: 'png' | 'jpg' = 'png'): Promise<void> {
    if (!this.diagramStage?.nativeElement) {
      this.pushToast('warning', 'Download unavailable', 'The diagram canvas is not ready yet.');
      return;
    }

    try {
      const blob = await toBlob(this.diagramStage.nativeElement, {
        backgroundColor: '#ffffff',
        cacheBust: true,
        quality: 0.95,
      });

      if (!blob) {
        this.pushToast('danger', 'Download failed', 'Could not generate a diagram image.');
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const extension = format === 'jpg' ? 'jpg' : 'png';
      anchor.download = `domain-diagram-${Date.now()}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      this.pushToast('success', 'Image downloaded', `${extension.toUpperCase()} export completed.`);
    } catch (error) {
      this.pushToast('danger', 'Download failed', 'Unable to export diagram image.');
      console.error(error);
    }
  }

  saveDiagramState(): void {
    try {
      const stateJson = this.model.toJSON();
      const rawState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;
      const savedState = this.createSavedState(rawState);
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(savedState));
      this.pushToast('success', 'State saved', 'Diagram layout and viewport were saved.');
    } catch (error) {
      this.pushToast('danger', 'Save failed', 'Unable to persist the diagram state.');
      console.error(error);
    }
  }

  async saveDiagramToServer(): Promise<void> {
    try {
      const stateJson = this.model.toJSON();
      const ngDiagramState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

      // Check if diagram is empty
      if (!ngDiagramState.nodes || ngDiagramState.nodes.length === 0) {
        this.pushToast('warning', 'Nothing to save', 'Diagram is empty. Add some entities first.');
        return;
      }

      // Transform ng-diagram format (nodes/links) to MCP server format (entities/relationships)
      const serverPayload = {
        version: ngDiagramState.version ?? '1.0',
        entities: ngDiagramState.nodes.map((node: DiagramNode) => ({
          id: node.id,
          label: node.name,
          type: node.type ?? 'entity',
          status: node.status ?? 'healthy',
          layoutHint: node.position ? { x: node.position.x, y: node.position.y } : undefined,
          metadata: node.metadata,
        })),
        relationships: ngDiagramState.links.map((link: DiagramLink) => ({
          id: link.id,
          source: link.source,
          target: link.target,
          label: link.label,
          channel: link.channel,
          metadata: link.metadata,
        })),
      };

      console.log('[saveDiagramToServer] Sending payload:', JSON.stringify(serverPayload, null, 2));

      this.api.saveDiagram(serverPayload as any).subscribe({
        next: (response) => {
          console.log('[saveDiagramToServer] Server response:', response);
          this.pushToast('success', 'Saved to server', 'Diagram state saved on server.');
        },
        error: (err) => {
          console.error('[saveDiagramToServer] Server error:', err);
          const errorMsg = err?.error?.message || err?.message || 'Unable to save diagram to server.';
          const issues = err?.error?.issues;
          let detail = '';
          if (issues && Array.isArray(issues)) {
            detail = issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join('; ');
          }
          this.pushToast('danger', 'Server save failed', `${errorMsg}${detail ? ' - ' + detail : ''}`);
        },
      });
    } catch (error) {
      console.error('[saveDiagramToServer] Error:', error);
      this.pushToast('danger', 'Server save failed', 'Unable to save diagram to server.');
    }
  }

  restoreDiagramState(): void {
    const savedState = this.readSavedState();
    if (!savedState) {
      this.pushToast('warning', 'No saved layout', 'There is no browser-saved diagram state to restore.');
      return;
    }

    const graph = this.graphState();
    if (!graph) {
      this.pushToast('warning', 'Diagram unavailable', 'The current graph is not ready yet.');
      return;
    }

    this.applySavedLayout(graph, savedState);
    this.pushToast('success', 'Layout restored', 'Saved browser layout and viewport were applied.');
  }

  clearSavedDiagramState(): void {
    localStorage.removeItem(STATE_STORAGE_KEY);
    this.pushToast('warning', 'Saved layout cleared', 'Browser-saved diagram layout was removed.');
  }

  async loadFromServer(): Promise<void> {
    try {
      this.api.loadSavedDiagram().subscribe({
        next: (state) => {
          this.rebuildModelFromGraph(state, undefined, true);
          this.pushToast('success', 'Loaded from server', 'Diagram state restored from server.');
        },
        error: (err) => {
          if (err?.status === 404) {
            this.pushToast('warning', 'No saved state', 'No diagram state has been saved on the server yet.');
          } else {
            this.pushToast('danger', 'Server load failed', err?.message || 'Unable to load diagram from server.');
          }
          console.error(err);
        },
      });
    } catch (error) {
      this.pushToast('danger', 'Server load failed', 'Unable to load diagram from server.');
      console.error(error);
    }
  }

  browseAndLoad(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const state = JSON.parse(e.target?.result as string);
          if (Array.isArray(state.nodes) && Array.isArray(state.links)) {
            this.rebuildModelFromGraph(state as DiagramResponse, undefined, true);
          } else {
            if (state.nodes) {
              this.model.updateNodes(state.nodes);
            }
            if (state.edges) {
              this.model.updateEdges(state.edges);
            }
            this.scheduleViewportAdjustment(this.graphState(), undefined, true, 120);
          }
          this.pushToast('success', 'File loaded', 'Diagram state loaded from file and fitted to the canvas.');
        } catch (error) {
          this.pushToast('danger', 'Load failed', 'Invalid diagram state file.');
          console.error(error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  onToastVisibleChange(visible: boolean, id: number): void {
    if (visible) return;
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  trackToast(_index: number, toast: UiToast): number {
    return toast.id;
  }

  private rebuildModelFromGraph(graph: DiagramResponse, savedState?: SavedDiagramState, forceFit: boolean = false): void {
    this.hasNodes.set(graph.nodes.length > 0);
    this.graphState.set(graph);
    const presentation = this.buildGraphPresentation(graph);
    this.graphPresentation.set(presentation);
    const persistedPositions = new Map(savedState?.nodes?.map((node) => [node.id, node.position]));
    const allLinks = graph.links;

    this.model.updateNodes(
      graph.nodes.map((node, idx) => ({
        id: node.id,
        position: persistedPositions.get(node.id) ?? node.position ?? this.fallbackPosition(idx),
        type: 'jpa-entity',
        data: {
          label: node.name,
          entity: node,
          presentation,
          relationships: allLinks,
        },
      })),
    );

    this.model.updateEdges(
      graph.links.map((link, idx) => ({
        id: link.id ?? `edge-${idx}`,
        source: link.source,
        target: link.target,
        type: getRelationshipEdgeType(link.metadata?.relationType, link.metadata?.cardinality),
        data: {
          label: link.label ?? '',
          channel: link.channel ?? '',
          relation: link.metadata,
        },
      })),
    );

    this.scheduleViewportAdjustment(graph, savedState, forceFit, savedState ? 150 : 100);
  }

  private readSavedState(): SavedDiagramState | undefined {
    const rawState = localStorage.getItem(STATE_STORAGE_KEY);
    if (!rawState) return undefined;

    try {
      return JSON.parse(rawState) as SavedDiagramState;
    } catch {
      localStorage.removeItem(STATE_STORAGE_KEY);
      return undefined;
    }
  }

  private createSavedState(rawState: any): SavedDiagramState {
    const savedNodes = Array.isArray(rawState?.nodes)
      ? rawState.nodes.map((node: { id: string; position?: { x?: number; y?: number } }) => ({
          id: node.id,
          position:
            typeof node?.position?.x === 'number' && typeof node?.position?.y === 'number'
              ? { x: node.position.x, y: node.position.y }
              : undefined,
        }))
      : [];

    const graph = this.extractGraphSignatureFromState(rawState);
    const viewport = this.getRestorableViewport(rawState as SavedDiagramState, graph);

    return {
      nodes: savedNodes,
      metadata:
        viewport || graph
          ? {
              viewport,
              graph,
            }
          : undefined,
    };
  }

  private applySavedLayout(graph: DiagramResponse, savedState: SavedDiagramState): void {
    const persistedPositions = new Map(savedState.nodes?.map((node) => [node.id, node.position]));
    this.modelService.updateNodes(
      graph.nodes.map((node, idx) => ({
        id: node.id,
        position: persistedPositions.get(node.id) ?? node.position ?? this.fallbackPosition(idx),
      })),
    );

    this.scheduleViewportAdjustment(graph, savedState, false, 150);
  }

  private getRestorableViewport(
    state?: SavedDiagramState,
    graphSignature?: GraphSignature,
  ): { x?: number; y?: number; zoom?: number } | undefined {
    const viewport = state?.metadata?.viewport;
    if (!viewport) return undefined;

    const nextViewport: { x?: number; y?: number; zoom?: number } = {};

    if (Number.isFinite(viewport.x)) {
      nextViewport.x = viewport.x;
    }

    if (Number.isFinite(viewport.y)) {
      nextViewport.y = viewport.y;
    }

    const zoom = viewport.zoom;
    if (typeof zoom === 'number' && Number.isFinite(zoom) && zoom >= MIN_RESTORABLE_ZOOM && zoom <= MAX_RESTORABLE_ZOOM) {
      nextViewport.zoom = this.isLargeDiagram(graphSignature)
        ? Math.min(zoom, LARGE_DIAGRAM_MAX_RESTORED_ZOOM)
        : zoom;
    }

    return Object.keys(nextViewport).length > 0 ? nextViewport : undefined;
  }

  fitDiagramToView(showToast: boolean = false): void {
    const graph = this.graphState();
    this.applyFitToView(graph ? this.buildGraphPresentation(graph) : this.buildGraphPresentation());

    if (showToast) {
      this.pushToast('primary', 'Canvas fitted', 'The diagram was reframed to show the full graph.');
    }
  }

  private restoreViewport(graph?: DiagramResponse, savedState?: SavedDiagramState, forceFit: boolean = false): void {
    const graphSignature = graph ? this.extractGraphSignature(graph) : undefined;
    const viewport = forceFit ? undefined : this.getRestorableViewport(savedState, graphSignature);
    if (viewport && this.shouldRestoreViewport(savedState, graphSignature)) {
      this.model.updateMetadata((metadata) => ({
        ...metadata,
        viewport: {
          ...metadata.viewport,
          ...viewport,
        },
      }));
      return;
    }

    this.applyFitToView(graph ? this.buildGraphPresentation(graph) : this.buildGraphPresentation());
  }

  private shouldRestoreViewport(savedState: SavedDiagramState | undefined, currentGraph?: GraphSignature): boolean {
    if (!savedState?.metadata?.viewport || !currentGraph) return false;

    const savedGraph = savedState.metadata.graph;
    if (!savedGraph) {
      return !this.isLargeDiagram(currentGraph);
    }

    return this.isEquivalentGraph(savedGraph, currentGraph);
  }

  private scheduleViewportAdjustment(
    graph?: DiagramResponse,
    savedState?: SavedDiagramState,
    forceFit: boolean = false,
    delay: number = 100,
  ): void {
    setTimeout(() => {
      this.restoreViewport(graph, savedState, forceFit);
    }, delay);
  }

  private applyFitToView(presentation: GraphPresentation): void {
    this.viewportService.zoomToFit({
      padding: presentation.fitPadding,
    });
    this.viewportService.centerOnRect(presentation.rect);
  }

  private extractGraphSignature(graph: DiagramResponse): GraphSignature {
    return this.buildGraphSignature(
      graph.nodes.map((node, idx) => ({ position: node.position ?? this.fallbackPosition(idx) })),
      graph.links.length,
    );
  }

  private extractGraphSignatureFromState(rawState: any): GraphSignature | undefined {
    const nodes = Array.isArray(rawState?.nodes) ? rawState.nodes : [];
    if (!nodes.length) return undefined;

    const edgeCount = Array.isArray(rawState?.edges)
      ? rawState.edges.length
      : Array.isArray(rawState?.links)
        ? rawState.links.length
        : 0;

    return this.buildGraphSignature(nodes, edgeCount);
  }

  private buildGraphSignature(
    nodes: Array<{ position?: { x?: number; y?: number } }>,
    edgeCount: number,
  ): GraphSignature {
    const positions = nodes
      .map((node, idx) => node.position ?? this.fallbackPosition(idx))
      .filter((position): position is { x: number; y: number } => Number.isFinite(position.x) && Number.isFinite(position.y));

    if (!positions.length) {
      return {
        nodeCount: nodes.length,
        edgeCount,
        spanX: 0,
        spanY: 0,
      };
    }

    const xs = positions.map((position) => position.x);
    const ys = positions.map((position) => position.y);

    return {
      nodeCount: nodes.length,
      edgeCount,
      spanX: Math.max(...xs) - Math.min(...xs),
      spanY: Math.max(...ys) - Math.min(...ys),
    };
  }

  private buildGraphPresentation(graph?: DiagramResponse): GraphPresentation {
    const stageWidth = this.diagramStage?.nativeElement?.clientWidth || DEFAULT_STAGE_WIDTH;
    const stageHeight = this.diagramStage?.nativeElement?.clientHeight || DEFAULT_STAGE_HEIGHT;

    if (!graph || graph.nodes.length === 0) {
      return {
        nodeWidth: 220,
        fitPadding: DEFAULT_FIT_PADDING,
        rect: { x: 0, y: 0, width: stageWidth, height: stageHeight },
      };
    }

    const positions = graph.nodes.map((node, idx) => node.position ?? this.fallbackPosition(idx));
    const xs = positions.map((position) => position.x);
    const ys = positions.map((position) => position.y);
    const uniqueColumns = new Set(xs.map((value) => Math.round(value / 20))).size || 1;
    const graphSignature = this.extractGraphSignature(graph);
    const fitPadding = this.isLargeDiagram(graphSignature) ? LARGE_DIAGRAM_FIT_PADDING : DEFAULT_FIT_PADDING;

    const availableWidth = Math.max(stageWidth - fitPadding[1] - fitPadding[3], stageWidth * 0.55);
    const nodeWidth = this.clamp((availableWidth / uniqueColumns) * 0.7, MIN_NODE_WIDTH, MAX_NODE_WIDTH);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      nodeWidth,
      fitPadding,
      rect: {
        x: minX,
        y: minY,
        width: Math.max(maxX - minX + nodeWidth, nodeWidth),
        height: Math.max(maxY - minY + ESTIMATED_NODE_HEIGHT, ESTIMATED_NODE_HEIGHT),
      },
    };
  }

  private isLargeDiagram(graph?: GraphSignature): boolean {
    if (!graph) return false;

    return (
      graph.nodeCount >= LARGE_DIAGRAM_NODE_THRESHOLD ||
      graph.edgeCount >= LARGE_DIAGRAM_EDGE_THRESHOLD ||
      graph.spanX >= LARGE_DIAGRAM_SPAN_X_THRESHOLD ||
      graph.spanY >= LARGE_DIAGRAM_SPAN_Y_THRESHOLD
    );
  }

  private isEquivalentGraph(saved: GraphSignature, current: GraphSignature): boolean {
    return (
      saved.nodeCount === current.nodeCount &&
      saved.edgeCount === current.edgeCount &&
      this.isWithinTolerance(saved.spanX, current.spanX) &&
      this.isWithinTolerance(saved.spanY, current.spanY)
    );
  }

  private isWithinTolerance(left: number, right: number): boolean {
    if (left === right) return true;

    const baseline = Math.max(left, right, 1);
    return Math.abs(left - right) / baseline <= 0.35;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private pushToast(color: UiToast['color'], title: string, message: string): void {
    const id = ++this.toastId;
    this.toasts.update((items) => [...items, { id, color, title, message }]);
  }
}
