// Minimal mock server to expose the graph API for ng-diagram demos.
// Run with: node mock-server.js
// Serves: 
//   GET  /api/graph      -> graph-mock.json
//   GET  /api/diagram    -> graph-mock.json
//   POST /api/diagram    -> save diagram state
//   GET  /api/diagram/state -> load saved diagram state

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const portEnv = process.env.PORT;
const parsedPort = Number.parseInt(portEnv ?? '', 10);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3100;
const graphPath = resolve('./graph-mock.json');
const statePath = resolve('./diagram-state.json');

// In-memory storage for diagram state
let savedDiagramState = null;

const toNgDiagramGraph = (payload) => ({
  version: payload.version ?? '1.0',
  nodes: (payload.entities ?? []).map((entity, index) => ({
    id: entity.id,
    name: entity.label,
    type: entity.type ?? 'entity',
    status: entity.status ?? 'healthy',
    metadata: entity.metadata ?? {},
    position: entity.layoutHint ?? {
      x: 180 + (index % 4) * 180,
      y: 120 + Math.floor(index / 4) * 180,
    },
  })),
  links: payload.relationships ?? [],
});

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const safeMessage = (err) => {
  if (process.env.NODE_ENV === 'production') return 'Internal error';
  if (err instanceof Error) return err.message;
  return String(err);
};

const server = createServer(async (req, res) => {
  const url = req.url || '/';
  const method = req.method || 'GET';

  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Handle GET /api/graph and GET /api/diagram
  if (method === 'GET' && (url === '/api/graph' || url === '/api/diagram')) {
    try {
      const data = await readFile(graphPath, 'utf8');
      json(res, 200, toNgDiagramGraph(JSON.parse(data)));
    } catch (err) {
      json(res, 500, {
        error: 'Failed to read mock graph',
        message: safeMessage(err),
        hint: 'Ensure graph-mock.json exists in the project root and is readable.',
      });
    }
    return;
  }

  // Handle GET /api/diagram/state - load saved state
  if (method === 'GET' && url === '/api/diagram/state') {
    if (savedDiagramState) {
      json(res, 200, toNgDiagramGraph(savedDiagramState));
    } else {
      json(res, 404, {
        error: 'No saved state',
        message: 'No diagram state has been saved yet.',
      });
    }
    return;
  }

  // Handle POST /api/diagram - save diagram state
  if (method === 'POST' && url === '/api/diagram') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      console.log(`[POST /api/diagram] Received body length: ${body.length}`);
      try {
        const state = JSON.parse(body);
        console.log('[POST /api/diagram] Parsed state successfully:', Object.keys(state));
        savedDiagramState = state;
        // Also persist to file for durability
        await writeFile(statePath, JSON.stringify(state, null, 2));
        console.log('[POST /api/diagram] Saved state successfully');
        json(res, 200, {
          success: true,
          message: 'Diagram state saved successfully',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[POST /api/diagram] Failed to parse state:', err.message);
        console.error('[POST /api/diagram] Body preview:', body.slice(0, 200));
        json(res, 400, {
          error: 'Invalid state data',
          message: safeMessage(err),
          bodyPreview: body.slice(0, 200),
        });
      }
    });
    return;
  }

  json(res, 404, { error: 'Not found', message: 'Use /api/graph or /api/diagram endpoints.' });
});

// Load persisted state on startup (if exists)
readFile(statePath, 'utf8')
  .then(data => {
    savedDiagramState = JSON.parse(data);
    console.log('Loaded previously saved diagram state from file.');
  })
  .catch(() => {
    console.log('No previously saved diagram state found.');
  });

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Mock graph API ready on http://localhost:${PORT}/api/graph`);
  console.log(`Diagram state endpoints: POST /api/diagram, GET /api/diagram/state`);
});
