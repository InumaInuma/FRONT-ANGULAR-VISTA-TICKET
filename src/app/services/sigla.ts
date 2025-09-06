import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common'; // Importa esta función
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router'; // 🚨 Importa el Router
import { response } from 'express';

// sigla.service.ts
export interface SubExamen {
  codSer: number;
  nombre: string;
  // ⚠️ Ya no necesitas la propiedad 'estado' aquí
}

export interface Examen {
  codPer: number;
  nomPer: string;
  nroDId: string;
  nroTlf: string;
  edaPac: number;
  fecAte: string;
  nomCom: string;
  codTCh: string;
  codSer: number;
  nomSer: string;
  estado: number; // 0 en cola, 1 llamando, 3 atendido, 4 en espera

  // 🚨 Agregamos la lista de sub-exámenes
  subExamenes: SubExamen[];

  // Propiedad para controlar el despliegue
  isExpanded: boolean;
}

// Define una interfaz para el objeto de orden que devuelve el backend
export interface OrdenData {
  codEmp: number;
  codSed: number;
  codTCl: number;
  numOrd: number;
}

@Injectable({
  providedIn: 'root',
})
export class SiglaService {
  private apiUrl = 'http://localhost:5106/api/Examenes'; // ✅ puerto correcto
  private hubUrl = 'http://localhost:5106/hubs/examenes'; // ✅ SignalR hub

  private hubConnection!: signalR.HubConnection;

  private connectionInitialized = false; // <-- Nuevo flag para evitar reconexiones

  private examenesSubject = new BehaviorSubject<Examen[]>([]);

  examenes$ = this.examenesSubject.asObservable();

  /* constructor(private http: HttpClient,private router: Router) {}
   */
  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object // 🚨 Inyecta PLATFORM_ID
  ) {}

  // Dentro de tu clase SiglaService
  login(dni: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${dni}`, {}).pipe(
      tap((response: any) => {
        // 🚨 Verifica si el código se ejecuta en el navegador antes de usar localStorage
        // ✅ Guardamos los datos de la orden en localStorage
        if (
          isPlatformBrowser(this.platformId) &&
          response &&
          response.status === 1
        ) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('ordenData', JSON.stringify(response.orden));
        }
      }),
      catchError(this.handleError)
    );
  }

  isLoggedIn(): boolean {
    // 🚨 Verifica el entorno antes de acceder a localStorage
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('isLoggedIn') === 'true';
    }
    return false; // Retorna falso si no estás en un navegador
  }

  logout(): void {
    // 🚨 Verifica el entorno antes de usar localStorage
    if (isPlatformBrowser(this.platformId)) {
      // ✅ Elimina la clave 'isLoggedIn'
      localStorage.removeItem('isLoggedIn');
      // ✅ Elimina la clave 'ordenData'
      localStorage.removeItem('ordenData');
    }
    /*   this.router.navigate(['/login']); */
    // 👇 En vez de solo navegar, forzamos recarga total
    window.location.href = '/login'; // 👈 Fuerza recarga real de la página
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage =
      'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend error (e.g., 4xx, 5xx)
      /*  errorMessage = `Server responded with: ${error.status} - ${error.error.message || error.statusText}`;
      console.error(`Backend error: ${JSON.stringify(error.error)}`); */
      errorMessage = error.error?.message || error.statusText;
    }
    const customError = {
      status: error.status,
      message: errorMessage,
    };

    console.error('Error capturado en handleError:', customError);
    // 🚨 Retorna un observable de error que contiene el mensaje de error
    /*  return throwError(() => new Error(errorMessage)); */
    return throwError(() => customError); // 👈 Pasamos objeto con status y mensaje
  }

  // ✅ GET inicial
  getExamenes(
    codEmp: number,
    codSed: number,
    codTCl: number,
    numOrd: number
  ): Observable<Examen[]> {
    return this.http.get<Examen[]>(
      `${this.apiUrl}/${codEmp}/${codSed}/${codTCl}/${numOrd}`
    );
  }

  // ✅ Notificar suscripción en backend (opcional, si lo usas)
  subscribeToExamenes(
    codEmp: number,
    codSed: number,
    codTCl: number,
    numOrd: number
  ): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/subscribe`, {
      codEmp,
      codSed,
      codTCl,
      numOrd,
    });
  }

  // ✅ Conectar a SignalR
  startSignalRConnection(
    codEmp: number,
    codSed: number,
    codTCl: number,
    numOrd: number
  ) {
    // ⚠️ Importante: Solo inicia la conexión si no ha sido iniciada ya
    if (this.connectionInitialized) {
      console.log('✅ Conexión SignalR ya iniciada.');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        withCredentials: true,
        transport: signalR.HttpTransportType.WebSockets,
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

    this.hubConnection
      .start()
      .then(() => {
        console.log('✅ Conectado a SignalR');
        this.connectionInitialized = true; // <-- Marcar como inicializada
      })
      .catch((err) => console.error('❌ Error al conectar SignalR:', err));

    this.hubConnection.onclose(() => {
      console.warn('🔌 Conexión SignalR cerrada');
      this.connectionInitialized = false; // <-- Resetear el flag en caso de cierre
    });
  }

  // Nuevo método para unirse al grupo
  joinOrderGroup(
    codEmp: number,
    codSed: number,
    codTCl: number,
    numOrd: number
  ) {
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
      console.warn('⚠️ No se puede unir al grupo. La conexión no está activa.');
      // Puedes intentar unirte una vez que se conecte
      this.hubConnection.onreconnected(() => {
        this.hubConnection.invoke(
          'JoinOrderGroup',
          codEmp,
          codSed,
          codTCl,
          numOrd
        );
      });
    }
  }

  stopSignalRConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop().then(() => {
        console.log('🛑 Conexión SignalR detenida');
      });
    }
  }
}
