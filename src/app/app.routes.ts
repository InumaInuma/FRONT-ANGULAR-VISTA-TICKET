import { Routes } from '@angular/router';
import { ListaExamenesComponent } from './components/lista-examenes/lista-examenes';
import { Login } from './components/login/login';
import { AuthGuard } from './guards/auth-guard';


export const routes: Routes = [
  { 
    path: 'login', 
    component: Login,
    canActivate: [AuthGuard] // 🚨 Aplica el guard aquí
  },
  { 
    path: 'examenes', 
    component: ListaExamenesComponent 
    // Si quieres proteger también esta ruta, necesitarías otro guard
    // { canActivate: [OtroGuard] }
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
];

/* export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'examenes', component: ListaExamenesComponent },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
]; */
