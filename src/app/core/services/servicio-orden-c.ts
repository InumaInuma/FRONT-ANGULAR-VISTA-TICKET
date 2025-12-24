import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Enviroments } from '../../environments/env';
import { Router } from '@angular/router';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ServicioOrdenC {
  private readonly TOKEN = 'jwtToken';
  private readonly LOGIN_KEY = 'isLoggedIn';
  private readonly ORDER_KEY = 'ordenData';
  private readonly SESSION_START_KEY = 'sessionStartTime';
  private sessionTimeout: any;
  private readonly TIMEOUT_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas en milisegundos
  private readonly CONSENT_KEY = 'declarationAccepted'; // ✅ NUEVO

  constructor(
    private http: HttpClient,
    private enviroments: Enviroments,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object // 🚨 Inyecta PLATFORM_ID
  ) {}


}
