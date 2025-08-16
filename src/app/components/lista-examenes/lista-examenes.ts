import { AfterViewInit, Component, OnInit } from '@angular/core';
import { SiglaService } from '../../services/sigla';
import JsBarcode from 'jsbarcode';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';




@Component({
  selector: 'app-lista-examenes',
  standalone: true,
  imports: [CommonModule ],
  templateUrl: './lista-examenes.html',
  styleUrls: ['./lista-examenes.scss']
})
export class ListaExamenesComponent implements OnInit, AfterViewInit {
  examenes: any[] = [];

  constructor(private siglaService: SiglaService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.siglaService.getExamenes().subscribe({
      next: (data) => {
        this.examenes = data;
        setTimeout(() => this.generarCodigosBarras(), 0);
      },
      error: (err) => console.error(err)
    });
  }

  ngAfterViewInit() {
    if (this.examenes.length > 0) {
      this.generarCodigosBarras();
    }
  }

   generarCodigosBarras() {
    if (isPlatformBrowser(this.platformId)) {
      this.examenes.forEach((ex, index) => {
      // 🔹 Generar código con campos que me pasaste
      const codigo = `${ex.codPer}-${ex.codTCh}-${ex.codSer}`;
      JsBarcode(`#barcode-${index}`, codigo, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: true
      });
    });
  }
}
}
