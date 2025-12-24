import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { SiglaService } from '../services/sigla';
import { Serviciologin } from '../services/serviciologin';
import { ServiciosExamenes } from '../services/servicios-examenes';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private siglaService: SiglaService,
    private serviciologin: Serviciologin,
    private servicioExamanes: ServiciosExamenes,
    private router: Router
  ) {}

  // canActivate(): boolean {
  //   // Si NO está logueado -> puede entrar a /login
  //   if (!this.siglaservice.isLoggedIn()) return true;

  //   // Ya está logueado: redirige según HasConsent
  //   const goExams = this.siglaservice.hasEnteredConsentOnce();
  //   this.router.navigate([goExams ? 'examenes' : 'nroticket']);
  //   return false;
  // }
  canActivate(): boolean {
    // No logueado → puede entrar a login
    if (!this.siglaService.isLoggedIn()) return true;

    const rol = this.siglaService.getRol();

    if (rol === 1) {
      const goExams = this.siglaService.hasEnteredConsentOnce();
      this.router.navigate([goExams ? 'examenes' : 'nroticket']);
      return false;
    }

    if (rol === 3) {
      this.router.navigate(['admin']);
      return false;
    }

    if (rol === 4) {
      this.router.navigate(['superadmin']);
      return false;
    }

    this.router.navigate(['login']);
    return false;
  }
}
