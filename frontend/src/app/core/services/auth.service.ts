import { computed, inject, Injectable, signal, WritableSignal, Injector } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ILogin, IUsuario } from '../models/auth.interface';
import { Router } from '@angular/router';
import { ContadorService } from './contador.service';
import { SKIP_INTERCEPTOR } from '../interceptors/http-context-tokens';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private injector = inject(Injector);

  readonly API_URL = environment.apiUrl || 'http://localhost:3000';

  actualUser: WritableSignal<IUsuario | null> = signal<IUsuario | null>(null);
  isAuthenticated = computed(() => this.actualUser() !== null);

  constructor() {
    const storedUser = localStorage.getItem('usuarioActual');
    if (storedUser) {
      try {
        this.actualUser.set(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('usuarioActual');
      }
    }
  }

  /**
   * Envía la solicitud de registro multipart al backend.
   * Qué hace: Da de alta al usuario transmitiendo datos y archivo de imagen.
   * Cómo lo hace: Ejecuta http.post a /auth/registro pasando el FormData.
   */
  registro(formData: FormData): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/registro`, formData);
  }

  /**
   * Envía las credenciales para iniciar sesión.
   * Qué hace: Autentica al usuario y recibe la cookie HttpOnly emitida por el backend.
   * Cómo lo hace: Ejecuta http.post a /auth/login.
   */
  login(credentials: ILogin): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/login`, credentials);
  }

  /**
   * Valida la vigencia de la sesión en el inicio de la app.
   * Qué hace: Comprueba la cookie con el backend sin activar alertas 401 preventivas.
   * Cómo lo hace: Pasa el token SKIP_INTERCEPTOR en el HttpContext de la petición a /auth/autorizar.
   */
  autorizarSesion(): Observable<any> {
    return this.http.post(
      `${this.API_URL}/auth/autorizar`,
      {},
      {
        context: new HttpContext().set(SKIP_INTERCEPTOR, true)
      }
    );
  }

  /**
   * Solicita renovar el token JWT.
   * Qué hace: Extiende la cookie de sesión por otros 15 minutos.
   * Cómo lo hace: Ejecuta http.post a /auth/refrescar.
   */
  refrescarToken(): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/refrescar`, {});
  }

  /**
   * Actualiza el usuario autenticado.
   * Qué hace: Sincroniza la Signal actualUser y persiste el objeto en localStorage.
   * Cómo lo hace: Llama a actualUser.set() y localStorage.setItem().
   */
  setUsuarioActual(usuario: IUsuario): void {
    this.actualUser.set(usuario);
    localStorage.setItem('usuarioActual', JSON.stringify(usuario));
  }

  /**
   * Cierra la sesión activa.
   * Qué hace: Limpia estado local, timers y solicita al backend destruir la cookie.
   * Cómo lo hace: Borra localStorage, actualUser en null, invoca contadorService.limpiarTimers() y http.post a /auth/logout.
   */
  logout(): void {
    localStorage.removeItem('usuarioActual');
    this.actualUser.set(null);

    const contadorService = this.injector.get(ContadorService);
    contadorService.limpiarTimers();

    this.http.post(`${this.API_URL}/auth/logout`, {}).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}