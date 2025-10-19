import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitleCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-entity-table',
  templateUrl: './admin-entity-table.component.html',
  styleUrls: ['./admin-entity-table.component.css'],
  standalone: true,
  imports: [CommonModule, TitleCasePipe]
})
export class AdminEntityTableComponent {
  selectedItem: any = null;
  showDetails(item: any) {
    this.selectedItem = item;
    // Aquí se puede abrir un modal o mostrar una ficha de detalles
    // Por ahora solo guarda el item seleccionado
  }
  @Input() entity: string = '';
  items: any[] = [];
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnChanges() {
    if (this.entity) {
      this.fetchData();
    }
  }

  fetchData() {
    this.loading = true;
    this.http.get(`/api/${this.entity}`).subscribe({
      next: (res: any) => {
        this.items = res.data || res;
        this.loading = false;
      },
      error: () => {
        this.items = [];
        this.loading = false;
      }
    });
  }
}
