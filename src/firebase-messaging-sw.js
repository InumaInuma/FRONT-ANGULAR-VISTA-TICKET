// ✅ toma control inmediato
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// firebase-messaging-sw.js
/* global self, importScripts, firebase */
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js");

// Tu config de Firebase
firebase.initializeApp({
  apiKey: "AIzaSyCHytTbLHhH1qXLN5W_s-KWOZfRrz6lEkc",
  authDomain: "Tmedcorpx.firebaseapp.com",
  projectId: "medcorpx",
  storageBucket: "medcorpx.firebasestorage.app",
  messagingSenderId: "828825503885",
  appId: "1:828825503885:web:85462be33f2ea695d4bac4",
  measurementId: "G-NFKVEFW4JF"
});

const messaging = firebase.messaging();

/* // Notificaciones en background
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Notificación";
  const body  = payload.notification?.body  ?? "";
  const options = {
    body,
    icon:  "/assets/icons/icon-192.png",
    badge: "/assets/icons/badge.png",
    vibrate: [200, 100, 200, 100, 300],
    requireInteraction: true,
    data: payload.data || {},
    tag: payload.data?.tag || "medcorp-recepcion"
  };
  self.registration.showNotification(title, options);
});

// Clic en la notificación
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.link || "/nroticket";
  // abre o enfoca
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientsArr => {
      const had = clientsArr.find(c => c.url.includes(url));
      if (had) return had.focus();
      return clients.openWindow(url);
    })
  );
}); */

// Notificaciones en background
messaging.onBackgroundMessage((payload) => {
  const n   = payload.notification || {};
  const d   = payload.data || {};
  const title = n.title || d.title || "Notificación";
  const body  = n.body  || d.body  || "";
  const tag   = d.tag || "medcorp-recepcion";
  // Acepta 'url' o 'link'
  const deepLink = d.url || d.link || "/nroticket";

  self.registration.showNotification(title, {
    body,
    icon:  "/assets/icons/icon-192.png",
    badge: "/assets/icons/badge.png",
    vibrate: [200, 100, 200, 100, 300],
    requireInteraction: true,
    data: { url: deepLink },   // guarda la url aquí
    tag,
    actions: [{ action: "open", title: "Abrir" }],
  });
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification?.data && event.notification.data.url) || "/nroticket";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientsArr => {
      const had = clientsArr.find(c => c.url.includes(url));
      if (had) return had.focus();
      return clients.openWindow(url);
    })
  );
});




// Muestra notificación cuando llegue en background
/* messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || (payload.notification && payload.notification.title) || "Notificación";
  const body  = data.body  || (payload.notification && payload.notification.body)  || "";
  const tag   = data.tag   || "medcorp-recepcion";
  const url   = data.url   || "/nroticket";

  self.registration.showNotification(title, {
    body,
    icon: data.icon || "/assets/icons/icon-192.png",
    badge: data.badge || "/assets/icons/badge.png",
    vibrate: [200, 100, 200, 100, 300], // no vibrará en laptop
    tag,
    data: { url },
    requireInteraction: true,
    actions: [{ action: "open", title: "Abrir" }],
  });
});

// Al hacer click, abrir/traer la pestaña
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/nroticket';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
}); */