import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CardBodyComponent, CardComponent } from '@coreui/angular';

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  imports: [CardComponent, CardBodyComponent],
  template: `
    <c-card>
      <c-card-body>
        <p class="eyebrow">{{ title }}</p>
        <h2>{{ title }}</h2>
        <p class="summary">{{ summary }}</p>
      </c-card-body>
    </c-card>
  `,
  styles: [
    `
      .eyebrow {
        margin: 0 0 0.25rem;
        color: var(--cui-primary);
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h2 {
        margin: 0;
        font-size: 1.4rem;
      }

      .summary {
        margin: 0.4rem 0 0;
        color: var(--cui-secondary-color);
      }
    `,
  ],
})
export class PlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);
  title = this.route.snapshot.data['pageTitle'] ?? 'Page';
  summary = this.route.snapshot.data['pageSummary'] ?? '';
}
