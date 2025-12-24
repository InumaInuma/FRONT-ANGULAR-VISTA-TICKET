import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { SiglaService } from '../../core/services/sigla';
import { Subscription } from 'rxjs';
import { FcmServiceTs } from '../../core/services/fcm.service.ts';
import { Router } from '@angular/router';
import { NroTicket } from '../../models/nroticket.interface';
import { Examen } from '../../models/examen.interface';
import { ServicioDeclaraciones } from '../../core/services/servicio-declaraciones';
import { ServiciosExamenes } from '../../core/services/servicios-examenes';
import { ServiciosCuestionario } from '../../core/services/servicios-cuestionario';
import { ServicioNroticket } from '../../core/services/servicio-nroticket';
import { ServiciosRealtime } from '../../core/services/servicios-realtime';

@Component({
  selector: 'app-nroticket',
  imports: [CommonModule],
  templateUrl: './nroticket.html',
  styleUrl: './nroticket.scss',
})
export class Nroticket implements OnInit {
  // Propiedades principales
  NroTic = '';
  NomPer = '';
  DesTCh = '';
  NomCom = '';
  errorMsg: string | null = null;
  nroTicket: NroTicket[] = [];

  // Fecha y hora actual
  currentDate = new Date();
  examenes: Examen[] = [];
  recepcion?: Examen | null; // 👈 aquí guardamos el proceso de recepción (codSer=6)
  private subs = new Subscription();
  private lastRecepcionEstado?: number;

  constructor(
    private siglaservice: SiglaService,
    private servicioDeclaraciones: ServicioDeclaraciones,
    private servicioExamenes: ServiciosExamenes,
    private servicioCuestionario: ServiciosCuestionario,
    private servicioNroTicket: ServicioNroticket,
    private servicioRealTime: ServiciosRealtime,
    private fcm: FcmServiceTs,
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  ngOnInit(): void {
    history.pushState(null, '', location.href);
    window.onpopstate = () => {
      history.pushState(null, '', location.href);
    };
    if (!isPlatformBrowser(this.platformId)) return;

    // Actualizar fecha y hora en tiempo real
    this.updateDateTime();

    try {
      const ordenDataStringDni = localStorage.getItem('ordenDataDni');
      if (!ordenDataStringDni) {
        this.errorMsg = 'No se encontró la orden del paciente.';
        console.error('❌ No se encontró ordenData en localStorage');
        return;
      }
      const { idTicked, nroTic, nroDocumento } = JSON.parse(ordenDataStringDni);

      console.log('📋 Cargando ticket con:', {
        idTicked,
        nroTic,
        nroDocumento,
      });

      //Registrar el token cuando el paciente entra a la web con su orden
      this.fcm.initAndRegisterToken(idTicked);
      // 2) Cargamos datos del ticket desde backend
      this.siglaservice.nroTicket(nroDocumento).subscribe({
        next: (data) => {
          this.nroTicket = data ?? [];

          if (this.nroTicket.length === 0) {
            this.errorMsg = 'No se pudo generar el ticket. Intenta nuevamente.';
            console.warn('⚠️ Backend retornó array vacío');
            return;
          }

          this.NroTic = (this.nroTicket[0]?.nroTic ?? '').trim();
          this.NomPer = (this.nroTicket[0]?.nomper ?? '').trim();
          this.DesTCh = (this.nroTicket[0]?.desTCh ?? '').trim();
          this.NomCom = (this.nroTicket[0]?.nomCom ?? '').trim();

          console.log('✅ Ticket generado:', {
            numero: this.NroTic,
            paciente: this.NomPer,
          });
        },
        error: (err) => {
          console.error('❌ Error al cargar ticket:', err);
          this.errorMsg =
            'Error al generar el ticket. Por favor, contacta con recepción.';
        },
      });

      // ... (código de inicialización y obtención de idTicked, nroTic, nroDocumento) ...
      if (!idTicked) return; // Asegurar que el ID exista

      // 1) Conectar SignalR y esperar a que la conexión esté lista
      this.siglaservice
        .startSignalRConnection(0, 0, 0, 0)
        .then(() => {
          console.log('✅ Conexión SignalR lista para escuchar.');

          // 2) Iniciar la escucha de Real Time (SignalR) PRIMERO.
          const realtimeSub = this.siglaservice.examenes$.subscribe(
            (newdata) => {
              console.log(
                '📡 Exámenes recibidos en tiempo real (ticket):',
                newdata
              );

              // 💡 Lógica para preservar el estado "isExpanded"
              this.examenes = newdata.map((newExamen) => {
                const oldExamen = this.examenes.find(
                  (e) => e.codSer === newExamen.codSer
                );
                return {
                  ...newExamen,
                  isExpanded: oldExamen ? oldExamen.isExpanded : false,
                };
              });
              this.updateRecepcion();
              this.cdr.detectChanges();
            }
          );
          this.subs.add(realtimeSub);

          // 3) Unirse al grupo SignalR (ahora la conexión está garantizada)
          this.siglaservice.joinTicketGroup(idTicked);

          // 4) Obtener la lista inicial de exámenes y disparar la suscripción de SqlDependency
          this.subs.add(
            this.siglaservice.getExamenesPorTicket(idTicked).subscribe({
              next: (data) => {
                // Cargar datos iniciales. NOTA: Si la notificación de RT llega antes,
                // esta línea será sobrescrita por el realtimeSub, lo cual es aceptable.
                if (this.examenes.length === 0) {
                  this.examenes = data.map((ex) => ({
                    ...ex,
                    isExpanded: false,
                  }));
                  this.updateRecepcion();
                }
                this.cdr.detectChanges();
              },
              error: (err) =>
                console.error('❌ Error al cargar exámenes iniciales', err),
            })
          );
        })
        .catch((err) => {
          console.error(
            '❌ Fallo crítico al iniciar SignalR o cargar datos:',
            err
          );
          this.errorMsg =
            'Error en la conexión en tiempo real. Intenta refrescar.';
        });
    } catch (error) {
      console.error('❌ Error al parsear ordenData:', error);
      this.errorMsg = 'Error al procesar la información de la orden.';
    }
  }

  /** Toma sólo el proceso de recepción (codSer=6) */
  private updateRecepcion() {
    const r = this.examenes.find((e) => e.codSer === 6) ?? null;
    this.cdr.detectChanges(); // <-- Forzar la detección de cambios
    // detectar transición a estado=1
    if (
      r &&
      this.lastRecepcionEstado !== undefined &&
      this.lastRecepcionEstado !== 1 &&
      r.estado === 1
    ) {
      // vibración inmediata (si está foreground)
      if (document.visibilityState === 'visible' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }
    }

    this.recepcion = r;
    this.lastRecepcionEstado = r?.estado;
  }

  // 👇 ir a declaraciones
  goToConsent(): void {
    this.router.navigate(['consent'], { replaceUrl: true });
  }
  // 👇 helper: ¿Recepción está llamando?
  get isRecepcionLlamando(): boolean {
    return (this.recepcion?.estado ?? -1) === 1;
  }

  //Actualiza la fecha y hora cada segundo

  private updateDateTime(): void {
    setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  // Comparte el número de ticket usando Web Share API

  shareTicket(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const shareData = {
      title: 'Mi Ticket de Atención - MEDCORP',
      text: `🎫 Número de Ticket: ${this.NroTic}\n👤 Paciente: ${
        this.NomPer
      }\n📅 Fecha: ${this.formatDate(this.currentDate)}`,
      // url: window.location.href // Opcional
    };

    // Verificar si el navegador soporta Web Share API
    if (navigator.share) {
      navigator
        .share(shareData)
        .then(() => console.log('✅ Ticket compartido exitosamente'))
        .catch((err) => {
          console.warn('⚠️ Error al compartir:', err);
          this.fallbackShare();
        });
    } else {
      this.fallbackShare();
    }
  }

  /**
   * Fallback para navegadores que no soportan Web Share API
   */
  private fallbackShare(): void {
    const text = `🎫 Mi Ticket: ${this.NroTic}\n👤 ${
      this.NomPer
    }\n📅 ${this.formatDate(this.currentDate)}`;

    // Copiar al portapapeles
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          alert('✅ Información del ticket copiada al portapapeles');
        })
        .catch(() => {
          this.manualCopyFallback(text);
        });
    } else {
      this.manualCopyFallback(text);
    }
  }

  /**
   * Copia manual al portapapeles (método antiguo)
   */
  private manualCopyFallback(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      alert('✅ Información del ticket copiada');
    } catch (err) {
      console.error('❌ Error al copiar:', err);
      alert(
        '⚠️ No se pudo copiar. Por favor, anota tu número de ticket manualmente.'
      );
    }

    document.body.removeChild(textArea);
  }

  /**
   * Formatea la fecha en español
   */
  private formatDate(date: Date): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${dayName} ${day} ${month} ${year} - ${hours}:${minutes}`;
  }

  /**
   * Imprime el ticket
   */
  printTicket(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    console.log('🖨️ Imprimiendo ticket...');
    window.print();
  }

  /**
   * Descarga el ticket como imagen (opcional, requiere html2canvas)
   */
  downloadTicket(): void {
    alert(
      '💡 Funcionalidad de descarga en desarrollo. Usa "Imprimir" o "Compartir" por ahora.'
    );
    // Implementar con html2canvas si lo necesitas
  }

  /**
   * Vuelve a cargar el ticket
   */
  retryLoadTicket(): void {
    console.log('🔄 Reintentando cargar ticket...');
    this.errorMsg = null;
    this.ngOnInit();
  }

  /**
   * Navega de regreso
   */
  goBack(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.history.back();
  }

  getEstadoNombre(estado: number): string {
    switch (estado) {
      case 0:
        return 'En cola';
      case 1:
        return 'Llamando';
      case 3:
        return 'Atendido';
      case 4:
        return 'En espera';
      default:
        return 'Desconocido';
    }
  }

  /** Clase visual para el pill de estado */
  getEstadoClass(estado: number): string {
    return (
      {
        0: 'pill en-cola',
        1: 'pill llamando',
        3: 'pill atendido',
        4: 'pill en-espera',
      }[estado] || 'pill'
    );
  }
}
