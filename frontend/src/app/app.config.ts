import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';

/**
 * Configuración global de la aplicación Angular standalone.
 * Qué hace: Inyecta los proveedores base para detección de cambios, enrutamiento y peticiones HTTP.
 * Cómo lo hace: Agrupa provideZoneChangeDetection con coalescing, provideRouter() con routes,
 * y provideHttpClient() registrando el authInterceptor funcional que administra las cookies HttpOnly y errores 401.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Optimización de ciclos de detección de cambios
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Registro de rutas del sistema
    provideRouter(routes),

    // Cliente HTTP con interceptor funcional para cookies HttpOnly y control de 401
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
};