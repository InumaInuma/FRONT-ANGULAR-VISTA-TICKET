import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export const interceptorInterceptor: HttpInterceptorFn = (req, next) => {
  // Lista de URLs protegidas
  // const protectedUrls = [
  //   '/api/Examenes/realtimeticket/',
  //   '/api/Examenes/realtimeruta/',
  //   '/api/Examenes/aceptar-bulk',
  //   '/api/Examenes/cuestionario/completar',
  //   '/api/Examenes/cuestionario/estado/',
  //   '/api/Examenes/colaboradores', // 👈 AQUI
  // ];

  // // Obtener token (asegúrate de estar en el navegador si usas SSR)
  // const token =
  //   typeof localStorage !== 'undefined'
  //     ? localStorage.getItem('jwtToken')
  //     : null;

  // console.log('🔐 Interceptor Funcional - URL:', req.url+token);

  // const requiresAuth = protectedUrls.some((url) => req.url.includes(url));

  // if (token && requiresAuth) {
  //   console.log('✅ Adjuntando Token...');
  //   const authReq = req.clone({
  //     setHeaders: {
  //       Authorization: `Bearer ${token}`,
  //     },
  //   });
  //   return next(authReq);
  // }

  // return next(req);


//   👉 Adjuntar token a TODO /api
// 👉 Excepto login / público
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('jwtToken')
      : null;

  const isApiCall = req.url.includes('/api/');
  const isPublic =
    req.url.includes('/login') || req.url.includes('/loginticket');

  if (token && isApiCall && !isPublic) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq);
  }

  return next(req);
};
