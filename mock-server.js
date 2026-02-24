/**
 * Minimal mock API server (Node.js built-ins only, no external npm deps).
 *
 * Serves GET /api/graph with the contents of graph-mock.json.
 * The Angular dev server proxies /api -> http://localhost:3000 via proxy.conf.json.
 *
 * Usage:
 *   node mock-server.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT      = 3000;
const MOCK_FILE = path.join(__dirname, 'graph-mock.json');

const server = http.createServer((req, res) => {
  const { pathname, query } = url.parse(req.url, true);

  // ── CORS headers (allow Angular dev server origin) ──────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // ── GET /api/graph ───────────────────────────────────────────────────
  if (pathname === '/api/graph') {
    const view          = query.view ?? 'all';
    const includeLayout = query.includeLayout === 'true';

    const allowed = ['all', 'agents', 'modules'];
    if (!allowed.includes(view)) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: `Unsupported view: "${view}". Allowed: ${allowed.join(', ')}` }));
      return;
    }

    let data;
    try {
      data = JSON.parse(fs.readFileSync(MOCK_FILE, 'utf8'));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to read mock data' }));
      return;
    }

    // Filter nodes by view
    if (view !== 'all') {
      const typeMap = { agents: 'agent', modules: 'module' };
      const keep    = new Set(
        data.nodes.filter(n => n.type === typeMap[view]).map(n => n.id),
      );
      data = {
        nodes:       data.nodes.filter(n => keep.has(n.id)),
        links:       data.links.filter(l => keep.has(l.source) && keep.has(l.target)),
        layoutHints: data.layoutHints?.filter(h => keep.has(h.id)),
      };
    }

    // Strip layout hints unless explicitly requested
    if (!includeLayout) {
      delete data.layoutHints;
    }

    res.writeHead(200);
    res.end(JSON.stringify(data, null, 2));
    return;
  }

  // ── 404 fallback ─────────────────────────────────────────────────────
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Mock API listening on http://localhost:${PORT}`);
  console.log('  GET /api/graph');
  console.log('  GET /api/graph?view=agents');
  console.log('  GET /api/graph?includeLayout=true');
});
