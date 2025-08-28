import { AfterViewInit, Component, OnInit,OnDestroy, ChangeDetectorRef  } from '@angular/core';
import { Examen, SiglaService } from '../../services/sigla';
import JsBarcode from 'jsbarcode';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
  selector: 'app-lista-examenes',
  standalone: true,
  imports: [CommonModule ],
  templateUrl: './lista-examenes.html',
  styleUrls: ['./lista-examenes.scss']
})
export class ListaExamenesComponent implements OnInit, OnDestroy  {

 examenes: Examen[] = [];
 private subs = new Subscription();

    constructor(private siglaService: SiglaService, private cdr: ChangeDetectorRef) {}


    // 🚨 Método para cerrar la sesión
    onLogout(): void {
        this.siglaService.logout();
    }

    // Método para alternar el despliegue
  toggleSubExamenes(examen: Examen): void {
    examen.isExpanded = !examen.isExpanded;
  }

  ngOnInit(): void {
    const codEmp = 1, codSed = 1, codTCl = 2, numOrd = 1;

     // 1. Inicia la conexión de SignalR (sin importar si ya está activa)
    this.siglaService.startSignalRConnection(codEmp, codSed, codTCl, numOrd);



    // 2. Obtener la lista inicial de exámenes y luego unirse al grupo
    this.subs.add(
      this.siglaService
        .getExamenes(codEmp, codSed, codTCl, numOrd)
        .subscribe({
          next: (data) => {
            // Inicializa la propiedad isExpanded a false por defecto
            this.examenes = data.map(ex => ({ ...ex, isExpanded: false }));
            /* this.examenes = data; */
            // 💡 Después de cargar los datos iniciales, nos unimos al grupo.
            this.siglaService.joinOrderGroup(codEmp, codSed, codTCl, numOrd);
          },
          error: (err) => console.error('❌ Error al cargar exámenes iniciales', err)
        })
    );

    // 3. Escuchar cambios en tiempo real
      const realtimeSub =
      this.siglaService.examenes$.subscribe(newdata => {
        console.log("📡 Exámenes recibidos en tiempo real:", newdata);
        // 💡 Lógica para preservar el estado "isExpanded"
      // Mapeamos los nuevos datos y conservamos el estado de los antiguos exámenes
      this.examenes = newdata.map(newExamen => {
     // Buscamos el examen correspondiente en la lista actual
     const oldExamen = this.examenes.find(e => e.codSer === newExamen.codSer);
    
    // Devolvemos el nuevo examen, pero con el estado 'isExpanded' del antiguo
    return {
      ...newExamen,
      isExpanded: oldExamen ? oldExamen.isExpanded : false
    };
  });
        /* this.examenes = newdata; */
         this.cdr.detectChanges(); // <-- Forzar la detección de cambios
      });
     this.subs.add(realtimeSub);
  }

  ngOnDestroy(): void {
    // ⚠️ No detengas la conexión aquí. El servicio lo maneja.
    this.subs.unsubscribe();
  }

  // ... (tu método getEstadoNombre)
  getEstadoNombre(estado: number): string {
    switch (estado) {
      case 0: return 'En cola';
      case 1: return 'Llamando';
      case 3: return 'Atendido';
      case 4: return 'Esperando';
      default: return 'Desconocido';
    }
  }
}
