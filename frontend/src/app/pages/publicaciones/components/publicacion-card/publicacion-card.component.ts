import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { IPublicacion } from '../../../../core/models/publicacion.interface';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Componente standalone que representa individualmente una tarjeta de post en el feed (Sprint 2).
 * Qué hace: Muestra autor, contenido, imagen y contadores; permite alternar Me Gusta y pedir la baja lógica
 * de posts propios (o de cualquier post si el usuario es administrador).
 * Cómo lo hace: Recibe la publicación vía Signal input(), valida autoría o rol contra el usuario en sesión
 * y emite eventos hacia el componente padre.
 */
@Component({
  selector: 'app-publicacion-card',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './publicacion-card.component.html',
  styleUrl: './publicacion-card.component.css'
})
export class PublicacionCardComponent {
  private auth = inject(AuthService);

  publicacion = input.required<IPublicacion>();

  onLikeToggle = output<string>();
  onEliminar = output<IPublicacion>();

  usuarioActual = computed(() => this.auth.actualUser());

  /**
   * Determina si el usuario logueado ya dio Me Gusta a esta publicación.
   * Qué hace: Comprueba la presencia del ID de usuario en el array meGustas.
   * Cómo lo hace: Valida comparando strings u objetos de ID.
   */
  dioMeGusta = computed(() => {
    const userId = this.usuarioActual()?._id;
    if (!userId) return false;
    const likes = this.publicacion().meGustas || [];
    return likes.some((item: any) => {
      const id = item?._id ?? item;
      return id?.toString() === userId.toString();
    });
  });

  /**
   * Comprueba si el usuario puede dar de baja la publicación (Sprint 2).
   * Qué hace: Habilita el botón de eliminación para el autor o para un administrador.
   * Cómo lo hace: Evalúa user.perfil === 'administrador' o compara usuarioActual()._id con el autor del post.
   */
  puedeEliminar = computed(() => {
    const user = this.usuarioActual();
    if (!user) return false;
    if (user.perfil === 'administrador') return true;
    const autorId = (this.publicacion().usuario as any)?._id || this.publicacion().usuario;
    return autorId?.toString() === user._id?.toString();
  });

  /**
   * Emite el ID de la publicación para registrar o quitar Me Gusta.
   * Qué hace: Dispara la actualización del like en el servicio.
   * Cómo lo hace: Ejecuta onLikeToggle.emit(this.publicacion()._id).
   */
  toggleLike(): void {
    this.onLikeToggle.emit(this.publicacion()._id);
  }

  /**
   * Emite la publicación para disparar el modal confirmatorio de baja lógica.
   * Qué hace: Notifica al feed padre para abrir el modal del sistema.
   * Cómo lo hace: Ejecuta onEliminar.emit(this.publicacion()).
   */
  solicitarEliminacion(): void {
    this.onEliminar.emit(this.publicacion());
  }
}

