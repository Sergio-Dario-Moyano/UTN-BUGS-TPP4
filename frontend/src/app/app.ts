// DESTINO: src/app/app.ts
import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ContadorService } from './core/services/contador.service';
import { ModalComponent } from './shared/components/modal/modal.component';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

/**
 * Componente raíz de la aplicación UTN-BUGS.
 * Qué hace: Actúa como marco contenedor (navbar, router-outlet y modal global) y reactiva el aviso de sesión tras un F5.
 * Cómo lo hace: Si hay sesión guardada y la ruta no es la raíz (que ya verifica pantalla-cargando), renueva la cookie
 * con refrescarToken() y reinicia el temporizador de 10 minutos para que ambos queden alineados.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ModalComponent, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  authService = inject(AuthService);
  private contador = inject(ContadorService);

  ngOnInit(): void {
    const esRutaRaiz = window.location.pathname === '/';
    if (this.authService.isAuthenticated() && !esRutaRaiz) {
      this.authService.refrescarToken().subscribe({
        next: () => this.contador.iniciarTemporizador()
        // Si la cookie ya venció, el interceptor muestra el modal de sesión expirada
      });
    }
  }
}


