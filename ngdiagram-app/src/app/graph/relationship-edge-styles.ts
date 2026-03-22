import type { DomainRelationshipMetadata } from './services/diagram-api.service';

export type RelationshipType = NonNullable<DomainRelationshipMetadata['relationType']>;
export type CardinalityType = '1:1' | '1:N' | 'N:1' | 'N:M';

export type RelationshipEdgeAppearance = {
  stroke: string;
  labelBackground: string;
  dasharray?: string;
};

const DEFAULT_EDGE_APPEARANCE: RelationshipEdgeAppearance = {
  stroke: '#6c757d',
  labelBackground: '#f1f3f5',
};

// Colors are chosen from the Okabe-Ito palette for high contrast and better
// distinguishability across common color-vision deficiencies.
// Cardinality-based color coding:
// - 1:1 (Orange): One-to-one relationship - unique association
// - 1:N (Blue): One-to-many relationship - parent to children
// - N:1 (Green): Many-to-one relationship - children to parent
// - N:M (Purple): Many-to-many relationship - complex association
const CARDINALITY_EDGE_APPEARANCES: Record<CardinalityType, RelationshipEdgeAppearance> = {
  '1:1': {
    stroke: '#D55E00',
    labelBackground: '#FBE9DF',
  },
  '1:N': {
    stroke: '#0072B2',
    labelBackground: '#E1F0F9',
  },
  'N:1': {
    stroke: '#009E73',
    labelBackground: '#DDF5EC',
  },
  'N:M': {
    stroke: '#CC79A7',
    labelBackground: '#F8E7F1',
    dasharray: '8 5',
  },
};

/**
 * Get edge appearance based on cardinality from relationship metadata.
 * Falls back to relationType if cardinality is not available.
 */
export const getRelationshipEdgeAppearance = (
  relationType?: string,
  cardinality?: string,
): RelationshipEdgeAppearance => {
  // Try cardinality first (preferred)
  if (cardinality) {
    const cardinalityKey = cardinality as CardinalityType;
    if (CARDINALITY_EDGE_APPEARANCES[cardinalityKey]) {
      return CARDINALITY_EDGE_APPEARANCES[cardinalityKey];
    }
  }

  // Fallback to relationType for backward compatibility
  if (relationType) {
    const relationTypeKey = relationType as RelationshipType;
    const appearanceMap: Record<RelationshipType, RelationshipEdgeAppearance> = {
      OneToOne: CARDINALITY_EDGE_APPEARANCES['1:1'],
      OneToMany: CARDINALITY_EDGE_APPEARANCES['1:N'],
      ManyToOne: CARDINALITY_EDGE_APPEARANCES['N:1'],
      ManyToMany: CARDINALITY_EDGE_APPEARANCES['N:M'],
    };
    if (appearanceMap[relationTypeKey]) {
      return appearanceMap[relationTypeKey];
    }
  }

  return DEFAULT_EDGE_APPEARANCE;
};

/**
 * Get the edge type string for template mapping based on cardinality.
 */
export const getRelationshipEdgeType = (
  relationType?: string,
  cardinality?: string,
): string => {
  // Use cardinality if available
  if (cardinality) {
    switch (cardinality) {
      case '1:1':
        return 'relationship-one-to-one';
      case '1:N':
        return 'relationship-one-to-many';
      case 'N:1':
        return 'relationship-many-to-one';
      case 'N:M':
        return 'relationship-many-to-many';
    }
  }

  // Fallback to relationType
  switch (relationType) {
    case 'OneToOne':
      return 'relationship-one-to-one';
    case 'OneToMany':
      return 'relationship-one-to-many';
    case 'ManyToOne':
      return 'relationship-many-to-one';
    case 'ManyToMany':
      return 'relationship-many-to-many';
    default:
      return 'relationship-default';
  }
};
