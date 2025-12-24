import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Enviroments } from '../../environments/env';

@Injectable({
  providedIn: 'root',
})
export class Serviciologin {


  constructor(
    private http: HttpClient,
    private enviroments: Enviroments,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object // 🚨 Inyecta PLATFORM_ID
  ) {}

}
