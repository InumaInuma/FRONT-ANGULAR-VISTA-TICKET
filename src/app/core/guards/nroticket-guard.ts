import { Injectable } from '@angular/core';
import { CanActivate, CanActivateFn, Router } from '@angular/router';
import { SiglaService } from '../services/sigla';
import { Serviciologin } from '../services/serviciologin';
import { ServiciosExamenes } from '../services/servicios-examenes';

@Injectable({
  providedIn: 'root',
})
export class nroticketGuard implements CanActivate {
  constructor(
    private siglaService: SiglaService,
    private serviciologin: Serviciologin,
    private servicioExamen: ServiciosExamenes,
    private router: Router
  ) {}

  // canActivate(): boolean {
  //   if (!this.siglaservice.isLoggedIn()) {
  //     this.router.navigate(['login']);
  //     return false;
  //   }

  //   // Ya pasó por consent → NO puede volver aquí
  //   if (this.siglaservice.hasEnteredConsentOnce()) {
  //     this.router.navigate(['consent']);
  //     return false;
  //   }

  //   return true;
  // }
  canActivate(): boolean {
    if (!this.siglaService.isLoggedIn()) {
      this.router.navigate(['login']);
      return false;
    }

    const rol = this.siglaService.getRol();

    // ❌ Solo PACIENTE puede entrar
    if (rol !== 1) {
      this.redirectByRole(rol);
      return false;
    }

    // Ya pasó declaraciones → no vuelve
    if (this.siglaService.hasEnteredConsentOnce()) {
      this.router.navigate(['examenes']);
      return false;
    }

    return true;
  }

  private redirectByRole(rol: number | null) {
    if (rol === 3) this.router.navigate(['admin']);
    else if (rol === 4) this.router.navigate(['superadmin']);
    else this.router.navigate(['login']);
  }
}
