import {
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { SiglaService } from '../../core/services/sigla';
import { Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Battery } from '../../core/services/battery';
import { firstValueFrom } from 'rxjs';
import { Serviciologin } from '../../core/services/serviciologin';
import { REFUSED } from 'node:dns';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  dni: string = '';
  errorMessage: string | null = null;
  loading: boolean = false;

  // 🔋 Propiedades de batería
  batteryLevel: number = 100;
  showBatteryAlert: boolean = false;
  isCharging: boolean = false;

  // @Inject(PLATFORM_ID) private platformId: Object 👈 importante para saber si es browser
  constructor(
    private loginservice: Serviciologin,
    private siglaservice: SiglaService,
    private router: Router,
    private batteryService: Battery,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit(): Promise<void> {
    // ❌ Quita el hack de history/onpopstate
    // Si ya hay sesión activa, redirige según guards

    if (this.siglaservice.isLoggedIn()) {
      // Si ya está logueado, AuthGuard de /login debería redirigir
      // pero por si acaso, hacemos una navegación defensiva:
      // if (this.siglaService.hasAcceptedDeclaration()) {
      //   this.router.navigate(['examenes']);
      // } else {
      //   this.router.navigate(['consent']);
      // }
    }
    // Verificar batería al cargar
    await this.checkBatteryOnLoad();
  }

  /**
   * 🔋 Verificar batería al cargar la página
   */
  private async checkBatteryOnLoad(): Promise<void> {
    try {
      const info = await this.batteryService.getBatteryLevel();
      this.batteryLevel = info.level;
      this.isCharging = info.charging;
      this.cdr.detectChanges();
      console.log(`🔋 Batería inicial: ${info.level}%`);
    } catch (error) {
      console.error('Error al verificar batería inicial:', error);
    }
  }

  /**
   * 🔋 Método de login modificado con validación de batería
   */
  async onLogin(): Promise<void> {
    if (this.loading) return; // evita dobles clics

    this.dni = this.dni.trim();

    if (!this.dni) {
      this.errorMessage = 'Por favor, ingresa tu número de DNI.';
      return;
    }

    // 🔋 PASO 1: VALIDAR BATERÍA ANTES DE HACER LOGIN
    this.loading = true;
    this.errorMessage = null;
    this.showBatteryAlert = false;

    try {
      const hasSufficientBattery =
        await this.batteryService.hasSufficientBattery();

      if (!hasSufficientBattery) {
        // 🔋 BATERÍA INSUFICIENTE - BLOQUEAR ACCESO
        const info = await this.batteryService.getBatteryLevel();
        this.batteryLevel = info.level;
        this.isCharging = info.charging;
        this.showBatteryAlert = true;
        this.loading = false;

        this.errorMessage = `🔋 Batería insuficiente (${info.level}%). Por favor, solicita tu ticket de atención en físico en recepción.`;

        console.error(`❌ Login bloqueado - Batería: ${info.level}%`);
        this.cdr.detectChanges();
        return;
      }

      // AQUI: await la llamada de login
      const response = await firstValueFrom(
        this.siglaservice.Ticketlogin(this.dni)
      );
      // 🔋 PASO 2: BATERÍA SUFICIENTE - PROCEDER CON LOGIN
      console.log('✅ Batería suficiente - Procediendo con login...');

      if (response?.status === 1) {
        const rol = this.siglaservice.getRol();

        // 👤 PACIENTE
        if (rol === 1) {
          // Guardado ya realizado en Ticketlogin (tap)
          const goExams = this.siglaservice.hasEnteredConsentOnce();
          this.loading = false;
          this.router.navigate([goExams ? 'examenes' : 'nroticket'], {
            replaceUrl: true,
          });
          return;
        }

        // 🧑‍💼 ADMIN
        if (rol === 3) {
          this.router.navigate(['admin'], { replaceUrl: true });
          return;
        }

        // 👑 SUPERADMIN
        if (rol === 4) {
          this.router.navigate(['superadmin'], { replaceUrl: true });
          return;
        }
      } else {
        this.loading = false;
        this.errorMessage = response?.message || 'No se pudo iniciar sesión.';
        localStorage.setItem('isLoggedIn', 'false');
      }
    } catch (err: any) {
      this.loading = false;
      // maneja error http
      switch (err?.status) {
        case 401:
          this.errorMessage =
            'El usuario nose encontro o sus examenes ya han sido completados';
          break;
        case 403:
          this.errorMessage = 'Ya has finalizado tus exámenes...';
          break;
        case 404:
          this.errorMessage = 'El número de DNI no se encontró.';
          break;
        case 500:
          this.errorMessage = 'Error interno al verificar DNI.';
          break;
        default:
          this.errorMessage = 'Ocurrió un error inesperado. Intenta de nuevo.';
          break;
      }
      localStorage.setItem('isLoggedIn', 'false');
      console.error('Error al iniciar sesión:', err);
    }
  }

  // 🚨 Método para cerrar la sesión
  onLogout(): void {
    this.siglaservice.logout();
  }

  /**
   * 🔋 Verificar batería nuevamente (después de cargar)
   */
  async recheckBattery(): Promise<void> {
    this.loading = true;
    this.showBatteryAlert = false;
    this.errorMessage = null;

    try {
      const info = await this.batteryService.getBatteryLevel();
      this.batteryLevel = info.level;
      this.isCharging = info.charging;

      const sufficient = await this.batteryService.hasSufficientBattery();

      if (sufficient) {
        this.showBatteryAlert = false;
        alert(
          '✅ Batería cargando recargue la pagina y vuelva a intentar. Puedes intentar ingresar.'
        );
        this.cdr.detectChanges();
      } else {
        this.showBatteryAlert = false;
        this.errorMessage = `🔋 La batería sigue baja (${info.level}%). Por favor, carga tu dispositivo o solicita tu ticket en físico.`;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error al verificar batería:', error);
      this.errorMessage = 'Error al verificar batería.';
    } finally {
      this.loading = false;
    }
  }
}
