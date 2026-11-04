import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard funcional que protege rutas para miembros autenticados.
 * Qué hace: Impide el acceso a usuarios no identificados.
 * Cómo lo hace: Evalúa authService.isAuthenticated() y redirige a /login si no hay sesión.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};