import { CanActivate, CanActivateFn, Router } from '@angular/router';
import { SiglaService } from '../services/sigla';
import { Injectable } from '@angular/core';
import { Serviciologin } from '../services/serviciologin';
import { ServiciosExamenes } from '../services/servicios-examenes';

@Injectable({
  providedIn: 'root',
})
export class DeclaracionGuard implements CanActivate {
  constructor(
    private siglaservice: SiglaService,
    private serviciologin: Serviciologin,
    private servicioExamen : ServiciosExamenes,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (!this.siglaservice.isLoggedIn()) {
      this.router.navigate(['login']);
      return false;
    }

    const hasPending = this.siglaservice.hasPendingDeclaration();
    const alreadyEntered = this.siglaservice.hasEnteredConsentOnce();

    // Tiene declaración pendiente → puede entrar
    if (hasPending) return true;

    // Ya declaró y no hay pendientes → NO puede volver a consent
    if (alreadyEntered && !hasPending) {
      this.router.navigate(['examenes']);
      return false;
    }

    // Primera vez entrando → permitido
    return true;
  }
}
