import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ContadorService } from '../../core/services/contador.service';

/**
 * Componente standalone para verificación de sesión en arranque.
 * Qué hace: Consulta al endpoint /auth/autorizar para saber si la cookie sigue vigente; si es válida va a /publicaciones e inicia el timer, sino redirige a /login.
 * Cómo lo hace: Invoca auth.autorizarSesion() en ngOnInit() y redirige mediante router.navigate().
 */
@Component({
  selector: 'app-pantalla-cargando',
  standalone: true,
  imports: [],
  templateUrl: './pantalla-cargando.html',
  styleUrl: './pantalla-cargando.css'
})
export class PantallaCargando implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private contadorService = inject(ContadorService);

  ngOnInit(): void {
    this.verificarEstadoSesion();
  }

  /**
   * Ejecuta la verificación silenciosa del token.
   * Qué hace: Recupera el usuario o limpia sesión según el estado del backend.
   * Cómo lo hace: Llama a auth.autorizarSesion() y evalúa éxito (200) o error (401).
   */
  private verificarEstadoSesion(): void {
    this.auth.autorizarSesion().subscribe({
      next: (res: any) => {
        this.auth.setUsuarioActual(res.usuario);
        this.contadorService.iniciarTemporizador();
        this.router.navigate(['/publicaciones']);
      },
      error: () => {
        this.auth.actualUser.set(null);
        localStorage.removeItem('usuarioActual');
        this.router.navigate(['/login']);
      }
    });
  }
}