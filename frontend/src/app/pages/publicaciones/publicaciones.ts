
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../shared/components/modal/modal.service';
import { IPublicacion } from '../../core/models/publicacion.interface';
import { PublicacionCardComponent } from './components/publicacion-card/publicacion-card.component';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';

/**
 * Componente principal del feed de publicaciones (Sprint 2).
 * Qué hace: Permite dar de alta posts con imagen opcional, ordenarlos por fecha o por cantidad de me gusta, paginarlos y darlos de baja mediante modal.
 * Cómo lo hace: Emplea Signals para el listado reactivo y paginación incremental (offset/limit) con el total real que devuelve el backend.
 */
@Component({
  selector: 'app-publicaciones',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PublicacionCardComponent,
    SpinnerComponent
  ],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.css'
})
export class Publicaciones implements OnInit {
  private publicacionesService = inject(PublicacionesService);
  private auth = inject(AuthService);
  private modalService = inject(ModalService);

  usuarioActual = computed(() => this.auth.actualUser());
  publicaciones = signal<IPublicacion[]>([]);

  loadingInicial = signal<boolean>(true);
  loadingMas = signal<boolean>(false);
  creandoPost = signal<boolean>(false);

  ordenActivo = signal<'fecha' | 'meGustas'>('fecha');

  private offset = 0;
  private readonly limit = 5;
  hayMasPublicaciones = signal<boolean>(true);
  totalRegistrado = signal<number>(0);

  archivoSeleccionado: File | null = null;
  nombreArchivo = signal<string | null>(null);

  publicacionForm = new FormGroup({
    titulo: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)]
    }),
    descripcion: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)]
    })
  });

  ngOnInit(): void {
    this.cargarPublicaciones(true);
  }

  /**
   * Cambia el criterio de ordenamiento del feed (Sprint 2).
   * Qué hace: Alterna entre ordenar por fecha o por cantidad de Me Gusta y reinicia la lista.
   * Cómo lo hace: Actualiza la Signal ordenActivo y llama a cargarPublicaciones(true).
   */
  cambiarOrden(nuevoOrden: 'fecha' | 'meGustas'): void {
    if (this.ordenActivo() === nuevoOrden) return;
    this.ordenActivo.set(nuevoOrden);
    this.cargarPublicaciones(true);
  }

  /**
   * Consulta las publicaciones al backend NestJS.
   * Qué hace: Trae las publicaciones activas paginadas según offset y limit.
   * Cómo lo hace: Invoca publicacionesService.listar(), concatena o reemplaza el array y compara lo cargado contra el total del backend.
   */
  cargarPublicaciones(reiniciar: boolean = false): void {
    if (reiniciar) {
      this.offset = 0;
      this.loadingInicial.set(true);
    } else {
      this.loadingMas.set(true);
    }

    this.publicacionesService
      .listar(this.offset, this.limit, this.ordenActivo())
      .subscribe({
        next: (res) => {
          const nuevas = res.publicaciones || [];

          if (reiniciar) {
            this.publicaciones.set(nuevas);
          } else {
            this.publicaciones.update((actuales) => [...actuales, ...nuevas]);
          }

          this.offset += nuevas.length;
          this.totalRegistrado.set(res.total ?? this.publicaciones().length);
          this.hayMasPublicaciones.set(nuevas.length > 0 && this.offset < this.totalRegistrado());

          this.loadingInicial.set(false);
          this.loadingMas.set(false);
        },
        error: () => {
          this.loadingInicial.set(false);
          this.loadingMas.set(false);
        }
      });
  }

  /**
   * Captura el archivo de imagen para el nuevo apunte.
   * Qué hace: Almacena la referencia física del archivo seleccionado.
   * Cómo lo hace: Lee input.files[0], setea las Signals correspondientes y limpia el input para poder reelegir el mismo archivo.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.archivoSeleccionado = file;
      this.nombreArchivo.set(file.name);
    }
    input.value = '';
  }

  /**
   * Cancela la selección del archivo adjunto.
   * Qué hace: Limpia la imagen seleccionada del formulario.
   * Cómo lo hace: Resetea archivoSeleccionado y nombreArchivo a null.
   */
  quitarArchivo(): void {
    this.archivoSeleccionado = null;
    this.nombreArchivo.set(null);
  }

  /**
   * Envía el formulario para crear una nueva publicación (Sprint 2).
   * Qué hace: Ensambla el FormData con título, descripción y archivo opcional, y crea el post en el backend.
   * Cómo lo hace: Llama a publicacionesService.crear(); si el orden es por fecha inserta el post al inicio, si no recarga el feed.
   * Ante un error muestra el motivo en un modal.
   */
  onSubmit(): void {
    if (this.publicacionForm.invalid) {
      this.publicacionForm.markAllAsTouched();
      return;
    }

    this.creandoPost.set(true);
    const { titulo, descripcion } = this.publicacionForm.getRawValue();

    const formData = new FormData();
    formData.append('titulo', titulo.trim());
    formData.append('descripcion', descripcion.trim());

    if (this.archivoSeleccionado) {
      formData.append('file', this.archivoSeleccionado);
    }

    this.publicacionesService.crear(formData).subscribe({
      next: (res) => {
        this.creandoPost.set(false);
        this.publicacionForm.reset();
        this.quitarArchivo();

        if (res.publicacion && this.ordenActivo() === 'fecha') {
          this.publicaciones.update((posts) => [res.publicacion, ...posts]);
          this.offset += 1;
          this.totalRegistrado.update((t) => t + 1);
          this.hayMasPublicaciones.set(this.offset < this.totalRegistrado());
        } else {
          this.cargarPublicaciones(true);
        }
      },
      error: (err) => {
        this.creandoPost.set(false);
        const msg = err?.error?.message;
        this.modalService.alerta({
          categoria: 'PUBLICACIÓN / ERROR',
          titulo: 'No se pudo publicar',
          mensaje: Array.isArray(msg) ? msg.join(' ') : (msg ?? 'Intentá de nuevo en unos instantes.'),
          textoConfirmar: 'Entendido',
          tipoIcono: 'alert',
          esPeligro: true
        });
      }
    });
  }

  /**
   * Alterna el estado de Me Gusta en una publicación (Sprint 2).
   * Qué hace: Registra o elimina el like del usuario y actualiza cantidadMeGustas.
   * Cómo lo hace: Verifica si el usuario ya dio like y llama a darMeGusta() o quitarMeGusta() de PublicacionesService.
   */
  onToggleLike(publicacionId: string): void {
    const post = this.publicaciones().find((p) => p._id === publicacionId);
    if (!post) return;

    const userId = this.usuarioActual()?._id;
    if (!userId) return;

    const yaDioLike = (post.meGustas || []).some((item: any) => {
      const id = item?._id ?? item;
      return id?.toString() === userId.toString();
    });

    if (yaDioLike) {
      this.publicacionesService.quitarMeGusta(publicacionId).subscribe({
        next: () => {
          this.publicaciones.update((posts) =>
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
          this.publicaciones.update((posts) =>
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
   * Abre el modal y procesa la baja lógica de la publicación (Sprint 2).
   * Qué hace: Solicita confirmación en un modal estilizado y, tras aceptar, remueve el post del feed.
   * Cómo lo hace: Llama a modalService.confirmar(), luego a publicacionesService.eliminar(), filtra el post y ajusta offset y total.
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
        next: () => {
          this.publicaciones.update((posts) => posts.filter((p) => p._id !== publicacion._id));
          this.offset = Math.max(0, this.offset - 1);
          this.totalRegistrado.update((t) => Math.max(0, t - 1));
          this.hayMasPublicaciones.set(this.offset < this.totalRegistrado());
        }
      });
    }
  }
}
