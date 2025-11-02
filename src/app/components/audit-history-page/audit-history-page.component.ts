import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditHistoryComponent } from '../admin-panel/audit-history.component';

@Component({
  selector: 'app-audit-history-page',
  standalone: true,
  imports: [CommonModule, AuditHistoryComponent],
  template: `
    <div class="container-fluid p-0">
      <app-audit-history></app-audit-history>
    </div>
  `
})
export class AuditHistoryPageComponent {}
