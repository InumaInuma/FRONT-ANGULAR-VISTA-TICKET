import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Colaborador } from '../../models/colaborador.model';
import { SiglaService } from '../../core/services/sigla';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-superadmin',
  imports: [CommonModule, FormsModule],
  templateUrl: './superadmin.html',
  styleUrl: './superadmin.scss',
})
export class Superadmin implements OnInit {
  totalRecords = 0;
  colaboradores: any[] = [];

  pageNumber = 1;
  pageSize = 10;
  hasMore = true;

  dniFiltro: string | null = null;

  showConfirmModal = false;
  selectedColaborador: any = null;
  newRole: number | null = null;

  constructor(
    private siglaService: SiglaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private recalcPagination(): void {
    this.hasMore = this.pageNumber * this.pageSize < this.totalRecords;
  }

  loadData(): void {
    const dni = this.dniFiltro?.trim() || undefined;
    this.siglaService
      .getColaboradores(this.pageNumber, this.pageSize, dni)
      .subscribe((res) => {
        this.colaboradores = res.items;
        this.totalRecords = res.totalRecords;
        // 🔥 recalcular SIEMPRE
        this.recalcPagination();
        this.cdr.detectChanges();
      });
  }

  confirmRoleChange(colab: any) {
    this.selectedColaborador = colab;
    this.newRole = colab.idRol;
    this.showConfirmModal = true;
    // 🔥 fuerza render del modal
    this.cdr.detectChanges();
  }

  cancelChange() {
    this.showConfirmModal = false;
    this.selectedColaborador = null;
    this.cdr.detectChanges();
  }

  applyChange() {
    this.siglaService
      .updateRol(this.selectedColaborador.codPer, this.newRole!)
      .subscribe({
        next: () => {
          alert('✅ Rol actualizado');
          this.showConfirmModal = false;
          this.loadData();
        },
        error: () => alert('❌ Error al actualizar rol'),
      });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.loadData();
  }

  nextPage(): void {
    if (!this.hasMore) return;

    this.pageNumber++;
    this.loadData();
  }

  prevPage(): void {
    if (this.pageNumber === 1) return;
    this.pageNumber--;
    this.loadData();
  }

  updateRol(colab: any): void {
    this.siglaService.updateRol(colab.codPer, colab.idRol).subscribe({
      next: () => alert('✅ Rol actualizado'),
      error: () => alert('❌ Error al actualizar rol'),
    });
  }

  getInitials(nombre: string, apellido: string): string {
    const inicial1 = nombre?.charAt(0)?.toUpperCase() || '';
    const inicial2 = apellido?.charAt(0)?.toUpperCase() || '';
    return inicial1 + inicial2;
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }
}
