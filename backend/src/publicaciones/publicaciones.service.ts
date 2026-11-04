// DESTINO: src/publicaciones/publicaciones.service.ts
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PublicacionesRepository } from './publicaciones.repository.js';
import { CreatePublicacionDto } from './dto/create-publicacion.dto.js';
import { QueryPublicacionDto } from './dto/query-publicacion.dto.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { RolUsuario } from '../usuarios/schemas/usuario.schema.js';

@Injectable()
export class PublicacionesService {
  constructor(
    private readonly publicacionesRepository: PublicacionesRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly usuariosService: UsuariosService,
  ) {}

  /**
   * Da de alta una publicación asociando al usuario logueado.
   * Qué hace: Sube imagen a Cloudinary (si existe) y guarda el post en MongoDB.
   * Cómo lo hace: Si file está definido, usa cloudinaryService.subirImagen(); luego arma payload y llama al repositorio.
   */
  async crear(createDto: CreatePublicacionDto, usuarioId: string, file?: Express.Multer.File) {
    let imagenUrl: string | undefined = undefined;

    if (file) {
      const upload = await this.cloudinaryService.subirImagen(file, 'publicaciones');
      imagenUrl = upload?.secure_url;
    }

    const payload = {
      usuario: usuarioId,
      titulo: createDto.titulo,
      descripcion: createDto.descripcion,
      imagenUrl,
    };

    return this.publicacionesRepository.crear(payload);
  }

  /**
   * Lista publicaciones activas según filtros y devuelve el total.
   * Qué hace: Aplica orden y paginación y calcula cuántas publicaciones activas existen en total.
   * Cómo lo hace: Ejecuta en paralelo repository.listar() y repository.contar().
   */
  async listar(queryDto: QueryPublicacionDto) {
    const [publicaciones, total] = await Promise.all([
      this.publicacionesRepository.listar(queryDto),
      this.publicacionesRepository.contar(queryDto.usuarioId),
    ]);
    return { publicaciones, total };
  }

  /**
   * Da de baja lógica una publicación.
   * Qué hace: Permite la baja solo si quien lo solicita es el autor del post o un administrador.
   * Cómo lo hace: Busca la publicación, recupera al solicitante y compara autor/rol; si no corresponde lanza 403.
   */
  async darDeBaja(id: string, usuarioId: string) {
    const publicacion = await this.publicacionesRepository.buscarPorId(id);

    if (!publicacion) {
      throw new NotFoundException('Publicación no encontrada');
    }

    const usuarioQueBorra = await this.usuariosService.findOne(usuarioId);
    if (!usuarioQueBorra) {
      throw new UnauthorizedException('Usuario inexistente o no válido');
    }

    const idAutor = (publicacion.usuario as any)?._id?.toString() || publicacion.usuario.toString();
    if (idAutor !== usuarioId && usuarioQueBorra.perfil !== RolUsuario.ADMIN) {
      throw new ForbiddenException('No tenés permiso para eliminar esta publicación');
    }

    return this.publicacionesRepository.darDeBaja(id);
  }

  /**
   * Registra un Me Gusta en la publicación.
   * Qué hace: Añade el like atómicamente si el usuario aún no lo había dado.
   * Cómo lo hace: Llama a publicacionesRepository.darMeGusta(); si no encuentra el post activo lanza 404.
   */
  async darMeGusta(id: string, usuarioId: string) {
    const publicacion = await this.publicacionesRepository.darMeGusta(id, usuarioId);
    if (!publicacion) throw new NotFoundException('Publicación no encontrada o ya le diste Me Gusta');
    return publicacion;
  }

  /**
   * Quita un Me Gusta de la publicación.
   * Qué hace: Remueve el like del usuario y actualiza el contador.
   * Cómo lo hace: Llama a publicacionesRepository.quitarMeGusta(); si no existía el like previo lanza 404.
   */
  async quitarMeGusta(id: string, usuarioId: string) {
    const publicacion = await this.publicacionesRepository.quitarMeGusta(id, usuarioId);
    if (!publicacion) throw new NotFoundException('Publicación no encontrada o no tenías Me Gusta previo');
    return publicacion;
  }

  /**
   * Vincula un nuevo comentario a la publicación.
   * Qué hace: Agrega el ID del comentario e incrementa su contador en el documento del post.
   * Cómo lo hace: Invoca publicacionesRepository.agregarComentario().
   */
  async agregarComentario(publicacionId: string, comentarioId: string) {
    const publicacion = await this.publicacionesRepository.agregarComentario(publicacionId, comentarioId);
    if (!publicacion) throw new NotFoundException('Publicación no encontrada');
    return publicacion;
  }

  /**
   * Desvincula un comentario de la publicación.
   * Qué hace: Remueve el ID del comentario y decrementa su contador.
   * Cómo lo hace: Invoca publicacionesRepository.eliminarComentario().
   */
  async eliminarComentario(publicacionId: string, comentarioId: string) {
    const publicacion = await this.publicacionesRepository.eliminarComentario(publicacionId, comentarioId);
    if (!publicacion) throw new NotFoundException('Publicación no encontrada');
    return publicacion;
  }

  /**
   * Obtiene una publicación por su identificador.
   * Qué hace: Recupera los datos de un post activo.
   * Cómo lo hace: Invoca publicacionesRepository.buscarPorId().
   */
  async buscarPorId(id: string) {
    const publicacion = await this.publicacionesRepository.buscarPorId(id);
    if (!publicacion) throw new NotFoundException('Publicación no encontrada');
    return publicacion;
  }
}
