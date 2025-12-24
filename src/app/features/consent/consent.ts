import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Inject,
  inject,
  OnInit,
  PLATFORM_ID,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SignaturePad } from '../../shared/signature-pad/signature-pad';
import { SiglaService } from '../../core/services/sigla';
import { PolicyVersionInfo } from '../../models/consent-models';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UAParser } from 'ua-parser-js';
import { finalize, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { Declaraciones } from '../../models/declaraciones.interface';
import { ServicioDeclaraciones } from '../../core/services/servicio-declaraciones';
import { ServicioOrdenC } from '../../core/services/servicio-orden-c';
import { ServiciosExamenes } from '../../core/services/servicios-examenes';

@Component({
  selector: 'app-consent',
  standalone: true,
  imports: [CommonModule, FormsModule, SignaturePad],
  templateUrl: './consent.html',
  styleUrl: './consent.scss',
})
export class Consent implements OnInit {
  private popStateHandler: (() => void) | null = null;

  constructor(
    private siglaService: SiglaService,
    private cdr: ChangeDetectorRef,
    private servicioDeclaraciones: ServicioDeclaraciones,
    private servicioOrden: ServicioOrdenC,
    private servicioExamenes: ServiciosExamenes,
    private router: Router,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  // ✅ Referencia al único SignaturePad que está visible (una declaración a la vez)
  @ViewChild(SignaturePad) pad!: SignaturePad;

  // --- Estado global de la página ---
  fullName = '';
  destch = '';
  despue = '';
  noncom = '';
  fechas = '';
  edadPa = 0;
  submitting = false;
  successId: string | null = null;
  errorMsg: string | null = null;
  loading: boolean = false;

  // --- Colecciones paralelas por declaración ---
  declaraciones: Declaraciones[] = []; // data cruda del backend
  politicasHtml: SafeHtml[] = []; // HTML seguro por item (opción B)
  hasScrolledToEndArr: boolean[] = []; // si leyó completa cada item
  acceptedArr: boolean[] = []; // aceptación por item (checkbox)
  signaturesArr: (string | null)[] = []; // firma base64 por item

  showOrderPendingModal = false;
  private escapeHandler = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Índice de la declaración visible
  currentIndex = 0;

  // ✅ Variable para guardar el tipo de dispositivo detectado
  deviceInfo: string = '';
  // ===== Modal state =====
  rxModalVisible = false;
  rxModalTitle = 'Atención requerida';
  rxModalMessage =
    'Por favor, necesitamos que se realice una prueba de embarazo porque tiene examen de Rayos X y puede afectar su salud. Comuníquese con recepción para mayor detalle.';

  // Metadatos de política (opcional)
  policy: PolicyVersionInfo = {
    id: 'POL-001',
    version: '1.0.0',
    updatedAt: new Date('2025-09-15').toISOString(),
  };

  mostrarHuella = false;
  huellaUrl: string | null = null;

  private ordenIds!: {
    codEmp: number;
    codSed: number;
    codTCl: number;
    numOrd: number;
  };

  ngOnInit(): void {
    history.pushState(null, '', location.href);
    window.onpopstate = () => {
      history.pushState(null, '', location.href);
    };
    if (!isPlatformBrowser(this.platformId)) return;
    // 🔍 Detecta dispositivo en el navegador
    this.deviceInfo = this.detectDeviceFull();
    console.log('📱 Dispositivo del firmante:', this.deviceInfo);

    //LLAMAMOS AL DNI QUE GUARDAMOS
    const ordenDataStringDni = localStorage.getItem('ordenDataDni');

    if (!ordenDataStringDni) {
      this.errorMsg = 'No se encontró la orden del paciente.';
      console.error('❌ No se encontró ordenData en localStorage');
      return;
    }
    const { idTicked, nroTic, nroDocumento } = JSON.parse(ordenDataStringDni);

    // 👇 aquí ya NO lees ordenData todavía;
    // esperas a que login te la devuelva
    this.hacerLoginYcargarOrden(nroDocumento);

    // Bloquear retroceso si hay pending y aún no se completó
    if (this.siglaService.getPendingDeclaration()) {
      history.pushState(null, '', location.href); // duplica la entrada

      this.popStateHandler = () => {
        history.pushState(null, '', location.href); // evita retroceder
      };

      window.addEventListener('popstate', this.popStateHandler);
    }
  }

  private hacerLoginYcargarOrden(dni: string) {
    this.loading = true; // opcional: mostrar spinner
    this.siglaService.consultarOrden(dni).subscribe({
      next: (response) => {
        const orden = response.orden ?? null;

        // si no vino la orden completa (o la orden existe pero los campos de orden son null)
        const codEmp = orden?.codEmp ?? null;
        const codSed = orden?.codSed ?? null;
        const codTCl = orden?.codTCl ?? null;
        const numOrd = orden?.numOrd ?? null;

        // Guardamos la orden completa en localStorage (si lo deseas)
        if (isPlatformBrowser(this.platformId) && orden) {
          localStorage.setItem('ordenData', JSON.stringify(orden));
        }

        // Si la orden aún no fue creada por la página 3 -> todos los campos null
        const allOrderFieldsNull =
          (codEmp === null || codEmp === undefined) &&
          (codSed === null || codSed === undefined) &&
          (codTCl === null || codTCl === undefined) &&
          (numOrd === null || numOrd === undefined);

        if (allOrderFieldsNull) {
          // Mostrar mensaje en la vista
          this.errorMsg =
            'Aún no se ha generado la orden. Por favor reintenta en unos minutos.';
          this.showOrderPendingModal = true;
          // Bloquear scroll de background y evitar interacciones
          document.body.style.overflow = 'hidden';
          // Evitar tecla ESC
          document.addEventListener('keydown', this.escapeHandler, true);
          // Aseguramos que el usuario no quede logueado
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('allowReturnToTicket', 'true');
          }

          // Opcional: navegación automática a nroticket después de X segundos
          const REDIRECT_AFTER_MS = 6500;
          setTimeout(() => {
            this.router.navigate(['/nroticket']);
          }, REDIRECT_AFTER_MS);

          // Parar aquí: no llamar a cargarDeclaraciones con nulls
          this.loading = false;
          return;
        }

        // Si llegamos aquí: orden válida con identificadores -> seguir normalmente
        this.ordenIds = { codEmp, codSed, codTCl, numOrd };
        // Guardar por si otras páginas lo necesitan (ya lo guardamos arriba)
        this.cargarDeclaraciones(codEmp, codSed, codTCl, numOrd);
      },
      error: (err) => {
        switch (err.status) {
          case 403:
            this.errorMsg =
              'Ya has finalizado tus exámenes y no puedes ingresar.';
            break;
          case 404:
            this.errorMsg = 'El número de DNI no se encontró.';
            break;
          case 500:
            this.errorMsg =
              'El número de DNI no se encontró o no tiene exámenes programados.';
            break;
          default:
            this.errorMsg =
              'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
            break;
        }
        // 🔐 Importante: asegúrate de que el login fallido no deje isLoggedIn como true
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('isLoggedIn', 'false');
        }
        console.error('Error al iniciar sesión:', err);
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  goBackToNroTicketFromModal(): void {
    // Restaurar UI
    this.showOrderPendingModal = false;
    document.body.style.overflow = '';
    // Quitar listener ESC
    document.removeEventListener('keydown', this.escapeHandler, true);
    // Nota: nroticketGuard leerá allowReturnToTicket y permitirá la navegación.
    this.router.navigate(['/nroticket']);
  }

  private cargarDeclaraciones(
    codEmp: number,
    codSed: number,
    codTCl: number,
    numOrd: number
  ) {
    this.siglaService
      .getDeclaraciones(codEmp, codSed, codTCl, numOrd)
      .subscribe({
        next: (data) => {
          this.declaraciones = data ?? [];

          // Nombre del paciente para el encabezado
          this.fullName = (this.declaraciones[0]?.nomPer ?? '').trim();
          this.destch = (this.declaraciones[0]?.desTCh ?? '').trim();
          this.despue = (this.declaraciones[0]?.desPue ?? '').trim();
          this.noncom = (this.declaraciones[0]?.nomCom ?? '').trim();
          this.fechas = new Date(this.declaraciones[0]?.fecNac)
            .toISOString()
            .split('T')[0];
          this.edadPa = this.declaraciones[0]?.edaPac ?? 0;

          // Render seguro por id (opción B: HTML local)
          // en tu subscribe:
          this.politicasHtml = this.declaraciones.map((d: any) =>
            this.sanitizer.bypassSecurityTrustHtml(
              d.descri || '<p>Declaración no disponible</p>'
            )
          );

          // Inicializamos banderas paralelas
          const n = this.declaraciones.length;
          this.hasScrolledToEndArr = Array(n).fill(false);
          this.acceptedArr = Array(n).fill(false);
          this.signaturesArr = Array(n).fill(null);

          // Metadata opcional de versión (toma de la primera)
          const firstId =
            (this.declaraciones[0] as any)?.idDecl ??
            (this.declaraciones[0] as any)?.iddecl;
          if (firstId) {
            this.policy = {
              id: 'POL-' + String(firstId),
              version: String(firstId),
              updatedAt: new Date(
                this.declaraciones[0]?.fecate || new Date()
              ).toISOString(),
            };
          }

          this.cdr.markForCheck();
        },
        error: () => (this.errorMsg = 'Error al cargar las políticas.'),
      });
  }

  openRxModal() {
    this.rxModalVisible = true;
    document.body.classList.add('modal-open'); // bloquea scroll
  }
  closeRxModal() {
    this.rxModalVisible = false;
    document.body.classList.remove('modal-open');
  }
  // ===== helper: corre antes de next/submit =====
  private async ensureDoubtRuleIfNeeded(): Promise<boolean> {
    const d: any = this.declaraciones[this.currentIndex];
    // solo aplica a declaración 5 marcada como DUDA
    if (!d || d.codDec !== 5) return true;
    const sel = this.dec5Selections[d.codDec];
    if (sel !== 'DUDA') return true;

    if (!this.ordenIds) return true;

    try {
      const res = await firstValueFrom(
        this.siglaService.getRxFlag(
          this.ordenIds.codEmp,
          this.ordenIds.codSed,
          this.ordenIds.codTCl,
          this.ordenIds.numOrd
        )
      );

      if (res?.hasRayosX) {
        // bloquea navegación/envío y muestra modal
        this.openRxModal();
        return false;
      }
      return true;
    } catch {
      // si falla el API, no bloquees (tu call-flow sigue)
      return true;
    }
  }

  // === Estado para las opciones de la declaración 5 ===
  // Guardamos por clave (usaremos CodDec) -> 'NO' | 'DUDA' | 'SI' | null
  dec5Selections: Record<number, 'NO' | 'DUDA' | 'SI' | null> = {};
  get currentKey(): number {
    const d: any = this.declaraciones[this.currentIndex];
    return d?.codDec ?? 0;
  }

  get isCurrentDecPregnancy(): boolean {
    const d: any = this.declaraciones[this.currentIndex];
    return d?.codDec === 5;
  }

  // Marca/desmarca asegurando solo 1 activo
  onDec5Toggle(choice: 'NO' | 'DUDA' | 'SI', ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const key = this.currentKey;

    if (!checked) {
      // Si desmarca la opción actualmente seleccionada, queda sin selección
      if (this.dec5Selections[key] === choice) this.dec5Selections[key] = null;
      return;
    }
    // Forzamos "solo una" opción activa
    this.dec5Selections[key] = choice;
  }

  // ¿estamos en la última declaración?
  get isLast(): boolean {
    return this.currentIndex === this.declaraciones.length - 1;
  }

  // evento por índice
  onPoliciesScrollIndex(i: number, e: Event) {
    const el = e.target as HTMLElement;
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    if (atEnd && !this.hasScrolledToEndArr[i]) {
      this.hasScrolledToEndArr[i] = true;
    }
  }

  /** El hijo ahora emite base64 o null */
  onSigChanged(dataUrl: string | null) {
    const i = this.currentIndex;
    this.signaturesArr[i] = dataUrl;
  }

  // Limpia la firma SOLO de la declaración actual
  clearSignature(index: number) {
    if (!this.pad) return;
    this.pad.clear();
    this.signaturesArr[index] = null;
  }

  // ===== botones =====
  async nextDeclaration() {
    if (this.isLast) return;
    const ok = await this.ensureDoubtRuleIfNeeded();
    if (!ok) return; // modal visible, se queda en la misma declaración
    this.currentIndex++;
    this.restorePadForIndex(this.currentIndex);
    if (this.mostrarHuella) this.updateHuellaUrlForCurrent();
  }

  prevDeclaration() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.restorePadForIndex(this.currentIndex);
      if (this.mostrarHuella) this.updateHuellaUrlForCurrent();
    }
  }

  onToggleHuella(checked: boolean) {
    this.mostrarHuella = checked;
    if (checked) {
      this.updateHuellaUrlForCurrent();
    } else {
      this.huellaUrl = null;
    }
  }

  private updateHuellaUrlForCurrent() {
    const d = this.declaraciones[this.currentIndex] as any;
    if (!d || !this.ordenIds) {
      this.huellaUrl = null;
      return;
    }

    this.huellaUrl = this.siglaService.getHuellaUrl({
      codEmp: this.ordenIds.codEmp,
      codSed: this.ordenIds.codSed,
      codTCl: this.ordenIds.codTCl,
      numOrd: this.ordenIds.numOrd,
      codDec: d.codDec, // ← asegúrate que tu DTO trae codDec
    });
  }

  // Al cambiar de tarjeta, restaura si hay firma previa
  private restorePadForIndex(i: number) {
    setTimeout(() => {
      if (!this.pad) return;
      const saved = this.signaturesArr[i];
      if (saved) this.pad.load(saved);
      else this.pad.clear();
    });
  }
  // Para “Aceptar y firmar” pedimos que haya aceptación y firma en la actual
  canSignCurrent(): boolean {
    const i = this.currentIndex;
    return !!this.acceptedArr[i] && !!this.signaturesArr[i];
  }

  // Envío de la declaración
  async submitCurrent() {
    // si falla el guard, no envía
    const ok = await this.ensureDoubtRuleIfNeeded();
    if (!ok) return;
    const i = this.currentIndex;

    this.submitting = true;
    try {
      const ordenDataString = localStorage.getItem('ordenData');
      if (!ordenDataString) {
        this.errorMsg = 'No se encontró la orden del paciente.';
        this.submitting = false;
        return;
      }
      const { codEmp, codSed, codTCl, numOrd, nomcom } =
        JSON.parse(ordenDataString);

      const items = this.declaraciones.map((d, idx) => {
        const dec: any = d;
        const base: any = {
          codDec: dec.codDec,
          estado: !!this.acceptedArr[idx],
          divice: this.deviceInfo ?? null,
          firmas: this.signaturesArr[idx] ?? null,
          fecAce: this.acceptedArr[idx] ? new Date().toISOString() : null,
        };

        // Solo para declaración 5: mapear checkboxes a bits
        if (dec.codDec === 5) {
          const sel = this.dec5Selections[dec.codDec] ?? null;
          base.noStPe = sel === 'NO' ? true : sel === null ? null : false;
          base.stDuPe = sel === 'DUDA' ? true : sel === null ? null : false;
          base.staPer = sel === 'SI' ? true : sel === null ? null : false;
        }

        return base;
      });

      const payload = { codEmp, codSed, codTCl, numOrd, nomcom, items };

      this.siglaService
        .guardarDeclaracionesBulk(payload)
        .pipe(finalize(() => (this.submitting = false)))
        .subscribe({
          next: (res) => {
            if (res.success) {
              // Muestra un diálogo simple (o SnackBar si usas Angular Material)
              alert(res.message || 'Declaraciones actualizadas correctamente.');

              const pending =
                this.siglaService.getPendingDeclarationForConsent();
              const idToMark =
                pending && pending[0]
                  ? pending[0].idDecl ?? pending[0].IdDecl ?? null
                  : null;

              this.siglaService.setProcessedDeclarationId(idToMark); // marca como procesado
              this.siglaService.clearPendingDeclarationForConsent(); // limpia el pending
              // Si además quieres marcar el "consent fue visto/aceptado"
              this.siglaService.markEnteredConsentOnce();

              // luego navegar
              this.router.navigate(['/examenes']);
            } else {
              this.errorMsg =
                res?.message || 'No se actualizó ningún registro.';
            }
          },
          error: (err) => {
            // Muestra el detalle si viene del backend
            this.errorMsg =
              err?.error?.message || 'Error al guardar la declaración.';
          },
        });
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al guardar la declaración.';
      this.submitting = false;
    }
  }

  ngOnDestroy() {
    if (this.popStateHandler) {
      window.removeEventListener('popstate', this.popStateHandler);
    }
  }

  //  Esta función analiza el `navigator.userAgent` del navegador y devuelve
  //  una cadena legible con el tipo de dispositivo desde el que el paciente firma.
  //  Ejemplo: "Android", "iPhone", "Windows", "Mac", "Linux", "iPad", "Desconocido"
  private detectDeviceFull(): string {
    const parser = new UAParser();
    const result = parser.getResult();
    // result tiene campos como browser, os, device, engine, etc.
    // Por ejemplo:
    const deviceType = result.device.type || 'desktop'; // "mobile", "tablet", etc.
    const deviceModel = result.device.model || '';
    const deviceVendor = result.device.vendor || '';
    const osName = result.os.name || '';
    const osVersion = result.os.version || '';
    const browserName = result.browser.name || '';
    const browserVersion = result.browser.version || '';

    return `${deviceVendor} ${deviceModel} (${deviceType}), OS: ${osName} ${osVersion}, Browser: ${browserName} ${browserVersion}`;
  }
}
