import 'zone.js'; // 👈 Esto es lo que faltaba
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
// 🔥 AngularFire
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { environment } from '../environments/environment';
import { interceptorInterceptor } from './core/interceptor/interceptor-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([interceptorInterceptor])),
    // ✅ Service Worker de Angular (deja solo UNA llamada)
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),

    // ✅ Inicializa Firebase + FCM
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideMessaging(() => getMessaging()),
  ],
};
