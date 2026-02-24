import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GraphApiService, GraphResponse } from './graph-api.service';

const MOCK_GRAPH: GraphResponse = {
  nodes: [
    { id: 'orchestrator', name: 'Orchestrator', type: 'agent', status: 'healthy' },
    { id: 'executor',     name: 'Executor',     type: 'agent', status: 'warn'    },
  ],
  links: [
    { id: 'l1', source: 'orchestrator', target: 'executor', label: 'tasks', channel: 'HTTP' },
  ],
  layoutHints: [
    { id: 'orchestrator', x: 100, y: 80 },
    { id: 'executor',     x: 300, y: 80 },
  ],
};

describe('GraphApiService', () => {
  let service: GraphApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(GraphApiService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('fetchGraph() resolves with source="api" when the API responds', (done) => {
    service.fetchGraph().subscribe(({ graph, source }) => {
      expect(source).toBe('api');
      expect(graph.nodes.length).toBe(2);
      done();
    });

    http.expectOne('/api/graph?includeLayout=true').flush(MOCK_GRAPH);
  });

  it('fetchGraph() falls back to mock asset when API fails', (done) => {
    service.fetchGraph().subscribe(({ graph, source }) => {
      expect(source).toBe('mock');
      expect(graph.nodes.length).toBe(2);
      done();
    });

    // Fail the primary API call
    http.expectOne('/api/graph?includeLayout=true').error(new ProgressEvent('error'));
    // Serve the fallback asset
    http.expectOne('assets/graph-mock.json').flush(MOCK_GRAPH);
  });

  describe('toModelData()', () => {
    it('maps nodes using layoutHints positions', () => {
      const { nodes } = service.toModelData(MOCK_GRAPH);
      expect(nodes[0].position).toEqual({ x: 100, y: 80 });
      expect(nodes[1].position).toEqual({ x: 300, y: 80 });
    });

    it('uses fallback positions when layoutHints are absent', () => {
      const graph: GraphResponse = { nodes: MOCK_GRAPH.nodes, links: MOCK_GRAPH.links };
      const { nodes } = service.toModelData(graph);
      expect(nodes[0].position.x).toBeGreaterThan(0);
      expect(nodes[0].position.y).toBeGreaterThan(0);
    });

    it('maps edges with correct source and target', () => {
      const { edges } = service.toModelData(MOCK_GRAPH);
      expect(edges[0].source).toBe('orchestrator');
      expect(edges[0].target).toBe('executor');
      expect(edges[0].data['label']).toBe('tasks');
      expect(edges[0].data['channel']).toBe('HTTP');
    });

    it('includes node metadata (type, status, label) in data', () => {
      const { nodes } = service.toModelData(MOCK_GRAPH);
      expect(nodes[0].data['type']).toBe('agent');
      expect(nodes[0].data['status']).toBe('healthy');
      expect(nodes[0].data['label']).toBe('Orchestrator');
    });
  });
});
