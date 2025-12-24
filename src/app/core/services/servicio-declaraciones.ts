import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Enviroments } from '../../environments/env';
import { Router } from '@angular/router';
import { Declaraciones } from '../../models/declaraciones.interface';
import { Observable, tap } from 'rxjs';
import { BulkResponse } from '../../models/bulkResponse.interface';
import {
  ConsentPayload,
  ConsentResponse,
} from '../../models/consent-models';

@Injectable({
  providedIn: 'root',
})
export class ServicioDeclaraciones {
  constructor(
    private http: HttpClient,
    private enviroments: Enviroments,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object // 🚨 Inyecta PLATFORM_ID
  ) {}


}
