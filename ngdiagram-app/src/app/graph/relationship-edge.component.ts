import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import {
  NgDiagramBaseEdgeComponent,
  NgDiagramBaseEdgeLabelComponent,
  type Edge,
  type NgDiagramEdgeTemplate,
} from 'ng-diagram';
import type { DomainRelationshipMetadata } from './services/diagram-api.service';
import { getRelationshipEdgeAppearance } from './relationship-edge-styles';

type DiagramEdgeData = {
  label: string;
  channel: string;
  relation?: DomainRelationshipMetadata;
};

const STROKE_WIDTH_DEFAULT = 3;
const STROKE_WIDTH_SELECTED = 5;

@Component({
  selector: 'app-relationship-edge',
  standalone: true,
  imports: [CommonModule, NgDiagramBaseEdgeComponent, NgDiagramBaseEdgeLabelComponent],
  template: `
    <ng-diagram-base-edge
      [edge]="edge()"
      [routing]="'bezier'"
      [stroke]="appearance().stroke"
      [strokeDasharray]="appearance().dasharray"
      [strokeWidth]="strokeWidth()"
      targetArrowhead="ng-diagram-arrow"
    >
      @if (edgeLabel(); as label) {
        <ng-diagram-base-edge-label [id]="labelId()" [positionOnEdge]="0.5">
          <div
            class="relationship-edge-label"
            [class.relationship-edge-label--selected]="edge().selected"
            [style.--relationship-edge-color]="appearance().stroke"
            [style.--relationship-edge-bg]="appearance().labelBackground"
          >
            {{ label }}
          </div>
        </ng-diagram-base-edge-label>
      }
    </ng-diagram-base-edge>
  `,
  styles: [
    `
      .relationship-edge-label {
        padding: 0.28rem 0.7rem;
        border: 2px solid color-mix(in srgb, var(--relationship-edge-color) 50%, white);
        border-radius: 999px;
        background: var(--relationship-edge-bg);
        color: color-mix(in srgb, var(--relationship-edge-color) 92%, black);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        white-space: nowrap;
        box-shadow:
          0 0 0 3px rgba(255, 255, 255, 0.95),
          0 4px 12px rgba(15, 23, 42, 0.15);
        transition: all 0.2s ease;
      }

      .relationship-edge-label--selected {
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--relationship-edge-color) 25%, white);
        transform: scale(1.08);
      }
    `,
  ],
})
export class RelationshipEdgeComponent implements NgDiagramEdgeTemplate<DiagramEdgeData> {
  edge = input.required<Edge<DiagramEdgeData>>();

  protected readonly appearance = computed(() =>
    getRelationshipEdgeAppearance(
      this.edge().data.relation?.relationType,
      this.edge().data.relation?.cardinality,
    ),
  );

  protected readonly strokeWidth = computed(() =>
    this.edge().selected ? STROKE_WIDTH_SELECTED : STROKE_WIDTH_DEFAULT,
  );

  protected readonly edgeLabel = computed(() => {
    const cardinality = this.edge().data.relation?.cardinality;
    const relationType = this.edge().data.relation?.relationType;
    const label = this.edge().data.label.trim();

    // Prefer cardinality for label, fallback to relationType or custom label
    return cardinality || relationType || label || null;
  });

  protected readonly labelId = computed(() => `${this.edge().id}-label`);
}
