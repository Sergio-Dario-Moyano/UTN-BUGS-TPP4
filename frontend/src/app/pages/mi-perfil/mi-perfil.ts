
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { ComentariosService } from '../../core/services/comentarios.service';
import { ModalService } from '../../shared/components/modal/modal.service';
import { IPublicacion } from '../../core/models/publicacion.interface';
import { IComentario } from '../../core/models/comentario.interface';
import { PublicacionCardComponent } from '../publicaciones/components/publicacion-card/publicacion-card.component';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';

/**
 * Componente standalone que representa la pantalla 'Mi Perfil' (Sprint 2).
 * Qué hace: Muestra los datos del perfil activo y lista sus últimas 3 publicaciones junto con sus comentarios recientes.
 * Cómo lo hace: Lee el usuario de AuthService, consulta PublicacionesService con offset: 0, limit: 3 y usuarioId,
 * y con forkJoin pide a ComentariosService los comentarios de cada una.
 */
@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [
    RouterLink,
    PublicacionCardComponent,
    DatePipe,
    SpinnerComponent
  ],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.css'
})
export class MiPerfil implements OnInit {
  private auth = inject(AuthService);
  private publicacionesService = inject(PublicacionesService);
  private comentariosService = inject(ComentariosService);
  private modalService = inject(ModalService);

  usuarioActual = computed(() => this.auth.actualUser());
  ultimasPublicaciones = signal<IPublicacion[]>([]);
  comentariosPorPost = signal<Record<string, IComentario[]>>({});
  loading = signal<boolean>(true);

  ngOnInit(): void {
    this.cargarMisPublicaciones();
  }

  /**
   * Consulta las publicaciones del usuario autenticado.
   * Qué hace: Trae estrictamente las últimas 3 publicaciones ordenadas por fecha (Requisito Sprint 2).
   * Cómo lo hace: Llama a publicacionesService.listar(0, 3, 'fecha', usuario._id), guarda el resultado y pide sus comentarios.
   */
  cargarMisPublicaciones(): void {
    const usuario = this.usuarioActual();
    if (!usuario) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    this.publicacionesService
      .listar(0, 3, 'fecha', usuario._id)
      .subscribe({
        next: (res) => {
          const posts = res.publicaciones || [];
          this.ultimasPublicaciones.set(posts);
          this.cargarComentarios(posts);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      });
  }

  /**
   * Trae los comentarios más recientes de cada publicación mostrada.
   * Qué hace: Completa el requisito de mostrar las últimas 3 publicaciones con sus comentarios.
   * Cómo lo hace: Ejecuta forkJoin con comentariosService.listar(id, 3, 0) por cada post y arma un mapa id -> comentarios.
   */
  private cargarComentarios(posts: IPublicacion[]): void {
    if (posts.length === 0) {
      this.comentariosPorPost.set({});
      return;
    }

    forkJoin(posts.map((p) => this.comentariosService.listar(p._id, 3, 0))).subscribe({
      next: (resultados) => {
        const mapa: Record<string, IComentario[]> = {};
        posts.forEach((p, i) => (mapa[p._id] = resultados[i].comentarios || []));
        this.comentariosPorPost.set(mapa);
      }
    });
  }

  /**
   * Registra o quita el Me Gusta en una publicación propia.
   * Qué hace: Alterna el like y recalcula cantidadMeGustas localmente.
   * Cómo lo hace: Comprueba la existencia previa de userId en post.meGustas y llama a darMeGusta() o quitarMeGusta().
   */
  onToggleLike(publicacionId: string): void {
    const post = this.ultimasPublicaciones().find((p) => p._id === publicacionId);
    const userId = this.usuarioActual()?._id;
    if (!post || !userId) return;

    const yaDioLike = (post.meGustas || []).some((item: any) => {
      const id = item?._id ?? item;
      return id?.toString() === userId.toString();
    });

    if (yaDioLike) {
      this.publicacionesService.quitarMeGusta(publicacionId).subscribe({
        next: () => {
          this.ultimasPublicaciones.update((posts) =>
            posts.map((p) =>
              p._id === publicacionId
                ? {
                    ...p,
                    meGustas: p.meGustas.filter((item: any) => (item?._id ?? item)?.toString() !== userId.toString()),
                    cantidadMeGustas: Math.max(0, p.cantidadMeGustas - 1)
                  }
                : p
            )
          );
        }
      });
    } else {
      this.publicacionesService.darMeGusta(publicacionId).subscribe({
        next: () => {
          this.ultimasPublicaciones.update((posts) =>
            posts.map((p) =>
              p._id === publicacionId
                ? { ...p, meGustas: [...p.meGustas, userId], cantidadMeGustas: p.cantidadMeGustas + 1 }
                : p
            )
          );
        }
      });
    }
  }

  /**
   * Procesa la baja lógica de una publicación propia (Sprint 2).
   * Qué hace: Abre el modal de confirmación y, tras la aprobación, da de baja el post y recarga las últimas 3.
   * Cómo lo hace: Invoca modalService.confirmar(), ejecuta publicacionesService.eliminar() y vuelve a llamar a cargarMisPublicaciones().
   */
  async onEliminarPublicacion(publicacion: IPublicacion): Promise<void> {
    const confirmado = await this.modalService.confirmar({
      categoria: 'MODERACIÓN / CONFIRMACIÓN',
      titulo: 'Dar de baja publicación',
      mensaje: 'La publicación dejará de estar visible en la comunidad. Esta acción no elimina tu cuenta.',
      infoSecundaria: {
        titulo: publicacion.titulo,
        subtitulo: `@${publicacion.usuario?.nombreUsuario} · ${publicacion.cantidadMeGustas} Me Gusta · ${publicacion.cantidadComentarios} comentarios`
      },
      textoConfirmar: 'Dar de baja publicación',
      textoCancelar: 'Cancelar',
      tipoIcono: 'trash',
      esPeligro: true
    });

    if (confirmado) {
      this.publicacionesService.eliminar(publicacion._id).subscribe({
        next: () => this.cargarMisPublicaciones()
      });
    }
  }
}

