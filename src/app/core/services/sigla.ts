import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common'; // Importa esta función
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router'; // 🚨 Importa el Router
import {
  ConsentPayload,
  ConsentResponse,
  PolicyVersionInfo,
} from '../../models/consent-models';
import { SubExamen } from '../../models/subExamen.interface';
import { Examen } from '../../models/examen.interface';
import { Declaraciones } from '../../models/declaraciones.interface';
import { NroTicket } from '../../models/nroticket.interface';
import { OrdenData } from '../../models/ordenData.interface';
import { CuestionarioPregunta } from '../../models/cuestionarioPregunta.interface';
import { DeclaracionUpdateItemReq } from '../../models/declaracionesUpdateITemRed.interface';
import { BulkResponse } from '../../models/bulkResponse.interface';
import { RespuestaDetalle } from '../../models/respuestaDetalle.interface';
import { CuestionarioCompleto } from '../../models/cuestionarioCompleto.interface';
import { CuestionarioEstadoResponse } from '../../models/cuestionarioEstadoResponse.interface';
import { Enviroments } from '../../environments/env';
import { ColaboradorPagedResponse } from '../../models/colaborador.model';

@Injectable({
  providedIn: 'root',
})
export class SiglaService {
  //  SignalR Connection
  private hubConnection!: signalR.HubConnection;
  private connectionInitialized = false; // <-- Nuevo flag para evitar reconexiones
  private examenesSubject = new BehaviorSubject<Examen[]>([]);
  examenes$ = this.examenesSubject.asObservable();
  //  Declaraciones en tiempo real
  public declaracion$ = new BehaviorSubject<any>(null);
  // Mantiene la declaracion que el usuario aún NO ha visto
  public pendingDeclaration$ = new BehaviorSubject<any>(null); // mantiene la declaración pendiente localmente
  private _pendingDeclaration: any = null;
  // almacena grupos a los que quieres unirte para reconexiones automáticas
  private pendingGroups: {
    codEmp: number;
    codSed: number;
    codTCl: number;
    numOrd: number;
  }[] = [];

  private sessionTimeout: any; // ✅ Nuevo: variable para almacenar el temporizador

  private readonly ORDER_KEY_DNI = 'ordenDataDni';
  private readonly ORDER_KEY = 'ordenData';
  private readonly CONSENT_KEY = 'declarationAccepted'; // ✅ NUEVO
  private readonly PROCESSED_DECL_KEY = 'processedDeclarationId';
  private readonly PENDING_DECL_KEY = 'pendingDeclaracionForConsent';

  private readonly TIMEOUT_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas en milisegundos
  // llamar esto al construir el servicio para restaurar estado

  private readonly TOKEN = 'jwtToken';
  private readonly ROL = 'rol';
  private readonly LOGIN_KEY = 'isLoggedIn';
  private readonly SESSION_START_KEY = 'sessionStartTime';

  constructor(
    private http: HttpClient,
    private router: Router,
    private enviroments: Enviroments,
    @Inject(PLATFORM_ID) private platformId: Object // 🚨 Inyecta PLATFORM_ID
  ) {
    this.restorePendingDeclaration();
  }

  private restorePendingDeclaration() {
    if (isPlatformBrowser(this.platformId)) {
      const raw = localStorage.getItem(this.PENDING_DECL_KEY);
      if (raw) {
        try {
          this.pendingDeclaration$.next(JSON.parse(raw));
        } catch {
          localStorage.removeItem(this.PENDING_DECL_KEY);
        }
      }
    }
  }
  //////////////////////REAL TIME
  // ✅ Notificar suscripción en backend (opcional, si lo usas)
  subscribeToExamenes(
    codEmp: number,
    codSed: number,
    codTCl: number,
    numOrd: number
  ): Observable<void> {
    return this.http.post<void>(`${this.enviroments.apiUrl}/subscribe`, {
      codEmp,
      codSed,
      codTCl,
      numOrd,
    });
  }

  getExamenesPorTicket(idTicket: number): Observable<Examen[]> {
    return this.http.get<Examen[]>(
      `${this.enviroments.apiUrl}/realtimeticket/${idTicket}`
    );
  }

  nroTicket(dni: string): Observable<NroTicket[]> {
    return this.http.get<NroTicket[]>(
      `${this.enviroments.apiUrl}/nroticket/${dni}`
    );
  }

  // ✅ Conectar a SignalR
  startSignalRConnection(
    codEmp: number,
    codSed: number,
    codTCl: number,
    numOrd: number
  ): Promise<void> {
    // ⚠️ Importante: Solo inicia la conexión si no ha sido iniciada ya
    if (this.connectionInitialized) {
      console.log('✅ Conexión SignalR ya iniciada.');
      return Promise.resolve(); // Ya está lista;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.enviroments.hubUrl, {
        withCredentials: true,
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,

        //transport: signalR.HttpTransportType.WebSockets,
        // si necesitas token bearer (recomendado si usas JWT):
      })
      .configureLogging(signalR.LogLevel.Debug)
      .withAutomaticReconnect()
      .build();

    // Escucha mensajes del backend
    this.hubConnection.on('ExamenesActualizados', (mensaje: any[]) => {
      console.log('📢 Cambio recibido desde backend:', mensaje);
      // 🔥 Aquí actualizamos el BehaviorSubject
      this.examenesSubject.next(mensaje);
    });
    // Escucha mensajes del backend
    this.hubConnection.on('DeclaracionAdded', (payload: any) => {
      console.log('📢 DeclaracionAdded recibido:', payload);
      this.declaracion$.next(payload);
      // marcar pending para guards y para recuperar después si recarga
      //this.setPendingDeclaration(payload);
    });

    // when connection closed
    this.hubConnection.onclose(() => {
      console.warn('🔌 Conexión SignalR cerrada');
      this.connectionInitialized = false;
    });

    // when reconnected -> rejoin pending groups
    this.hubConnection.onreconnected(() => {
      console.log('🔁 SignalR reconectado, re-uniendo a grupos pendientes...');
      for (const g of this.pendingGroups) {
        this.hubConnection
          .invoke('JoinOrderGroup', g.codEmp, g.codSed, g.codTCl, g.numOrd)
          .catch((err) => console.warn('Error reenlazando grupo:', err));
      }
    });

    return (
      this.hubConnection
        .start()
        .then(() => {
          console.log('✅ Conectado a SignalR');
          this.connectionInitialized = true; // <-- Marcar como inicializada
        })
        //.catch((err) => console.error('❌ Error al conectar SignalR:', err));
        .catch((err) => {
          console.error('❌ Error al conectar SignalR:', err);
          this.connectionInitialized = false;
          // Lanzar el error o rechazar la promise para que el componente lo maneje
          return Promise.reject(err);
        })
    );
  }

  joinOrderGroup(
    codEmp: number,
    codSed: number,
    codTCl: number,
    numOrd: number
  ) {
    // Guarda el grupo si no existe, para rejoin en reconexión
    const exists = this.pendingGroups.some(
      (g) =>
        g.codEmp === codEmp &&
        g.codSed === codSed &&
        g.codTCl === codTCl &&
        g.numOrd === numOrd
    );
    if (!exists) this.pendingGroups.push({ codEmp, codSed, codTCl, numOrd });

    if (
      this.hubConnection &&
      this.hubConnection.state === signalR.HubConnectionState.Connected
    ) {
      this.hubConnection
        .invoke('JoinOrderGroup', codEmp, codSed, codTCl, numOrd)
        .then(() =>
          console.log(
            `🎯 Unido al grupo ${codEmp}-${codSed}-${codTCl}-${numOrd}`
          )
        )
        .catch((err) => console.error('❌ Error al unirse al grupo:', err));
    } else {
      console.warn(
        '⚠️ No se puede unir al grupo ahora. Se unirá automáticamente tras reconexión.'
      );
      // onreconnected ya se encargará de enrollar
    }
  }

  stopSignalRConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop().then(() => {
        console.log('🛑 Conexión SignalR detenida');
      });
    }
  }

  // unirse al grupo por ticket
  joinTicketGroup(idTicket: number) {
    if (
      this.hubConnection &&
      this.hubConnection.state === signalR.HubConnectionState.Connected
    ) {
      this.hubConnection
        .invoke('JoinTicketGroup', idTicket)
        .then(() => console.log(`🎯 Unido al grupo ticket-${idTicket}`))
        .catch((err) =>
          console.error('❌ Error al unirse al grupo ticket:', err)
        );
    } else {
      console.warn('⚠️ Conexión no activa. No se pudo unir a grupo ticket.');
      this.hubConnection?.onreconnected(() => {
        this.hubConnection
          .invoke('JoinTicketGroup', idTicket)
          .catch((err) =>
            console.error(
              '❌ Error al unirse al grupo ticket tras reconexión:',
              err
            )
          );
      });
    }
  }
  ///////////////////EXAMENES
  getExamenes(
    codEmp: number,
    codSed: number,
    codTCl: number,
    numOrd: number,
    idTicked: Number
  ): Observable<Examen[]> {
    return this.http.get<Examen[]>(
      `${this.enviroments.apiUrl}/realtimeruta/${codEmp}/${codSed}/${codTCl}/${numOrd}/${idTicked}`
    );
  }

  getRxFlag(codEmp: number, codSed: number, codTCl: number, numOrd: number) {
    return this.http.get<{ hasRayosX: boolean }>(
      `${this.enviroments.apiUrl}/ordenxservicio/${codEmp}/${codSed}/${codTCl}/${numOrd}/rxflag`
    );
  }

  getHuellaUrl(params: {
    codEmp: number;
    codSed: number;
    codTCl: number;
    numOrd: number;
    codDec: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return `${this.enviroments.apiUrl}/huella?${query}`;
  }

  setProcessedDeclarationId(id: number | null): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (id === null) localStorage.removeItem(this.PROCESSED_DECL_KEY);
    else localStorage.setItem(this.PROCESSED_DECL_KEY, String(id));
  }

  // marcar que ya entró a declarar (se usa cuando el paciente completa/acepta)
  // esto actualiza también el localStorage ORDER_KEY_DNI.hasConsent si existe
  markEnteredConsentOnce() {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem('enteredConsentOnce', 'true');
  }

  //  DECLARACIONES (pending)

  // helper booleano
  hasPendingDeclaration(): boolean {
    const v = this.pendingDeclaration$.value;
    if (v) return true;
    if (!isPlatformBrowser(this.platformId)) return false;
    const raw = localStorage.getItem(this.PENDING_DECL_KEY);
    return !!raw;
  }

  // pending declaration helper (opcionalmente usado por consent)
  setPendingDeclarationForConsent(payload: any) {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.PENDING_DECL_KEY, JSON.stringify(payload));
  }

  clearPendingDeclarationForConsent() {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem(this.PENDING_DECL_KEY);
  }

  getPendingDeclarationForConsent(): any | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem(this.PENDING_DECL_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  // Declaración ya procesada
  // (para evitar que se repita el modal)
  getProcessedDeclarationId(): number | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem(this.PROCESSED_DECL_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  getPendingDeclaration(): any {
    if (!this._pendingDeclaration && isPlatformBrowser(this.platformId)) {
      const raw = localStorage.getItem('pendingDeclaration');
      if (raw) {
        try {
          this._pendingDeclaration = JSON.parse(raw);
        } catch {
          this._pendingDeclaration = null;
        }
      }
    }
    return this._pendingDeclaration;
  }

  //////////////////CUESTIONARIO
  // ✅ Nuevo método para obtener las preguntas desde el backend
  getCuestionarioPreguntas(): Observable<CuestionarioPregunta[]> {
    return this.http.get<CuestionarioPregunta[]>(
      `${this.enviroments.apiUrl}/cuestionario`
    );
  }

  // 🚨 Nuevo método para enviar el cuestionario completo en una sola llamada
  guardarCuestionarioCompleto(
    cuestionario: CuestionarioCompleto
  ): Observable<any> {
    const url = `${this.enviroments.apiUrl}/cuestionario/completar`; // ✅ Ruta de tu nuevo endpoint
    return this.http.post(url, cuestionario);
  }
  // ✅ Nuevo método para obtener el estado del cuestionario
  getCuestionarioEstado(
    codPer: number
  ): Observable<CuestionarioEstadoResponse> {
    return this.http.get<CuestionarioEstadoResponse>(
      `${this.enviroments.apiUrl}/cuestionario/estado/${codPer}`
    );
  }

  //LOGIN POR TICKET
  Ticketlogin(dni: string): Observable<any> {
    return this.http
      .post(`${this.enviroments.apiUrl}/loginticket/${dni}`, {})
      .pipe(
        tap((response: any) => {
          // 🚨 Verifica si el código se ejecuta en el navegador antes de usar localStorage
          // ✅ Guardamos los datos de la orden en localStorage
          if (
            isPlatformBrowser(this.platformId) &&
            response &&
            response.status === 1
          ) {
            // 🔐 JWT
            // ✅ Guarda la marca de tiempo de inicio de sesión
            localStorage.setItem(this.TOKEN, response.token);
            // 👤 ROL
            localStorage.setItem(this.ROL, String(response.rol));
            // 📄 Orden / Ticket
            localStorage.setItem(
              this.ORDER_KEY_DNI,
              JSON.stringify(response.ordenDni)
            );
            localStorage.setItem(this.LOGIN_KEY, 'true');
            localStorage.setItem(this.SESSION_START_KEY, Date.now().toString());
            // ✅ Inicia el temporizador de la sesión
            this.startSessionTimer();
          }
        }),
        catchError(this.handleError)
      );
  }
  //Helper para leer el rol (MUY IMPORTANTE)
  getRol(): number | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const r = localStorage.getItem(this.ROL);
    return r ? Number(r) : null;
  }

  // ✅ Nuevo método para iniciar el temporizador
  private startSessionTimer(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    this.sessionTimeout = setTimeout(() => {
      console.log('⏰ Sesión expirada automáticamente.');
      this.logout();
    }, this.TIMEOUT_DURATION_MS);
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage =
      'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error.error?.message || error.statusText;
    }
    const customError = {
      status: error.status,
      message: errorMessage,
    };

    console.error('Error capturado en handleError:', customError);
    // 🚨 Retorna un observable de error que contiene el mensaje de error

    return throwError(() => customError); // 👈 Pasamos objeto con status y mensaje
  }

  logout(): void {
    // 🚨 Verifica el entorno antes de usar localStorage
    if (isPlatformBrowser(this.platformId)) {
      // ✅ Elimina la claves
      localStorage.removeItem(this.LOGIN_KEY);
      localStorage.removeItem(this.TOKEN);
      localStorage.removeItem(this.ORDER_KEY);
      localStorage.removeItem(this.CONSENT_KEY); // ✅ limpia consentimiento
      localStorage.removeItem(this.SESSION_START_KEY);
      clearTimeout(this.sessionTimeout); // ✅ Limpia el temporizador
      // ✅ SSR-safe
      this.router.navigate(['login']);
    }
  }

  //CERRAR SESSION LOGIN
  logoutdniticket(): void {
    // 🚨 Verifica el entorno antes de usar localStorage
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.LOGIN_KEY);
      localStorage.removeItem(this.TOKEN);
      localStorage.removeItem(this.ORDER_KEY_DNI);
      localStorage.removeItem(this.CONSENT_KEY); // ✅ limpia consentimiento
      localStorage.removeItem(this.SESSION_START_KEY);
      clearTimeout(this.sessionTimeout); // ✅ Limpia el temporizador
      // ✅ SSR-safe
      this.router.navigate(['login']);
    }
  }

  isLoggedIn(): boolean {
    // 🚨 Verifica el entorno antes de acceder a localStorage
    if (isPlatformBrowser(this.platformId)) {
      const loggedIn = localStorage.getItem(this.LOGIN_KEY) === 'true';
      const startTime = localStorage.getItem(this.SESSION_START_KEY);
      if (loggedIn && startTime) {
        const elapsedTime = Date.now() - parseInt(startTime, 10);
        // ✅ Verifica si el tiempo de la sesión ha expirado
        if (elapsedTime > this.TIMEOUT_DURATION_MS) {
          console.log('⏰ Sesión expirada por inactividad.');
          this.logout();
          return false;
        }
        // ✅ Si no ha expirado, reinicia el temporizador para el estado actual
        this.startSessionTimer();
        return true;
      }
    }
    return false; // Retorna falso si no estás en un navegador
  }

  // modificar tu hasEnteredConsentOnce() para chequear también CONSENT_KEY
  hasEnteredConsentOnce(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    // conserva tu lógica previa por compatibilidad con ordenDataDni
    try {
      const raw = localStorage.getItem(this.ORDER_KEY_DNI);
      if (raw) {
        const orden = JSON.parse(raw);
        const v = orden?.hasConsent ?? orden?.HasConsent;
        if (v === true || v === 1 || v === '1') return true;
      }
    } catch {}
    // fallback a la marca explícita
    return localStorage.getItem('enteredConsentOnce') === 'true';
  }

  ////////////////////CONSULTAR ORDEN
  // Dentro de tu clase SiglaService
  consultarOrden(dni: string): Observable<any> {
    return this.http
      .post(`${this.enviroments.apiUrl}/loginorden/${dni}`, {})
      .pipe(
        tap((response: any) => {
          // 🚨 Verifica si el código se ejecuta en el navegador antes de usar localStorage
          // ✅ Guardamos los datos de la orden en localStorage
          if (
            isPlatformBrowser(this.platformId) &&
            response &&
            response.status === 1
          ) {
            // ✅ Guarda la marca de tiempo de inicio de sesión
            localStorage.setItem(this.LOGIN_KEY, 'true');
            localStorage.setItem(
              this.ORDER_KEY,
              JSON.stringify(response.orden)
            );
            localStorage.setItem(this.SESSION_START_KEY, Date.now().toString());
            // ✅ Inicia el temporizador de la sesión
            this.startSessionTimer();
            // 👉 Opcional: después de login, llévalo directo a consent
          }
        }),
        catchError(this.handleError)
      );
  }

  ///////////DECLARACIONES
  getDeclaraciones(
    codEmp: number,
    codSed: number,
    codTCl: number,
    numOrd: number
  ): Observable<Declaraciones[]> {
    return this.http.get<Declaraciones[]>(
      `${this.enviroments.apiUrl}/declaraciones/${codEmp}/${codSed}/${codTCl}/${numOrd}`
    );
  }

  guardarDeclaracionesBulk(body: {
    codEmp: number;
    codSed: number;
    codTCl: number;
    numOrd: number;
    nomcom: string;
    items: {
      codDec: number;
      estado: boolean;
      divice?: string | null;
      firmas?: string | null;
      fecAce?: string | null;
      noStPe?: boolean | null;
      stDuPe?: boolean | null;
      staPer?: boolean | null;
    }[];
  }) {
    const url = `${this.enviroments.apiUrl}/aceptar-bulk`;
    return this.http.post<BulkResponse>(url, body, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  submitConsent(payload: ConsentPayload): Observable<ConsentResponse> {
    return this.http
      .post<ConsentResponse>(this.enviroments.consentUrl, payload)
      .pipe(
        tap((_) => {
          // ✅ Marca la declaración como aceptada en cuanto el backend confirme
          //this.markDeclarationAccepted();
          // y manda a examenes
          this.router.navigate(['examenes']);
        })
      );
  }

  buildPayload(input: {
    fullName: string;
    accepted: boolean;
    signaturePngBase64: string;
    policy: PolicyVersionInfo /* ; patientId?: string; */;
  }): ConsentPayload {
    const userAgent =
      typeof navigator !== 'undefined' ? navigator.userAgent : '';
    return {
      /* patientId: input.patientId, */
      fullName: input.fullName.trim(),
      accepted: input.accepted,
      acceptedAt: new Date().toISOString(),
      policy: input.policy,
      signaturePngBase64: input.signaturePngBase64,
      userAgent,
      // ipAddress: opcional; sugiere capturarlo en el backend desde la request
    };
  }

  getOrdenData(): OrdenData | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem(this.ORDER_KEY);
    try {
      return raw ? (JSON.parse(raw) as OrdenData) : null;
    } catch {
      return null;
    }
  }

  getColaboradores(
    pageNumber: number,
    pageSize: number,
    dni?: string
  ): Observable<ColaboradorPagedResponse> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (dni) {
      params = params.set('dni', dni);
    }

    return this.http.get<ColaboradorPagedResponse>(
      `${this.enviroments.apiUrl}/colaboradores`,
      { params }
    );
  }

  updateRol(codPer: number, idRol: number) {
    return this.http.put(`${this.enviroments.apiUrl}/colaboradores/rol`, {
      codPer,
      idRol,
    });
  }
}
