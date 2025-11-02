import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitleCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-entity-table',
  templateUrl: './admin-entity-table.component.html',
  styleUrls: ['./admin-entity-table.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe]
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

  // Búsqueda rápida y paginación
  searchTerm: string = '';
  pageSize = 10;
  currentPage = 1;

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
        this.items = res?.data || res || [];
        this.loading = false;
        this.resetPaging();
      },
      error: () => {
        this.items = [];
        this.loading = false;
      }
    });
  }

  refresh() {
    this.fetchData();
  }

  onSearchChange() {
    this.resetPaging();
  }

  onPageSizeChange() {
    this.resetPaging();
  }

  resetPaging() {
    this.currentPage = 1;
  }

  get filteredItems(): any[] {
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (!term) return this.items;
    try {
      return this.items.filter((item) =>
        Object.values(item || {}).some((val: any) =>
          String(val ?? '').toLowerCase().includes(term)
        )
      );
    } catch {
      return this.items;
    }
  }

  get totalItems(): number {
    return this.filteredItems.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get paginatedItems(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }

  changePage(page: number) {
    const p = Math.max(1, Math.min(this.totalPages, page));
    this.currentPage = p;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  trackById(index: number, item: any) {
    return item?.id ?? index;
  }
}
