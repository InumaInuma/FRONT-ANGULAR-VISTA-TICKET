import { CanActivate, CanActivateFn, Router } from '@angular/router';
import { SiglaService } from '../services/sigla';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SuperAdminGuard implements CanActivate {
  constructor(private siglaService: SiglaService, private router: Router) {}
  canActivate(): boolean {
    if (!this.siglaService.isLoggedIn()) {
      this.router.navigate(['login']);
      return false;
    }

    const rol = this.siglaService.getRol();

    if (rol === 4) {
      return true;
    }

    // ❌ Rol incorrecto → redirigir
    this.redirectByRole(rol);
    return false;
  }

  private redirectByRole(rol: number | null) {
    if (rol === 1) this.router.navigate(['nroticket']);
    else if (rol === 3) this.router.navigate(['admin']);
    else this.router.navigate(['login']);
  }
}
