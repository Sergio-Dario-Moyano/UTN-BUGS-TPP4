import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

/**
 * Tabla de rutas standalone para Sprints 1, 2 y 3.
 * Qué hace: Mapea cada URL a su componente correspondiente con lazy loading y protección perimetral.
 * Cómo lo hace: Usa loadComponent() con promesas dinámicas y guards de navegación (guestGuard y authGuard).
 */
export const routes: Routes = [
  // Ruta inicial: pantalla splash de verificación silenciosa de sesión (Sprint 3)
  {
    path: '',
    loadComponent: () =>
      import('./pages/pantalla-cargando/pantalla-cargando').then((m) => m.PantallaCargando)
  },

  // Ruta pública: Login (Sprint 1)
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login)
  },

  // Ruta pública: Registro (Sprint 1)
  {
    path: 'registro',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro)
  },

  // Ruta privada: Feed principal de publicaciones (Sprints 1 y 2)
  {
    path: 'publicaciones',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/publicaciones/publicaciones').then((m) => m.Publicaciones)
  },

  // Ruta privada: Detalle de publicación con hilo de comentarios paginados (Sprint 3)
  {
    path: 'publicaciones/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/publicacion-detalle/publicacion-detalle').then((m) => m.PublicacionDetalle)
  },

  // Ruta privada: Mi Perfil (datos personales y últimas 3 publicaciones) (Sprints 1 y 2)
  {
    path: 'mi-perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/mi-perfil/mi-perfil').then((m) => m.MiPerfil)
  },

  // Redirección ante cualquier ruta no coincidente hacia la raíz
  {
    path: '**',
    redirectTo: ''
  }
];