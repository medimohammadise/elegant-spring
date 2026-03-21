import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Injector, OnInit, computed, inject, signal } from '@angular/core';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  type Edge,
  NgDiagramMinimapComponent,
  NgDiagramSelectionService,
  type Node,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';
import { DiagramApiService, type DiagramNode, type DiagramResponse } from './services/diagram-api.service';

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
  imports: [CommonModule, NgDiagramComponent, NgDiagramBackgroundComponent, NgDiagramMinimapComponent],
  providers: [provideNgDiagram()],
  template: `
    <div class="graph-shell">
      <section class="diagram-stage">
        <div class="error" *ngIf="error">{{ error }}</div>
        <div class="empty-state" *ngIf="!error && !hasNodes">
          <div class="empty-state-card">
            <strong>Waiting for domain model data</strong>
            <p>POST JPA entities and relationships to <code>/api/diagram</code> to render the model.</p>
          </div>
        </div>
        <ng-diagram [model]="model" (diagramInit)="diagramReady = true">
          <ng-diagram-background type="dots"></ng-diagram-background>
          <ng-diagram-minimap
            *ngIf="diagramReady"
            position="bottom-right"
            [width]="220"
            [height]="140"
          ></ng-diagram-minimap>
        </ng-diagram>
      </section>

      <aside class="sidebar">
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
        min-height: 640px;
      }

      .graph-shell {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 14px;
        flex: 1 1 auto;
        min-height: 640px;
      }

      .diagram-stage {
        position: relative;
        display: flex;
        min-height: 640px;
        border-radius: 18px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        background: linear-gradient(135deg, rgba(8, 47, 73, 0.92), rgba(15, 23, 42, 0.98));
        overflow: hidden;
      }

      ng-diagram {
        flex: 1 1 auto;
        --ngd-diagram-background-color: rgba(248, 250, 252, 0.98);
        --ngd-minimap-background: rgba(255, 255, 255, 0.96);
        --ngd-minimap-border-color: rgba(148, 163, 184, 0.3);
        --ngd-default-edge-stroke: #2563eb;
        --ngd-default-edge-stroke-hover: #1d4ed8;
        --ngd-default-edge-stroke-selected: #0f172a;
      }

      .sidebar {
        display: flex;
        flex-direction: column;
        gap: 18px;
        padding: 18px;
        border-radius: 18px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        background: rgba(15, 23, 42, 0.88);
        color: #e2e8f0;
        overflow: auto;
      }

      .sidebar__header h2,
      .sidebar__empty h2 {
        margin: 8px 0 6px;
        font-size: 1.45rem;
      }

      .sidebar__header p,
      .sidebar__empty p {
        margin: 0;
        color: #94a3b8;
        line-height: 1.5;
      }

      .eyebrow {
        display: inline-flex;
        align-self: flex-start;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        border: 1px solid rgba(125, 211, 252, 0.45);
        color: #67e8f9;
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
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .info-grid > div,
      .list-card {
        padding: 12px;
        border-radius: 14px;
        background: rgba(30, 41, 59, 0.74);
        border: 1px solid rgba(148, 163, 184, 0.14);
      }

      .label {
        display: block;
        margin-bottom: 6px;
        color: #94a3b8;
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
        color: #94a3b8;
        font-size: 0.82rem;
      }

      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .chip {
        padding: 0.32rem 0.58rem;
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.14);
        border: 1px solid rgba(96, 165, 250, 0.28);
        color: #bfdbfe;
        font-size: 0.8rem;
      }

      .rules {
        margin: 0;
        padding-left: 1.1rem;
        color: #cbd5e1;
      }

      .error {
        position: absolute;
        top: 12px;
        left: 12px;
        max-width: 440px;
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid rgba(252, 165, 165, 0.4);
        background: rgba(69, 10, 10, 0.88);
        color: #fecaca;
        font-size: 14px;
        z-index: 10;
      }

      .empty-state {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        color: #cbd5e1;
        text-align: center;
        pointer-events: none;
        z-index: 1;
      }

      .empty-state-card {
        max-width: 420px;
        padding: 18px 20px;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        background: rgba(15, 23, 42, 0.72);
        box-shadow: 0 20px 40px rgba(2, 6, 23, 0.35);
      }

      @media (max-width: 1100px) {
        .graph-shell {
          grid-template-columns: 1fr;
        }

        .diagram-stage,
        .sidebar,
        :host {
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

      this.model.updateNodes(
        graph.nodes.map((node, idx) => ({
          id: node.id,
          position: node.position ?? fallbackPosition(idx),
          data: {
            label: node.name,
            entity: node,
          },
        })),
      );

      this.model.updateEdges(
        graph.links.map((link, idx) => ({
          id: link.id ?? `edge-${idx}`,
          source: link.source,
          target: link.target,
          data: {
            label: link.label ?? '',
            channel: link.channel ?? '',
            relation: link.metadata,
          },
        })),
      );

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
}
