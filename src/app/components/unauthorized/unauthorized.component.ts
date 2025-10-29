import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="unauthorized p-4 text-center">
      <h2>No autorizado</h2>
      <p>No tienes permisos para ver esta página.</p>
      <div class="mt-3">
        <button class="btn btn-primary" (click)="goHome()">Ir al inicio</button>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized { max-width: 560px; margin: 2rem auto; }
  `]
})
export class UnauthorizedComponent {
  constructor(private router: Router) {}
  goHome() { this.router.navigate(['/dashboard']); }
}
