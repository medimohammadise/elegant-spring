import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Injector, OnInit, computed, inject, signal } from '@angular/core';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  type Edge,
  NgDiagramEdgeTemplateMap,
  NgDiagramMinimapComponent,
  NgDiagramNodeTemplateMap,
  NgDiagramSelectionService,
  NgDiagramViewportService,
  type Node,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';
import { DiagramApiService, type DiagramNode, type DiagramResponse, type DiagramLink } from './services/diagram-api.service';
import { RelationshipEdgeComponent } from './relationship-edge.component';
import { EntityNodeComponent } from './nodes/entity-node.component';
import { getRelationshipEdgeType } from './relationship-edge-styles';

const DEFAULT_POSITION_SPREAD = 220;
const fallbackPosition = (idx: number) => ({
  x: DEFAULT_POSITION_SPREAD * ((idx % 3) + 1),
  y: 140 + 150 * Math.floor(idx / 3),
});

type DiagramNodeData = {
  label: string;
  entity: DiagramNode;
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

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [CommonModule, NgDiagramComponent, NgDiagramBackgroundComponent, NgDiagramMinimapComponent, RelationshipEdgeComponent, EntityNodeComponent],
  providers: [provideNgDiagram()],
  template: `
    <div class="graph-shell">
      <section class="panel panel--diagram">
        <div class="panel__header">
          <div>
            <p class="panel__eyebrow">Workspace</p>
            <h3>Entity Diagram</h3>
          </div>
          <p class="panel__summary">Inspect entities, relationships, and live updates in a standard CoreUI workspace.</p>
        </div>

        <div class="diagram-stage">
          <div class="error" *ngIf="error">{{ error }}</div>
          <div class="empty-state" *ngIf="!error && !hasNodes">
            <div class="empty-state-card">
              <strong>Waiting for domain model data</strong>
              <p>POST JPA entities and relationships to <code>/api/diagram</code> to render the model.</p>
            </div>
          </div>
          <ng-diagram [model]="model" [edgeTemplateMap]="edgeTemplateMap" [nodeTemplateMap]="nodeTemplateMap" (diagramInit)="diagramReady = true">
            <ng-diagram-background type="dots"></ng-diagram-background>
            <ng-diagram-minimap
              *ngIf="diagramReady"
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

      .panel__summary {
        max-width: 22rem;
        margin: 0;
        color: var(--cui-secondary-color);
        font-size: 0.875rem;
        line-height: 1.5;
        text-align: right;
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

        .panel__summary {
          max-width: none;
          text-align: left;
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
  private readonly selectionService = inject(NgDiagramSelectionService);
  private readonly viewportService = inject(NgDiagramViewportService);

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
  hasNodes = false;
  diagramReady = false;

  ngOnInit(): void {
    const buildModel = (graph: DiagramResponse) => {
      this.hasConnected = true;
      this.hasNodes = graph.nodes.length > 0;
      this.graphState.set(graph);

      // Store relationships globally for node access
      const allLinks = graph.links;

      this.model.updateNodes(
        graph.nodes.map((node, idx) => ({
          id: node.id,
          position: node.position ?? fallbackPosition(idx),
          type: 'jpa-entity',
          data: {
            label: node.name,
            entity: node,
            relationships: allLinks,
          },
        })),
      );

      // Create edges with cardinality-based styling
      this.model.updateEdges(
        graph.links.map((link, idx) => {
          // Get edge type based on cardinality
          const edgeType = getRelationshipEdgeType(link.metadata?.relationType, link.metadata?.cardinality);

          console.log('Creating edge:', {
            id: link.id,
            source: link.source,
            target: link.target,
            type: edgeType,
            cardinality: link.metadata?.cardinality,
          });

          return {
            id: link.id ?? `edge-${idx}`,
            source: link.source,
            target: link.target,
            type: edgeType,
            data: {
              label: link.label ?? '',
              channel: link.channel ?? '',
              relation: link.metadata,
            },
          };
        }),
      );

      this.error = undefined;
      setTimeout(() => {
        this.viewportService.zoomToFit({ padding: [80, 120, 80, 120] });
      }, 150);
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
}
