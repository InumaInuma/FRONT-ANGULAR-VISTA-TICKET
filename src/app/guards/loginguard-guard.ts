import { CanActivate, CanActivateFn, Router } from '@angular/router';
import { SiglaService } from '../services/sigla';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})

/* export const loginguardGuard: CanActivateFn = (route, state) => {
  return true;
}; */
export class loginguardGuard implements CanActivate {
  constructor(private siglaService: SiglaService, private router: Router) {}

  canActivate(): boolean {
    if (this.siglaService.isLoggedIn()) {
      return true;
    }

    // 👇 Si no está logueado, redirige al login
    this.router.navigate(['/login']);
    return false;
  }
}
