import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { ModalService } from '../../shared/components/modal/modal.service';
import { environment } from '../../../environments/environment';

/**
 * Servicio encargado de monitorear el temporizador de sesión.
 * Qué hace: Mide los 10 minutos de la sesión, despliega un modal avisando que quedan 5 minutos y refresca o cierra sesión.
 * Cómo lo hace: Emplea setTimeout en cascada y coordina con modalService y authService.refrescarToken().
 */
@Injectable({
  providedIn: 'root'
})
export class ContadorService {
  private authService = inject(AuthService);
  private modalService = inject(ModalService);

  private timeout10Min: any = null;
  private timeout5Min: any = null;
  private modalAbierto: boolean = false;
  private sesionExpirada: boolean = false;

  // Duración total de la sesión, igual a SESION_MINUTOS del backend
  private readonly duracionSesionMs = (environment.sesionMinutos ?? 15) * 60 * 1000;

  /**
   * Inicializa el temporizador de 10 minutos.
   * Qué hace: Arranca la cuenta regresiva al validar la sesión o loguearse.
   * Cómo lo hace: Limpia timers previos y ejecuta setTimeout con un retardo de 10 minutos (600.000 ms).
   */
  iniciarTemporizador(): void {
    this.limpiarTimers();
    this.sesionExpirada = false;

    // Con 15 minutos de sesión el aviso sale a los 10 (2/3); con 2 minutos, a los 80 segundos
    const DIEZ_MINUTOS = this.duracionSesionMs * 2 / 3;

    this.timeout10Min = setTimeout(() => {
      this.mostrarAlertaExpiracion();
    }, DIEZ_MINUTOS);
  }

  /**
   * Muestra el modal de expiración de sesión (Sprint 3).
   * Qué hace: Advierte que restan 5 minutos de sesión antes del vencimiento total (token de 15 min).
   * Cómo lo hace: Abre un modal de confirmación; si se acepta solicita authService.refrescarToken(); si se rechaza
   * o transcurren 5 minutos sin respuesta, cierra el modal y ejecuta logout().
   */
  async mostrarAlertaExpiracion(): Promise<void> {
    if (this.modalAbierto) return;
    this.modalAbierto = true;

    // Tiempo restante hasta el vencimiento del token (1/3 de la sesión: 5 de 15 minutos)
    const CINCO_MINUTOS = this.duracionSesionMs / 3;
    const restante = CINCO_MINUTOS >= 60 * 1000
      ? `${Math.round(CINCO_MINUTOS / 60000)} minutos`
      : `${Math.round(CINCO_MINUTOS / 1000)} segundos`;

    this.timeout5Min = setTimeout(() => {
      this.sesionExpirada = true;
      this.modalService.close(false); // Cierra el modal que quedó abierto sin respuesta
      this.authService.logout();
    }, CINCO_MINUTOS);

    const respuesta = await this.modalService.confirmar({
      categoria: 'SESIÓN / SPRINT 3',
      titulo: '¿Seguimos aprendiendo?',
      mensaje: `Quedan ${restante} de sesión. ¿Deseas extenderla?`,
      textoConfirmar: 'Extender sesión',
      textoCancelar: 'Cerrar sesión',
      tipoIcono: 'timer',
      esPeligro: false
    });

    this.modalAbierto = false;

    // La sesión ya se cerró sola por inactividad: no hay nada más que hacer
    if (this.sesionExpirada) return;

    clearTimeout(this.timeout5Min);

    if (respuesta) {
      this.authService.refrescarToken().subscribe({
        next: () => this.iniciarTemporizador(),
        error: () => this.authService.logout()
      });
    } else {
      this.authService.logout();
    }
  }

  /**
   * Cancela los temporizadores en memoria.
   * Qué hace: Limpia timeouts activos para evitar fugas de memoria o modales huérfanos.
   * Cómo lo hace: Invoca clearTimeout sobre los IDs de temporizador activos.
   */
  limpiarTimers(): void {
    if (this.timeout10Min) {
      clearTimeout(this.timeout10Min);
      this.timeout10Min = null;
    }
    if (this.timeout5Min) {
      clearTimeout(this.timeout5Min);
      this.timeout5Min = null;
    }
    this.modalAbierto = false;
  }
}
