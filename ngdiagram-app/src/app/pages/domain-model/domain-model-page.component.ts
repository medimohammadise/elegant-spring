import { Component } from '@angular/core';
import { CardBodyComponent, CardComponent } from '@coreui/angular';
import { GraphComponent } from '../../graph/graph.component';

@Component({
  selector: 'app-domain-model-page',
  standalone: true,
  imports: [CardComponent, CardBodyComponent, GraphComponent],
  templateUrl: './domain-model-page.component.html',
  styleUrl: './domain-model-page.component.scss',
})
export class DomainModelPageComponent {}
