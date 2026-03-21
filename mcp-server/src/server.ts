import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { diagramPayloadSchema, type DiagramPayload } from './contracts.js';

const PORT = Number.parseInt(process.env.PORT ?? '3100', 10);
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

let currentGraph: DiagramPayload = {
  version: '1.0',
  entities: [
    {
      id: 'employee',
      label: 'Employee',
      type: 'entity',
      status: 'healthy',
      layoutHint: { x: 180, y: 140 },
      metadata: {
        kind: 'jpa-entity',
        packageName: 'com.example.hr.domain',
        tableName: 'employees',
        idField: 'id',
        description: 'Core workforce record that belongs to one department and owns one salary aggregate.',
        annotations: ['@Entity', '@Table(name = "employees")'],
        businessRules: ['Every employee must belong to a department.', 'Salary is managed as a dedicated aggregate.'],
        fields: [
          { name: 'id', type: 'Long', column: 'id', id: true, nullable: false },
          { name: 'employeeNumber', type: 'String', column: 'employee_number', nullable: false, unique: true },
          { name: 'fullName', type: 'String', column: 'full_name', nullable: false },
          { name: 'department', type: 'Department', column: 'department_id', nullable: false },
          { name: 'salary', type: 'Salary', nullable: false },
        ],
      },
    },
    {
      id: 'department',
      label: 'Department',
      type: 'entity',
      status: 'healthy',
      layoutHint: { x: 460, y: 140 },
      metadata: {
        kind: 'jpa-entity',
        packageName: 'com.example.hr.domain',
        tableName: 'departments',
        idField: 'id',
        description: 'Organizational unit that groups employees and exposes a manager reference.',
        annotations: ['@Entity', '@Table(name = "departments")'],
        businessRules: ['A department can contain many employees.', 'Department names must be unique.'],
        fields: [
          { name: 'id', type: 'Long', column: 'id', id: true, nullable: false },
          { name: 'name', type: 'String', column: 'name', nullable: false, unique: true },
          { name: 'costCenter', type: 'String', column: 'cost_center', nullable: false },
          { name: 'employees', type: 'List<Employee>', nullable: true },
        ],
      },
    },
    {
      id: 'salary',
      label: 'Salary',
      type: 'entity',
      status: 'healthy',
      layoutHint: { x: 740, y: 140 },
      metadata: {
        kind: 'jpa-entity',
        packageName: 'com.example.hr.domain',
        tableName: 'salaries',
        idField: 'id',
        description: 'Compensation aggregate linked one-to-one with an employee.',
        annotations: ['@Entity', '@Table(name = "salaries")'],
        businessRules: ['Each employee has at most one active salary record.'],
        fields: [
          { name: 'id', type: 'Long', column: 'id', id: true, nullable: false },
          { name: 'baseAmount', type: 'BigDecimal', column: 'base_amount', nullable: false },
          { name: 'currency', type: 'String', column: 'currency', nullable: false },
          { name: 'effectiveFrom', type: 'LocalDate', column: 'effective_from', nullable: false },
          { name: 'employee', type: 'Employee', column: 'employee_id', nullable: false, unique: true },
        ],
      },
    },
  ],
  relationships: [
    {
      id: 'employee-department',
      source: 'employee',
      target: 'department',
      label: '@ManyToOne',
      channel: 'JPA',
      metadata: {
        relationType: 'ManyToOne',
        sourceField: 'department',
        targetField: 'employees',
        cardinality: 'N:1',
        owningSide: true,
        fetch: 'LAZY',
      },
    },
    {
      id: 'employee-salary',
      source: 'employee',
      target: 'salary',
      label: '@OneToOne',
      channel: 'JPA',
      metadata: {
        relationType: 'OneToOne',
        sourceField: 'salary',
        targetField: 'employee',
        cardinality: '1:1',
        owningSide: true,
        fetch: 'LAZY',
      },
    },
  ],
};

const toNgDiagramGraph = (payload: DiagramPayload) => ({
  nodes: payload.entities.map((entity, index) => ({
    id: entity.id,
    name: entity.label,
    type: entity.type,
    status: entity.status,
    metadata: entity.metadata ?? {},
    ...(entity.layoutHint
      ? {
          position: entity.layoutHint,
        }
      : {
          position: {
            x: 180 + (index % 4) * 180,
            y: 120 + Math.floor(index / 4) * 180,
          },
        }),
  })),
  links: payload.relationships,
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/diagram', (_req, res) => {
  res.json({
    version: currentGraph.version,
    generatedAt: new Date().toISOString(),
    ...toNgDiagramGraph(currentGraph),
  });
});

app.post('/api/diagram', (req, res) => {
  const parsed = diagramPayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid diagram payload',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  currentGraph = parsed.data;
  const mapped = toNgDiagramGraph(currentGraph);

  const event = JSON.stringify({
    event: 'diagram.updated',
    generatedAt: new Date().toISOString(),
    payload: mapped,
  });

  for (const client of wsServer.clients) {
    if (client.readyState === 1) {
      client.send(event);
    }
  }

  return res.status(202).json({ message: 'Diagram accepted', ...mapped });
});

const server = createServer(app);
const wsServer = new WebSocketServer({ server, path: '/ws/diagram' });

wsServer.on('connection', (socket) => {
  socket.send(
    JSON.stringify({
      event: 'diagram.snapshot',
      payload: toNgDiagramGraph(currentGraph),
      generatedAt: new Date().toISOString(),
    }),
  );
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`MCP diagram server listening on http://localhost:${PORT}`);
});
