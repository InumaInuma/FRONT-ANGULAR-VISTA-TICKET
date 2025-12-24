import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { Enviroments } from '../../environments/env';
import { Examen } from '../../models/examen.interface';

@Injectable({
  providedIn: 'root',
})
export class ServiciosRealtime {
  private hubConnection!: signalR.HubConnection;
  private connectionInitialized = false; // <-- Nuevo flag para evitar reconexiones
  private examenesSubject = new BehaviorSubject<Examen[]>([]);
  public declaracion$ = new BehaviorSubject<any>(null);

  private pendingGroups: {
    codEmp: number;
    codSed: number;
    codTCl: number;
    numOrd: number;
  }[] = [];

  constructor(
    private http: HttpClient,
    private enviroments: Enviroments,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object // 🚨 Inyecta PLATFORM_ID
  ) {}

 
}
