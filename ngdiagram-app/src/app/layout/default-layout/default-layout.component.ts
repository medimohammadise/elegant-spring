import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NgScrollbar } from 'ngx-scrollbar';
import { IconDirective } from '@coreui/icons-angular';
import {
  ButtonDirective,
  ButtonCloseDirective,
  ContainerComponent,
  INavData,
  OffcanvasBodyComponent,
  OffcanvasComponent,
  OffcanvasHeaderComponent,
  OffcanvasTitleDirective,
  ShadowOnScrollDirective,
  SidebarBrandComponent,
  SidebarComponent,
  SidebarFooterComponent,
  SidebarHeaderComponent,
  SidebarNavComponent,
  SidebarToggleDirective,
  SidebarTogglerDirective,
} from '@coreui/angular';
import { DefaultFooterComponent } from './default-footer/default-footer.component';
import { DefaultHeaderComponent } from './default-header/default-header.component';
import { navItems } from './_nav';

@Component({
  selector: 'app-default-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    NgScrollbar,
    IconDirective,
    ButtonDirective,
    ButtonCloseDirective,
    OffcanvasComponent,
    OffcanvasHeaderComponent,
    OffcanvasBodyComponent,
    OffcanvasTitleDirective,
    SidebarComponent,
    SidebarHeaderComponent,
    SidebarBrandComponent,
    SidebarNavComponent,
    SidebarFooterComponent,
    SidebarToggleDirective,
    SidebarTogglerDirective,
    ContainerComponent,
    DefaultHeaderComponent,
    DefaultFooterComponent,
    ShadowOnScrollDirective,
  ],
  templateUrl: './default-layout.component.html',
  styleUrl: './default-layout.component.scss',
})
export class DefaultLayoutComponent {
  navItems: INavData[] = [...navItems];
  isChatOpen = false;
  draftMessage = '';
  chatMessages = [
    {
      role: 'assistant',
      text: 'AI Chat Client is ready. Ask about the domain model, CoreUI layout, or next implementation steps.',
    },
  ];

  openChat(): void {
    this.isChatOpen = true;
  }

  closeChat(): void {
    this.isChatOpen = false;
  }

  sendMessage(): void {
    const message = this.draftMessage.trim();
    if (!message) return;

    this.chatMessages = [
      ...this.chatMessages,
      { role: 'user', text: message },
      {
        role: 'assistant',
        text: 'AI chat backend is not connected yet. This launcher is ready for wiring to your agent endpoint.',
      },
    ];
    this.draftMessage = '';
  }
}
