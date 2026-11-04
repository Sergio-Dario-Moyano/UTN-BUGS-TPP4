// DESTINO: src/app/pages/publicacion-detalle/publicacion-detalle.ts
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { ComentariosService } from '../../core/services/comentarios.service';
import { AuthService } from '../../core/services/auth.service';
import { IPublicacion } from '../../core/models/publicacion.interface';
import { IComentario } from '../../core/models/comentario.interface';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';

/**
 * Componente standalone para la visualización detallada de un post y sus comentarios (Sprint 3).
 * Qué hace: Permite ver el post completo, listar comentarios paginados, escribir nuevos comentarios,
 * editar los propios anunciando '(Editado)' y borrar los propios (o cualquiera si es administrador).
 * Cómo lo hace: Lee el parámetro :id de la ruta activa, consulta PublicacionesService y ComentariosService, y gestiona formularios reactivos.
 */
@Component({
  selector: 'app-publicacion-detalle',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    SpinnerComponent
  ],
  templateUrl: './publicacion-detalle.html',
  styleUrl: './publicacion-detalle.css'
})
export class PublicacionDetalle implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private publicacionesService = inject(PublicacionesService);
  private comentariosService = inject(ComentariosService);
  private auth = inject(AuthService);

  usuarioActual = computed(() => this.auth.actualUser());

  publicacion = signal<IPublicacion | null>(null);
  comentarios = signal<IComentario[]>([]);
  totalComentarios = signal<number>(0);

  loadingPost = signal<boolean>(true);
  loadingComentarios = signal<boolean>(false);
  enviandoComentario = signal<boolean>(false);
  mostrarSpinner = signal<boolean>(false);

  private offset = 0;
  private readonly limit = 4;
  hayMasComentarios = signal<boolean>(true);

  comentarioEnEdicionId = signal<string | null>(null);
  textoEdicionControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(150)]
  });

  nuevoComentarioForm = new FormGroup({
    texto: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)]
    })
  });

  /**
   * Signal computada que evalúa si el usuario autenticado dio like al post.
   * Qué hace: Devuelve true si el ID del usuario figura en el array meGustas.
   * Cómo lo hace: Comprueba la coincidencia sobre strings o instancias pobladas de ID.
   */
  dioMeGusta = computed(() => {
    const post = this.publicacion();
    const userId = this.usuarioActual()?._id;
    if (!post || !userId) return false;

    const likes = post.meGustas || [];
    return likes.some((item: any) => {
      const id = item?._id ?? item;
      return id?.toString() === userId.toString();
    });
  });

  /**
   * Signal computada que indica si el post pertenece al usuario autenticado.
   * Qué hace: Permite mostrar el enlace "Ver perfil" solo cuando el autor es el usuario en sesión.
   * Cómo lo hace: Compara publicacion().usuario._id con usuarioActual()._id.
   */
  esAutorPublicacion = computed(() => {
    const autorId = this.publicacion()?.usuario?._id;
    const userId = this.usuarioActual()?._id;
    return !!autorId && !!userId && autorId.toString() === userId.toString();
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarPublicacion(id);
      this.cargarComentarios(id, true);
    } else {
      this.router.navigate(['/publicaciones']);
    }
  }

  /**
   * Consulta el post por ID al backend.
   * Qué hace: Recupera el apunte y sus datos relacionados.
   * Cómo lo hace: Llama a publicacionesService.getById() y setea el Signal publicacion.
   */
 private cargarPublicacion(id: string): void {
  this.loadingPost.set(true);
  const temporizador = setTimeout(() => {
    if (this.loadingPost()) this.mostrarSpinner.set(true);
  }, 300);

  this.publicacionesService.getById(id).subscribe({
    next: (post) => {
      clearTimeout(temporizador);
      this.publicacion.set(post);
      this.loadingPost.set(false);
      this.mostrarSpinner.set(false);
    },
    error: () => {
      clearTimeout(temporizador);
      this.loadingPost.set(false);
      this.mostrarSpinner.set(false);
      this.router.navigate(['/publicaciones']);
    }
  });
}

  /**
   * Consulta los comentarios de la publicación con paginación.
   * Qué hace: Trae los comentarios de forma incremental según el límite establecido.
   * Cómo lo hace: Invoca comentariosService.listar() y actualiza el array de comentarios y el contador total.
   */
  cargarComentarios(publicacionId: string, reiniciar: boolean = false): void {
    if (reiniciar) {
      this.offset = 0;
    }
    this.loadingComentarios.set(true);

    this.comentariosService
      .listar(publicacionId, this.limit, this.offset)
      .subscribe({
        next: (res) => {
          const nuevos = res.comentarios || [];

          if (reiniciar) {
            this.comentarios.set(nuevos);
          } else {
            this.comentarios.update((prev) => [...prev, ...nuevos]);
          }

          this.totalComentarios.set(res.total ?? this.comentarios().length);
          this.offset += nuevos.length;
          this.hayMasComentarios.set(this.comentarios().length < this.totalComentarios());
          this.loadingComentarios.set(false);
        },
        error: () => {
          this.loadingComentarios.set(false);
        }
      });
  }

  /**
   * Solicita el siguiente lote de comentarios.
   * Qué hace: Incrementa la lista sin borrar los comentarios ya mostrados.
   * Cómo lo hace: Llama a cargarComentarios pasando reiniciar: false.
   */
  cargarMasComentarios(): void {
    const post = this.publicacion();
    if (post) {
      this.cargarComentarios(post._id, false);
    }
  }

  /**
   * Registra o remueve el Me Gusta del post actual.
   * Qué hace: Alterna el like y sincroniza el contador reactivamente.
   * Cómo lo hace: Llama a publicacionesService.darMeGusta o quitarMeGusta según dioMeGusta().
   */
  toggleLike(): void {
    const post = this.publicacion();
    const userId = this.usuarioActual()?._id;
    if (!post || !userId) return;

    const yaDioLike = this.dioMeGusta();

    if (yaDioLike) {
      this.publicacionesService.quitarMeGusta(post._id).subscribe({
        next: () => {
          this.publicacion.update((p) => {
            if (!p) return null;
            const meGustasActuales = p.meGustas || [];
            return {
              ...p,
              meGustas: meGustasActuales.filter((item: any) => {
                const id = item?._id ?? item;
                return id?.toString() !== userId.toString();
              }),
              cantidadMeGustas: Math.max(0, (p.cantidadMeGustas || 1) - 1)
            };
          });
        }
      });
    } else {
      this.publicacionesService.darMeGusta(post._id).subscribe({
        next: () => {
          this.publicacion.update((p) => {
            if (!p) return null;
            const meGustasActuales = p.meGustas || [];
            return {
              ...p,
              meGustas: [...meGustasActuales, userId],
              cantidadMeGustas: (p.cantidadMeGustas || 0) + 1
            };
          });
        }
      });
    }
  }

  /**
   * Envía un nuevo comentario al post.
   * Qué hace: Agrega el comentario al principio del hilo y actualiza los contadores.
   * Cómo lo hace: Invoca comentariosService.crear() con el texto y resetea el formulario reactivo.
   */
  enviarComentario(): void {
    if (this.nuevoComentarioForm.invalid) {
      this.nuevoComentarioForm.markAllAsTouched();
      return;
    }

    const post = this.publicacion();
    const idDeRuta = this.route.snapshot.paramMap.get('id');
    const postIdentificador = post?._id || idDeRuta;

    if (!postIdentificador) return;

    const texto = this.nuevoComentarioForm.controls.texto.value?.trim();
    if (!texto) return;

    this.enviandoComentario.set(true);

    this.comentariosService.crear(postIdentificador, texto).subscribe({
      next: (nuevoComentario) => {
        this.enviandoComentario.set(false);
        this.nuevoComentarioForm.reset({ texto: '' });

        this.comentarios.update((lista) => [nuevoComentario, ...lista]);
        this.offset += 1; // Mantiene alineada la paginación con el comentario recién creado
        this.totalComentarios.update((t) => t + 1);
        this.hayMasComentarios.set(this.comentarios().length < this.totalComentarios());

        this.publicacion.update((p) => {
          if (!p) return null;
          return {
            ...p,
            cantidadComentarios: (p.cantidadComentarios || 0) + 1
          };
        });
      },
      error: () => {
        this.enviandoComentario.set(false);
      }
    });
  }

  /**
   * Inicia el modo de edición en línea de un comentario.
   * Qué hace: Activa el textarea con el texto original del comentario.
   * Cómo lo hace: Setea el ID en comentarioEnEdicionId y asigna el valor al control.
   */
  iniciarEdicion(comentario: IComentario): void {
    this.comentarioEnEdicionId.set(comentario._id);
    this.textoEdicionControl.setValue(comentario.texto);
  }

  /**
   * Cancela la edición en línea del comentario.
   * Qué hace: Vuelve a mostrar el texto original del comentario.
   * Cómo lo hace: Pone en null comentarioEnEdicionId y resetea el control.
   */
  cancelarEdicion(): void {
    this.comentarioEnEdicionId.set(null);
    this.textoEdicionControl.reset();
  }

  /**
   * Guarda los cambios de un comentario editado (Sprint 3).
   * Qué hace: Modifica el mensaje, descarta textos en blanco y marca que fue modificado.
   * Cómo lo hace: Llama a comentariosService.actualizar() y actualiza el Signal del comentario con modificado: true.
   */
  guardarEdicion(comentarioId: string): void {
    if (this.textoEdicionControl.invalid) return;

    const nuevoTexto = this.textoEdicionControl.value.trim();
    if (!nuevoTexto) return;

    this.comentariosService.actualizar(comentarioId, nuevoTexto).subscribe({
      next: () => {
        this.comentarios.update((lista) =>
          lista.map((c) => (c._id === comentarioId ? { ...c, texto: nuevoTexto, modificado: true } : c))
        );
        this.cancelarEdicion();
      }
    });
  }

  /**
   * Elimina un comentario (baja lógica).
   * Qué hace: Remueve el comentario del hilo y decrementa los contadores.
   * Cómo lo hace: Invoca comentariosService.eliminar() y actualiza los Signals locales.
   */
  eliminarComentario(comentarioId: string): void {
    this.comentariosService.eliminar(comentarioId).subscribe({
      next: () => {
        this.comentarios.update((lista) => lista.filter((c) => c._id !== comentarioId));
        this.offset = Math.max(0, this.offset - 1);
        this.totalComentarios.update((t) => Math.max(0, t - 1));
        this.hayMasComentarios.set(this.comentarios().length < this.totalComentarios());

        this.publicacion.update((p) => {
          if (!p) return null;
          return { ...p, cantidadComentarios: Math.max(0, p.cantidadComentarios - 1) };
        });
      }
    });
  }

  /**
   * Comprueba si el usuario autenticado es el autor del comentario.
   * Qué hace: Controla la visibilidad del botón de edición.
   * Cómo lo hace: Compara usuarioActual()._id contra comentario.usuario._id.
   */
  esAutorComentario(comentario: IComentario): boolean {
    return this.usuarioActual()?._id === comentario.usuario?._id;
  }

  /**
   * Comprueba si el usuario puede dar de baja un comentario.
   * Qué hace: Habilita el botón de eliminar para el autor o para un administrador.
   * Cómo lo hace: Combina esAutorComentario() con la verificación del perfil 'administrador'.
   */
  puedeEliminarComentario(comentario: IComentario): boolean {
    return this.esAutorComentario(comentario) || this.usuarioActual()?.perfil === 'administrador';
  }
}

