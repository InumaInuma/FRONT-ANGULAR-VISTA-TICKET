import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Enviroments } from '../../environments/env';
import { Router } from '@angular/router';
import { CuestionarioPregunta } from '../../models/cuestionarioPregunta.interface';
import { Observable } from 'rxjs';
import { CuestionarioCompleto } from '../../models/cuestionarioCompleto.interface';
import { CuestionarioEstadoResponse } from '../../models/cuestionarioEstadoResponse.interface';

@Injectable({
  providedIn: 'root',
})
export class ServiciosCuestionario {
  //private apiUrl = Enviroments.apiUrl; // Acceso directo a la propiedad
  constructor(
    private http: HttpClient,
    private enviroments: Enviroments,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object // 🚨 Inyecta PLATFORM_ID
  ) {}


}
