import { Routes } from '@angular/router';
import { ListaExamenesComponent } from './components/lista-examenes/lista-examenes';


export const routes: Routes = [

    { path: '', redirectTo: 'examenes', pathMatch: 'full' },
    { path: 'examenes', component: ListaExamenesComponent }

];
