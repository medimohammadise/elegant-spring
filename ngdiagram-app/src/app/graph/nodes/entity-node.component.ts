import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import {
  NgDiagramPortComponent,
  type NgDiagramNodeTemplate,
  type Node,
} from 'ng-diagram';
import type { DiagramNode, DiagramLink } from '../services/diagram-api.service';

type DiagramNodeData = {
  label: string;
  entity: DiagramNode;
  presentation: { nodeWidth: number };
  relationships?: DiagramLink[];
};

/**
 * Custom entity node component that displays JPA entity information
 * with custom ports showing cardinality for each relationship.
 */
@Component({
  selector: 'app-entity-node',
  standalone: true,
  imports: [CommonModule, NgDiagramPortComponent],
  templateUrl: './entity-node.component.html',
  styleUrls: ['./entity-node.component.scss'],
  host: {
    '[class.ng-diagram-port-hoverable]': 'true',
    '[style.--entity-node-width.px]': 'nodeWidth()',
  },
})
export class EntityNodeComponent implements NgDiagramNodeTemplate<DiagramNodeData> {
  private static readonly MAX_NAME_LENGTH = 24;
  private static readonly MAX_TABLE_LENGTH = 28;

  node = input.required<Node<DiagramNodeData>>();

  entity = computed(() => this.node().data.entity);
  entityName = computed(() => this.node().data.label);
  tableName = computed(() => this.entity().metadata?.tableName || '');
  entityDisplayName = computed(() => this.truncateLabel(this.entityName(), EntityNodeComponent.MAX_NAME_LENGTH));
  entityTooltip = computed(() => this.entityName());
  tableDisplayName = computed(() => this.truncateLabel(this.tableName(), EntityNodeComponent.MAX_TABLE_LENGTH));
  tableTooltip = computed(() => this.tableName());
  relationships = computed(() => this.node().data.relationships || []);
  nodeWidth = computed(() => this.node().data.presentation?.nodeWidth ?? 212);

  // Get source ports (relationships where this entity is the source)
  sourceRelationships = computed(() => {
    const entity = this.entity();
    const allRels = this.relationships();
    if (!entity || !allRels) return [];

    return allRels.filter((link) => link.source === entity.id);
  });

  // Get target ports (relationships where this entity is the target)
  targetRelationships = computed(() => {
    const entity = this.entity();
    const allRels = this.relationships();
    if (!entity || !allRels) return [];

    return allRels.filter((link) => link.target === entity.id);
  });

  /**
   * Get cardinality label for a relationship from this entity's perspective.
   */
  getCardinalityLabel(relationType?: string, cardinality?: string, isSource: boolean = true): string {
    if (cardinality) {
      // If this entity is the source, show the first part of cardinality
      // If this entity is the target, show the second part
      const parts = cardinality.split(':');
      if (parts.length === 2) {
        return isSource ? parts[0] : parts[1];
      }
      return cardinality;
    }

    // Fallback to relationType
    if (!relationType) return '?';

    switch (relationType) {
      case 'OneToOne':
        return '1';
      case 'OneToMany':
        return isSource ? '1' : 'N';
      case 'ManyToOne':
        return isSource ? 'N' : '1';
      case 'ManyToMany':
        return 'M';
      default:
        return '?';
    }
  }

  /**
   * Get position percentage for source ports (right side).
   */
  getSourcePortPosition(index: number, total: number): number {
    return this.getPortPosition(index, total);
  }

  /**
   * Get position percentage for target ports (left side).
   */
  getTargetPortPosition(index: number, total: number): number {
    return this.getPortPosition(index, total);
  }

  /**
   * Get CSS class for cardinality color based on the cardinality value.
   */
  getCardinalityClass(cardinality?: string, isSource: boolean = true): string {
    const label = this.getCardinalityLabel(undefined, cardinality, isSource);

    switch (label) {
      case '1':
        return 'cardinality-1';
      case 'N':
        return 'cardinality-n';
      case 'M':
        return 'cardinality-m';
      default:
        return 'cardinality-unknown';
    }
  }

  private getPortPosition(index: number, total: number): number {
    if (total <= 1) return 50;

    const start = total > 6 ? 10 : 16;
    const end = total > 6 ? 90 : 84;
    const spacing = (end - start) / (total - 1);
    return start + index * spacing;
  }

  private truncateLabel(value: string, maxLength: number): string {
    if (!value || value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1)}…`;
  }
}
