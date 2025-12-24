import { CanActivate, CanActivateFn, Router } from '@angular/router';
import { SiglaService } from '../services/sigla';
import { Injectable } from '@angular/core';
import { Serviciologin } from '../services/serviciologin';
import { ServiciosExamenes } from '../services/servicios-examenes';

@Injectable({
  providedIn: 'root',
})
export class loginguardGuard implements CanActivate {
  constructor(
    private siglaservice: SiglaService,
    private serviciologin: Serviciologin,
    private servicioExamenes : ServiciosExamenes,
    private router: Router) {}

  
  canActivate(): boolean {
    if (!this.siglaservice.isLoggedIn()) {
      this.router.navigate(['login']);
      return false;
    }

    // Si NO ha entrado a declaraciones -> que vaya a /consent primero
    if (!this.siglaservice.hasEnteredConsentOnce()) {
      this.router.navigate(['consent']);
      return false;
    }

    return true; // puede ver /examenes
  }
}
