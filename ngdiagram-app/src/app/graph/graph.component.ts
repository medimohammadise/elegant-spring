import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  Injector,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NgDiagramComponent,
  NgDiagramModelService,
  NgDiagramSelectionService,
  NgDiagramService,
  NgDiagramViewportService,
  initializeModel,
  provideNgDiagram,
} from 'ng-diagram';

import { GraphApiService } from '../services/graph-api.service';

interface NodeData {
  label: string;
  type: string;
  status: string;
}

/**
 * GraphComponent renders the agent/module communication graph using ng-diagram.
 *
 * It demonstrates the ngDiagram services architecture:
 *
 * - {@link NgDiagramService}          – listens to `diagramInit` to auto-fit the
 *                                        view once the diagram is ready, and exposes
 *                                        `isInitialized` / `actionState` signals.
 * - {@link NgDiagramModelService}     – reads `nodes` and `edges` signals for live
 *                                        element counts shown in the status bar.
 * - {@link NgDiagramSelectionService} – tracks selected nodes/edges and shows a
 *                                        details panel with metadata.
 * - {@link NgDiagramViewportService}  – provides "Fit View", zoom-in, and zoom-out
 *                                        toolbar buttons.
 *
 * @see https://www.ngdiagram.dev/docs/intro/services/
 * @see https://www.ngdiagram.dev/docs/intro/architecture/
 */
@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [CommonModule, NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `
    <!-- ── Toolbar ─────────────────────────────────────── -->
    <div class="toolbar">
      <span class="toolbar-title">Agent Communication Graph</span>

      <div class="toolbar-stats" *ngIf="diagramService.isInitialized()">
        <span>Nodes: {{ modelService.nodes().length }}</span>
        <span>Edges: {{ modelService.edges().length }}</span>
      </div>

      <div class="toolbar-actions">
        <button
          class="btn"
          (click)="fitView()"
          [disabled]="!diagramService.isInitialized()"
          title="Fit all nodes into view"
        >
          ⊞ Fit View
        </button>
        <button
          class="btn"
          (click)="zoomIn()"
          [disabled]="!viewportService.canZoomIn()"
          title="Zoom in"
        >
          +
        </button>
        <button
          class="btn"
          (click)="zoomOut()"
          [disabled]="!viewportService.canZoomOut()"
          title="Zoom out"
        >
          −
        </button>
      </div>
    </div>

    <!-- ── Canvas + side panel ────────────────────────── -->
    <div class="canvas-area">
      <!-- Error banner -->
      <div class="banner banner-error" *ngIf="error">
        {{ error }}
      </div>

      <!-- Mock data notice -->
      <div class="banner banner-info" *ngIf="usingMock">
        Using bundled mock data – API not reachable.
      </div>

      <!-- Main diagram -->
      <ng-diagram
        [model]="model"
        (diagramInit)="onDiagramInit()"
        (selectionChanged)="onSelectionChanged()"
      ></ng-diagram>

      <!-- Selection details panel (NgDiagramSelectionService) -->
      <aside
        class="details-panel"
        *ngIf="selectionService.selection().nodes.length > 0"
      >
        <h3 class="panel-title">Selected</h3>
        <ul class="panel-list">
          <li
            *ngFor="let node of selectionService.selection().nodes"
            class="panel-item"
          >
            <strong>{{ asNodeData(node.data).label }}</strong>
            <div class="chip chip-type chip-{{ asNodeData(node.data).type }}">
              {{ asNodeData(node.data).type }}
            </div>
            <div class="chip chip-status chip-{{ asNodeData(node.data).status }}">
              {{ asNodeData(node.data).status }}
            </div>
          </li>
        </ul>
      </aside>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #0d1117;
        color: #c9d1d9;
        font-family: system-ui, sans-serif;
      }

      /* ── Toolbar ─────────────────────── */
      .toolbar {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 8px 16px;
        background: #161b22;
        border-bottom: 1px solid #30363d;
        flex-shrink: 0;
      }
      .toolbar-title {
        font-weight: 600;
        font-size: 14px;
        color: #e6edf3;
      }
      .toolbar-stats {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: #8b949e;
      }
      .toolbar-actions {
        margin-left: auto;
        display: flex;
        gap: 6px;
      }
      .btn {
        padding: 4px 10px;
        background: #21262d;
        border: 1px solid #30363d;
        border-radius: 6px;
        color: #c9d1d9;
        cursor: pointer;
        font-size: 13px;
      }
      .btn:hover:not(:disabled) {
        background: #30363d;
      }
      .btn:disabled {
        opacity: 0.45;
        cursor: default;
      }

      /* ── Canvas area ─────────────────── */
      .canvas-area {
        position: relative;
        flex: 1;
        display: flex;
        overflow: hidden;
      }
      ng-diagram {
        flex: 1;
      }

      /* ── Banners ─────────────────────── */
      .banner {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 20;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        max-width: 320px;
      }
      .banner-error {
        background: #2d1b1b;
        color: #fca5a5;
        border: 1px solid #7f1d1d;
      }
      .banner-info {
        background: #1c2a3a;
        color: #93c5fd;
        border: 1px solid #1d4ed8;
        top: 56px;
      }

      /* ── Details panel ───────────────── */
      .details-panel {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 200px;
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 8px;
        padding: 12px;
        z-index: 10;
      }
      .panel-title {
        margin: 0 0 8px;
        font-size: 13px;
        font-weight: 600;
        color: #e6edf3;
      }
      .panel-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .panel-item {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        font-size: 13px;
      }
      .chip {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
      }
      /* type colours */
      .chip-agent  { background: #1f3a5f; color: #93c5fd; }
      .chip-module { background: #1f3a2a; color: #86efac; }
      .chip-broker { background: #3a2a1f; color: #fcd34d; }
      /* status colours */
      .chip-healthy  { background: #14532d; color: #86efac; }
      .chip-warn     { background: #78350f; color: #fcd34d; }
      .chip-offline  { background: #450a0a; color: #fca5a5; }
    `,
  ],
})
export class GraphComponent implements OnInit {
  // ── Angular / custom services ──────────────────────────────────────────
  private readonly apiService = inject(GraphApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  // ── ngDiagram services (provided via provideNgDiagram()) ───────────────
  /** Main service: initialization state, action state, config, events. */
  readonly diagramService = inject(NgDiagramService);
  /** Model service: reactive node/edge signals, serialization. */
  readonly modelService = inject(NgDiagramModelService);
  /** Selection service: tracks selected nodes and edges reactively. */
  readonly selectionService = inject(NgDiagramSelectionService);
  /** Viewport service: zoom, pan, fit-to-view. */
  readonly viewportService = inject(NgDiagramViewportService);

  model = initializeModel({ nodes: [], edges: [] }, this.injector);
  error?: string;
  usingMock = false;

  ngOnInit(): void {
    this.apiService
      .fetchGraph()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ graph, source }) => {
          const { nodes, edges } = this.apiService.toModelData(graph);
          this.model = initializeModel({ nodes, edges }, this.injector);
          this.usingMock = source === 'mock';
          this.error = undefined;
        },
        error: (err) => {
          this.error = `Unable to load graph: ${err?.message ?? 'unknown error'}`;
          this.model = initializeModel({ nodes: [], edges: [] }, this.injector);
        },
      });
  }

  /**
   * Called when ng-diagram emits `diagramInit`.
   *
   * The `(diagramInit)` output binding in the template routes this event here.
   * At this point the diagram is fully initialised and all element dimensions
   * are measured, so it is safe to call `zoomToFit` immediately.
   *
   * Uses {@link NgDiagramViewportService.zoomToFit} via the
   * {@link NgDiagramViewportService} to fit all nodes into the visible area.
   */
  onDiagramInit(): void {
    this.viewportService.zoomToFit({ padding: 40 });
  }

  /** Called when the selection changes (wired to `selectionChanged` output). */
  onSelectionChanged(): void {
    // The template reads selectionService.selection() directly via signals;
    // this handler exists as a hook for future side-effects (logging, analytics…).
  }

  /** Fit all diagram content into the visible viewport. */
  fitView(): void {
    this.viewportService.zoomToFit({ padding: 40 });
  }

  /** Zoom in by 20%. */
  zoomIn(): void {
    this.viewportService.zoom(1.2);
  }

  /** Zoom out by 20%. */
  zoomOut(): void {
    this.viewportService.zoom(0.8);
  }

  /** Type-safe accessor for node data in templates. */
  asNodeData(data: object): NodeData {
    return data as NodeData;
  }
}
