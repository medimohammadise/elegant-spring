import { z } from 'zod';

export const domainFieldSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  column: z.string().optional(),
  nullable: z.boolean().optional(),
  id: z.boolean().optional(),
  unique: z.boolean().optional(),
});

export const entityMetadataSchema = z.object({
  kind: z.literal('jpa-entity'),
  packageName: z.string().min(1),
  tableName: z.string().min(1),
  idField: z.string().min(1),
  description: z.string().optional(),
  annotations: z.array(z.string()).default([]),
  businessRules: z.array(z.string()).default([]),
  fields: z.array(domainFieldSchema).default([]),
});

export const relationshipMetadataSchema = z.object({
  relationType: z.enum(['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany']),
  sourceField: z.string().min(1),
  targetField: z.string().optional(),
  cardinality: z.string().min(1),
  owningSide: z.boolean().optional(),
  fetch: z.enum(['EAGER', 'LAZY']).optional(),
});

export const entitySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.string().default('entity'),
  status: z.enum(['healthy', 'warn', 'offline']).default('healthy'),
  metadata: entityMetadataSchema.optional(),
  layoutHint: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const relationshipSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
  channel: z.string().optional(),
  metadata: relationshipMetadataSchema.optional(),
});

export const diagramPayloadSchema = z
  .object({
    version: z.string().default('1.0'),
    entities: z.array(entitySchema).min(1),
    relationships: z.array(relationshipSchema).default([]),
  })
  .superRefine((payload, ctx) => {
    const ids = new Set(payload.entities.map((entity) => entity.id));

    payload.relationships.forEach((relationship, index) => {
      if (!ids.has(relationship.source)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `relationship[${index}] source '${relationship.source}' does not exist`,
          path: ['relationships', index, 'source'],
        });
      }

      if (!ids.has(relationship.target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `relationship[${index}] target '${relationship.target}' does not exist`,
          path: ['relationships', index, 'target'],
        });
      }
    });
  });

export type DiagramPayload = z.infer<typeof diagramPayloadSchema>;
