import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Examen } from '../../models/examen.interface';
import { Enviroments } from '../../environments/env';
import { NroTicket } from '../../models/nroticket.interface';

@Injectable({
  providedIn: 'root',
})
export class ServicioNroticket {
  constructor(
    private http: HttpClient,
    private enviroments: Enviroments,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object // 🚨 Inyecta PLATFORM_ID
  ) {}


}
