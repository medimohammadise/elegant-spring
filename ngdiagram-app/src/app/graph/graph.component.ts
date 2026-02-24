import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { NgDiagramComponent, initializeModel, provideNgDiagram, type DiagramModel } from 'ng-diagram';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type GraphResponse = {
  nodes: { id: string; name: string; type: string; status: string }[];
  links: { id: string; source: string; target: string; label?: string; channel?: string }[];
  layoutHints?: { id: string; x: number; y: number }[];
};

// Deterministic spread used only when backend layout hints are absent.
const DEFAULT_POSITION_SPREAD = 160;
const fallbackPosition = (idx: number) => ({
  x: DEFAULT_POSITION_SPREAD * ((idx % 3) + 1),
  y: DEFAULT_POSITION_SPREAD * (Math.floor(idx / 3) + 1),
});

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [CommonModule, NgDiagramComponent],
  providers: [provideNgDiagram(), provideHttpClient()],
  template: `
    <div class="graph-shell">
      <div class="error" *ngIf="error">{{ error }}</div>
      <ng-diagram [model]="model" />
    </div>
  `,
  styles: [
    `
      .graph-shell {
        display: flex;
        height: 100vh;
        background: #0d1117;
      }
      .error {
        position: absolute;
        top: 12px;
        left: 12px;
        padding: 8px 12px;
        border-radius: 6px;
        background: #2d1b1b;
        color: #fca5a5;
        font-size: 14px;
        z-index: 10;
      }
    `,
  ],
})
export class GraphComponent implements OnInit {
  private readonly http = inject(HttpClient);
  model: DiagramModel = initializeModel({ nodes: [], edges: [] });
  error?: string;

  ngOnInit(): void {
    const destroyRef = inject(DestroyRef);
    this.http
      .get<GraphResponse>('/api/graph?includeLayout=true')
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe({
        next: (graph) => {
          const pos = new Map(graph.layoutHints?.map((hint) => [hint.id, { x: hint.x, y: hint.y }]) ?? []);
          this.model = initializeModel({
            nodes: graph.nodes.map((n, idx) => ({
              id: n.id,
              position: pos.get(n.id) ?? fallbackPosition(idx),
              data: { label: n.name, type: n.type, status: n.status },
            })),
            edges: graph.links.map((l, idx) => ({
              id: l.id ?? `edge-${idx}`,
              source: l.source,
              target: l.target,
              data: { label: l.label ?? '', channel: l.channel ?? '' },
            })),
          });
          this.error = undefined;
        },
        error: (err) => {
          const detail = err?.message ?? 'unknown error';
          this.error = `Unable to load graph. Please check your connection and try again. (${detail})`;
          this.model = initializeModel({ nodes: [], edges: [] });
        },
      });
  }
}
