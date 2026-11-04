import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard funcional para rutas públicas (login/registro).
 * Qué hace: Previene que un usuario con sesión activa vuelva al login o registro.
 * Cómo lo hace: Evalúa authService.isAuthenticated() y redirige al feed /publicaciones.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate(['/publicaciones']);
    return false;
  }
  return true;
};