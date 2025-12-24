import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Enviroments {
  // public apiUrl = 'https://apihojaderuta.medcorp.pe/api/Examenes'; // ✅ puerto correcto
  // public hubUrl = 'https://apihojaderuta.medcorp.pe/hubs/examenes'; // ✅ SignalR hub
  // public consentUrl = 'https://apihojaderuta.medcorp.pe/api/consents'; // ✅ Consentimientos (separado)

    public apiUrl = 'http://localhost:5106/api/Examenes' // ✅ puerto correcto
    public hubUrl = 'http://localhost:5106/hubs/examenes' // ✅ SignalR hub
    public consentUrl = 'http://localhost:5106/api/consents' // ✅ Consentimientos (separado)
}
