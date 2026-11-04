
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ModalService } from '../../shared/components/modal/modal.service';
import { catchError, throwError } from 'rxjs';
import { ContadorService } from '../services/contador.service';
import { SKIP_INTERCEPTOR } from './http-context-tokens';

let flagError401 = false;

/**
 * Interceptor funcional HTTP global.
 * Qué hace: Adjunta withCredentials: true para enviar cookies, redirige a login con modal ante un 401 (sesión vencida)
 * y avisa con un modal ante un 403 (acción no permitida) sin cerrar la sesión.
 * Cómo lo hace: Clona la request saliente, evalúa exclusiones silenciosas y en catchError distingue 401 de 403.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const modal = inject(ModalService);
  const contador = inject(ContadorService);

  const reqConCookies = req.clone({ withCredentials: true });

  const esRutaSilenciosa =
    req.url.includes('/auth/autorizar') ||
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/registro');

  if (req.context.get(SKIP_INTERCEPTOR) || esRutaSilenciosa) {
    return next(reqConCookies);
  }

  return next(reqConCookies).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (flagError401) {
          return throwError(() => error);
        }

        flagError401 = true;
        contador.limpiarTimers();
        localStorage.removeItem('usuarioActual');
        auth.actualUser.set(null);

        router.navigate(['/login']).then(() => {
          modal.alerta({
            categoria: 'SESIÓN / EXPIRACIÓN',
            titulo: 'Sesión expirada',
            mensaje: 'Tu sesión ha vencido o no es válida. Por favor, ingresá nuevamente.',
            textoConfirmar: 'Entendido',
            esPeligro: true
          }).then(() => {
            flagError401 = false;
          });
        });
      }

      if (error.status === 403) {
        modal.alerta({
          categoria: 'PERMISOS',
          titulo: 'Acción no permitida',
          mensaje: error.error?.message ?? 'No tenés permiso para realizar esta acción.',
          textoConfirmar: 'Entendido',
          tipoIcono: 'alert',
          esPeligro: true
        });
      }

      return throwError(() => error);
    })
  );
};


