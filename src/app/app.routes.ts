import { Routes } from '@angular/router';
import { ListaExamenesComponent } from './features/lista-examenes/lista-examenes';
import { Login } from './features/login/login';
import { AuthGuard } from './core/guards/auth-guard';
import { loginguardGuard } from './core/guards/loginguard-guard';
import { Consent } from './features/consent/consent';
import { SignaturePad } from './shared/signature-pad/signature-pad';
import { DeclaracionGuard } from './core/guards/declaracion-guard';
import { Nroticket } from './features/nroticket/nroticket';
import { nroticketGuard } from './core/guards/nroticket-guard';
import { Admin } from './features/admin/admin';
import { Superadmin } from './features/superadmin/superadmin';
import { AdminGuard } from './core/guards/guardadmin-guard';
import { SuperAdminGuard } from './core/guards/guardsuperadmin-guard';

export const routes: Routes = [
  // 🔹 1. Login
  {
    path: 'login',
    component: Login,
    canActivate: [AuthGuard], // Este guard evita entrar si ya está logueado
  },

  {
    path: 'nroticket',
    component: Nroticket,
    canActivate: [nroticketGuard], // Este guard evita entrar si ya está logueado
  },
  // 🔹 2. Consentimiento
  {
    path: 'consent',
    component: Consent,
    canActivate: [DeclaracionGuard], // Solo entra si está logueado
  },

  // 🔹 3. Exámenes
  {
    path: 'examenes',
    component: ListaExamenesComponent,
    canActivate: [loginguardGuard], // Solo logueados
  },

  {
    path: 'admin',
    component: Admin,
    canActivate: [AdminGuard],
  },

  {
    path: 'superadmin',
    component: Superadmin,
    canActivate: [SuperAdminGuard],
  },
  // 🔹 Redirección por defecto
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // 🔹 Ruta comodín
  { path: '**', redirectTo: 'login' },
];
