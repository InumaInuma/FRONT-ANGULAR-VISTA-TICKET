import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, inject, Injectable } from '@angular/core';
import {
  getToken,
  isSupported,
  Messaging,
  onMessage,
} from '@angular/fire/messaging';
import { environment } from '../../../environments/environment';
import { SiglaService } from './sigla';
import { Enviroments } from '../../environments/env';

@Injectable({
  providedIn: 'root',
})
export class FcmServiceTs {
  private messaging = inject(Messaging);
  private http = inject(HttpClient);

  constructor(private siglaService: SiglaService,private enviroments: Enviroments,) {}

  async initAndRegisterToken(idTicked: number) {
    try {
      if (!(await isSupported())) {
        console.warn('[FCM] Browser no soporta FCM Web.');
        return;
      }

      // 1) pedir permiso
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        console.warn('[FCM] Permiso no concedido:', perm);
        return;
      }

      // 1) Registra (o reutiliza) el SW de FCM en la RAÍZ
      let reg = await navigator.serviceWorker.getRegistration(
        '/firebase-messaging-sw.js'
      );
      if (!reg) {
        reg = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
          { scope: '/' }
        );
      }

      // 2) Espera a que esté "ready"
      const regg = await navigator.serviceWorker.ready; // espera a que esté activo
      console.log('[FCM] SW de FCM registrado. Scope:', reg.scope);

      // 3) Espera a que controle la página (importantísimo para que haya pushManager)
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          const onCtrl = () => {
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.removeEventListener(
                'controllerchange',
                onCtrl
              );
              resolve();
            }
          };
          navigator.serviceWorker.addEventListener('controllerchange', onCtrl);
          // En la práctica, suele resolverse tras un reload; este hook lo cubre sin recargar manualmente.
        });
      }

      console.log(
        '[FCM] SW listo. Scope:',
        reg.scope,
        'Controller:',
        !!navigator.serviceWorker.controller
      );

      // 4)  // 4) Ahora sí, pide el token / Obtener token usando ESE registration + VAPID key
      const token = await getToken(this.messaging, {
        vapidKey: environment.firebase.vapidKey,
        serviceWorkerRegistration: regg,
      });

      console.log('[FCM] token:', token);

      if (!token) {
        console.warn('[FCM] No se pudo obtener token (null/undefined).');
        return;
      }

      console.log('[FCM] Token obtenido:', token.substring(0, 16), '...');

      await this.http
        .post(`${this.enviroments.apiUrl}/register/token`, {
          idTicked,
          token,
        })
        .toPromise();

      console.log('[FCM] token registrado en backend', idTicked, token);

      // 3) manejar mensajes en foreground (vibra + noti)
      onMessage(this.messaging, async (payload) => {
        const title =
          payload.notification?.title ??
          payload.data?.['title'] ??
          'Notificación';
        const body = payload.notification?.body ?? payload.data?.['body'] ?? '';
        const tag = payload.data?.['tag'] || 'medcorp-recepcion';

        // Vibración (foreground)
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]);

        // Mostrar notificación (foreground) vía SW (mejor compatibilidad que new Notification)
        // try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon: '/assets/icons/icon-192.png',
          badge: '/assets/icons/badge.png',
          // 👇 TS a veces no incluye vibrate en NotificationOptions; forzamos el tipo
          vibrate: [200, 100, 200, 100, 300] as any,
          requireInteraction: true,
          data: payload.data || {},
          tag, // ya corregido el acceso
          actions: [{ action: 'open', title: 'Abrir' }],
        } as any);
      });
    } catch (err: any) {
      console.error(
        '[FCM] Error en initAndRegisterToken:',
        err?.code || err?.message || err
      );
      // Errores comunes: messaging/failed-service-worker-registration, messaging/unsupported-browser, etc.
    }
  }
}
