import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { SiglaService } from '../services/sigla';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private siglaService: SiglaService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // 🚨 Aquí va tu lógica de autenticación
    if (this.siglaService.isLoggedIn()) {
      // Si el usuario ya está logueado, lo redirige a la página de exámenes
      this.router.navigate(['/examenes']);
      return false; // Bloquea el acceso a la ruta de login
    }
    return true; // Permite el acceso a la ruta de login
  }
}
