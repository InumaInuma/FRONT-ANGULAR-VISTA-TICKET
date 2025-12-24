import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Enviroments } from '../../environments/env';
import { Router } from '@angular/router';
import { Examen } from '../../models/examen.interface';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ServiciosExamenes {

  private readonly PROCESSED_DECL_KEY = 'processedDeclarationId';
  private readonly ORDER_KEY_DNI = 'ordenDataDni';
  private readonly PENDING_DECL_KEY = 'pendingDeclaracionForConsent';
  private _pendingDeclaration: any = null;
  public pendingDeclaration$ = new BehaviorSubject<any>(null); // mantiene la declaración pendiente localmente
  constructor(
    private http: HttpClient,
    private enviroments: Enviroments,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object // 🚨 Inyecta PLATFORM_ID
  ) {}


}
