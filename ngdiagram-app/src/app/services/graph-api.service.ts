import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';

export interface GraphNode {
  id: string;
  name: string;
  type: 'agent' | 'module' | 'broker';
  status: 'healthy' | 'warn' | 'offline';
}

export interface GraphLink {
  id: string;
  source: string;
  target: string;
  label?: string;
  channel?: string;
}

export interface LayoutHint {
  id: string;
  x: number;
  y: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  links: GraphLink[];
  layoutHints?: LayoutHint[];
}

const FALLBACK_SPREAD = 160;

const fallbackPosition = (idx: number): { x: number; y: number } => ({
  x: FALLBACK_SPREAD * ((idx % 3) + 1),
  y: FALLBACK_SPREAD * (Math.floor(idx / 3) + 1),
});

/**
 * GraphApiService fetches the agent/module communication graph from the backend
 * (/api/graph) and maps it to the format expected by ng-diagram.
 *
 * This service encapsulates all HTTP concerns so that diagram components
 * only deal with ng-diagram model data.
 *
 * @see https://www.ngdiagram.dev/docs/intro/services/
 * @see https://www.ngdiagram.dev/docs/intro/architecture/
 */
@Injectable({ providedIn: 'root' })
export class GraphApiService {
  private readonly http = inject(HttpClient);

  /** Fetch graph from the backend API, falling back to bundled assets on error. */
  fetchGraph(): Observable<{ graph: GraphResponse; source: 'api' | 'mock' }> {
    return this.http.get<GraphResponse>('/api/graph?includeLayout=true').pipe(
      map((graph) => ({ graph, source: 'api' as const })),
      catchError(() =>
        this.http
          .get<GraphResponse>('assets/graph-mock.json')
          .pipe(map((graph) => ({ graph, source: 'mock' as const }))),
      ),
    );
  }

  /** Map a GraphResponse to ng-diagram node + edge arrays. */
  toModelData(graph: GraphResponse): {
    nodes: { id: string; position: { x: number; y: number }; data: Record<string, unknown> }[];
    edges: { id: string; source: string; target: string; data: Record<string, unknown> }[];
  } {
    const posMap = new Map(
      (graph.layoutHints ?? []).map((h) => [h.id, { x: h.x, y: h.y }]),
    );

    return {
      nodes: graph.nodes.map((n, idx) => ({
        id: n.id,
        position: posMap.get(n.id) ?? fallbackPosition(idx),
        data: { label: n.name, type: n.type, status: n.status },
      })),
      edges: graph.links.map((l, idx) => ({
        id: l.id ?? `edge-${idx}`,
        source: l.source,
        target: l.target,
        data: { label: l.label ?? '', channel: l.channel ?? '' },
      })),
    };
  }
}
