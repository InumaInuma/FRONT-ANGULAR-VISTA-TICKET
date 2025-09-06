import {
  AfterViewInit,
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { Examen, OrdenData, SiglaService } from '../../services/sigla';
import JsBarcode from 'jsbarcode';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
  selector: 'app-lista-examenes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-examenes.html',
  styleUrls: ['./lista-examenes.scss'],
})
export class ListaExamenesComponent implements OnInit, OnDestroy {
  // ✅ Nueva propiedad para controlar el modal
  showCompletionModal = false;
  examenes: Examen[] = [];
  private subs = new Subscription();

  constructor(
    private siglaService: SiglaService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  // 🚨 Método para cerrar la sesión
  onLogout(): void {
    this.siglaService.logout();
  }

  // Método para alternar el despliegue
  toggleSubExamenes(examen: Examen): void {
    examen.isExpanded = !examen.isExpanded;
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // ✅ Obtener los datos de la orden desde localStorage
      const ordenDataString = localStorage.getItem('ordenData');

      if (ordenDataString) {
        const ordenData: OrdenData = JSON.parse(ordenDataString);

        const { codEmp, codSed, codTCl, numOrd } = ordenData;
        // Ahora puedes usar estos datos para todas las llamadas
        // Generar el código de barras con JsBarcode
        const barcodeValue = `${codEmp}-${codSed}-${codTCl}-${numOrd}`;
        JsBarcode('#barcode', barcodeValue, {
          format: 'CODE128', // Puedes cambiar el formato aquí
          displayValue: false, // Mostrar el valor debajo del código de barras
          width: 2, // Grosor de las barras
          height: 40, // Altura del código de barras
          margin: 10, // Margen alrededor del código de barras
        });

        // 1. Inicia la conexión de SignalR (sin importar si ya está activa)
        this.siglaService.startSignalRConnection(
          codEmp,
          codSed,
          codTCl,
          numOrd
        );

        // 2. Obtener la lista inicial de exámenes y luego unirse al grupo
        this.subs.add(
          this.siglaService
            .getExamenes(codEmp, codSed, codTCl, numOrd)
            .subscribe({
              next: (data) => {
                // Inicializa la propiedad isExpanded a false por defecto
                this.examenes = data.map((ex) => ({
                  ...ex,
                  isExpanded: false,
                }));
                /* this.examenes = data; */
                // 💡 Después de cargar los datos iniciales, nos unimos al grupo.
                this.siglaService.joinOrderGroup(
                  codEmp,
                  codSed,
                  codTCl,
                  numOrd
                );
                this.cdr.detectChanges(); // <-- Forzar la detección de cambios
              },
              error: (err) =>
                console.error('❌ Error al cargar exámenes iniciales', err),
            })
        );

        // 3. Escuchar cambios en tiempo real
        const realtimeSub = this.siglaService.examenes$.subscribe((newdata) => {
          console.log('📡 Exámenes recibidos en tiempo real:', newdata);
          // 💡 Lógica para preservar el estado "isExpanded"
          // Mapeamos los nuevos datos y conservamos el estado de los antiguos exámenes
          // Actualiza la lista de exámenes
          this.examenes = newdata.map((newExamen) => {
            // Buscamos el examen correspondiente en la lista actual
            const oldExamen = this.examenes.find(
              (e) => e.codSer === newExamen.codSer
            );

            // Devolvemos el nuevo examen, pero con el estado 'isExpanded' del antiguo
            return {
              ...newExamen,
              isExpanded: oldExamen ? oldExamen.isExpanded : false,
            };
          });
          /* this.examenes = newdata; */
          this.cdr.detectChanges(); // <-- Forzar la detección de cambios
          // ✅ Verificar si todos los exámenes han sido atendidos
          this.checkCompletionStatus();
        });
        this.subs.add(realtimeSub);
      } else {
        // Manejar el caso si no hay datos de orden
        console.error(
          'No se encontraron datos de orden en el almacenamiento local.'
        );
        // Opcional: Redirigir al usuario a la página de login si no hay datos
        this.siglaService.logout();
      }
    }
  }

  // ✅ Nuevo método para verificar el estado
  private checkCompletionStatus(): void {
    // Si no hay exámenes, no hagas nada
    if (this.examenes.length === 0) {
      return;
    }

    // Verifica si CADA examen tiene el estado 'Atendido' (3)
    const allExamsCompleted = this.examenes.every(
      (examen) => examen.estado === 3
    );

    // Si todos los exámenes están completos, muestra el modal
    if (allExamsCompleted) {
      console.log('🎉 Todos los exámenes han sido completados.');
      this.showCompletionModal = true;
    }
  }

  // ✅ Método para cerrar el modal
  closeModal(): void {
    this.showCompletionModal = false;
  }

  ngOnDestroy(): void {
    // ⚠️ No detengas la conexión aquí. El servicio lo maneja.
    this.subs.unsubscribe();
  }

  // ... (tu método getEstadoNombre)
  getEstadoNombre(estado: number): string {
    switch (estado) {
      case 0:
        return 'En cola';
      case 1:
        return 'Llamando';
      case 3:
        return 'Atendido';
      case 4:
        return 'Esperando';
      default:
        return 'Desconocido';
    }
  }
}
