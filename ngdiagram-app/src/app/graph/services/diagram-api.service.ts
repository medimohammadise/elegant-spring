import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type DiagramNode = {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'warn' | 'offline';
  position?: { x: number; y: number };
  metadata?: DomainEntityMetadata;
};

export type DiagramLink = {
  id: string;
  source: string;
  target: string;
  label?: string;
  channel?: string;
  metadata?: DomainRelationshipMetadata;
};

export type DomainField = {
  name: string;
  type: string;
  column?: string;
  nullable?: boolean;
  id?: boolean;
  unique?: boolean;
};

export type DomainEntityMetadata = {
  kind: 'jpa-entity';
  packageName: string;
  tableName: string;
  idField: string;
  description?: string;
  annotations?: string[];
  businessRules?: string[];
  fields: DomainField[];
};

export type DomainRelationshipMetadata = {
  relationType:
    | 'OneToOne'
    | 'OneToMany'
    | 'ManyToOne'
    | 'ManyToMany';
  sourceField: string;
  targetField?: string;
  cardinality: string;
  owningSide?: boolean;
  fetch?: 'EAGER' | 'LAZY';
 };

export type DiagramResponse = {
  version: string;
  generatedAt?: string;
  nodes: DiagramNode[];
  links: DiagramLink[];
};

@Injectable({ providedIn: 'root' })
export class DiagramApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly zone: NgZone,
  ) {}

  fetchDiagram(): Observable<DiagramResponse> {
    return this.http.get<DiagramResponse>('/api/diagram');
  }

  connectDiagramStream(next: (response: DiagramResponse) => void): () => void {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws/diagram`);

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as { payload?: DiagramResponse };
        const payload = parsed.payload;
        if (!payload) return;
        this.zone.run(() => next(payload));
      } catch {
        // Ignore malformed events from backend while keeping socket alive.
      }
    };

    return () => socket.close();
  }
}
