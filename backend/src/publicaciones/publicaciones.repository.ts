import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Publicacion, PublicacionDocument } from './schemas/publicacion.schema.js';
import { QueryPublicacionDto } from './dto/query-publicacion.dto.js';

@Injectable()
export class PublicacionesRepository {
  constructor(
    @InjectModel(Publicacion.name) private readonly publicacionModel: Model<PublicacionDocument>,
  ) {}

  /**
   * Guarda una nueva publicación y puebla el autor.
   * Qué hace: Persiste el documento en MongoDB y devuelve los datos públicos del creador.
   * Cómo lo hace: Ejecuta publicacionModel.create() y popula campos seguros de 'usuario'.
   */
  async crear(payload: any): Promise<PublicacionDocument> {
    const nuevaPublicacion = await this.publicacionModel.create(payload);
    return nuevaPublicacion.populate('usuario', 'nombre apellido nombreUsuario imagen');
  }

  /**
   * Lista publicaciones con filtros, orden y paginación.
   * Qué hace: Devuelve las publicaciones activas aplicando skip, limit y orden ('fecha' o 'meGustas').
   * Cómo lo hace: Construye un filtro con activo: true, aplica find(), sort(), skip(), limit() y populate().
   */
  async listar(queryDto: QueryPublicacionDto): Promise<PublicacionDocument[]> {
    const { offset, limit, orden, usuarioId } = queryDto;
    const filtro: any = { activo: true };

    if (usuarioId) {
      filtro.usuario = usuarioId;
    }

    const sortParams: any =
      orden === 'meGustas'
        ? { cantidadMeGustas: -1, createdAt: -1 }
        : { createdAt: -1 };

    return this.publicacionModel
      .find(filtro)
      .sort(sortParams)
      .skip(offset ?? 0)
      .limit(limit ?? 10)
      .populate('usuario', 'nombre apellido nombreUsuario imagen descripcion')
      .exec();
  }


    /**
   * Cuenta las publicaciones activas.
   * Qué hace: Devuelve el total (opcionalmente de un usuario) para que el feed sepa cuándo no hay más.
   * Cómo lo hace: Ejecuta countDocuments con activo: true y, si corresponde, el filtro por usuario.
   */
  async contar(usuarioId?: string): Promise<number> {
    const filtro: any = { activo: true };
    if (usuarioId) filtro.usuario = usuarioId;
    return this.publicacionModel.countDocuments(filtro).exec();
  }


  /**
   * Busca una publicación activa por ID.
   * Qué hace: Recupera un post específico con su autor poblado.
   * Cómo lo hace: Ejecuta findOne({ _id: id, activo: true }) junto a populate().
   */
  async buscarPorId(id: string): Promise<PublicacionDocument | null> {
    return this.publicacionModel
      .findOne({ _id: id, activo: true })
      .populate('usuario', 'nombre apellido nombreUsuario imagen descripcion')
      .exec();
  }

  /**
   * Aplica baja lógica sobre una publicación.
   * Qué hace: Oculta la publicación de listados marcando activo: false.
   * Cómo lo hace: Ejecuta findByIdAndUpdate(id, { activo: false }).
   */
  async darDeBaja(id: string): Promise<PublicacionDocument | null> {
    return this.publicacionModel
      .findByIdAndUpdate(id, { activo: false }, { returnDocument: 'after' })
      .exec();
  }

  /**
   * Añade un "Me gusta" asegurando que sea único por usuario.
   * Qué hace: Agrega el ID del usuario al array meGustas e incrementa el contador cantidadMeGustas.
   * Cómo lo hace: Ejecuta findOneAndUpdate con condición meGustas: { $ne: usuarioId } y operadores $push e $inc.
   */
  async darMeGusta(publicacionId: string, usuarioId: string) {
    return this.publicacionModel
      .findOneAndUpdate(
        { _id: publicacionId, activo: true, meGustas: { $ne: usuarioId } },
        {
          $push: { meGustas: usuarioId },
          $inc: { cantidadMeGustas: 1 },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /**
   * Quita un "Me gusta" previo de un usuario.
   * Qué hace: Remueve el ID del usuario del array meGustas y decrementa cantidadMeGustas.
   * Cómo lo hace: Ejecuta findOneAndUpdate con condición meGustas: usuarioId y operadores $pull e $inc.
   */
  async quitarMeGusta(publicacionId: string, usuarioId: string) {
    return this.publicacionModel
      .findOneAndUpdate(
        { _id: publicacionId, activo: true, meGustas: usuarioId },
        {
          $pull: { meGustas: usuarioId },
          $inc: { cantidadMeGustas: -1 },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /**
   * Agrega un comentario a la publicación y suma 1 al contador.
   * Qué hace: Vincula el ID del comentario recién creado y actualiza cantidadComentarios.
   * Cómo lo hace: Ejecuta findByIdAndUpdate con operadores $push e $inc.
   */
  async agregarComentario(publicacionId: string, comentarioId: string) {
    return this.publicacionModel
      .findByIdAndUpdate(
        publicacionId,
        {
          $push: { comentarios: comentarioId },
          $inc: { cantidadComentarios: 1 },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /**
   * Remueve un comentario de la publicación y resta 1 al contador.
   * Qué hace: Desvincula el ID del comentario dado de baja y actualiza cantidadComentarios.
   * Cómo lo hace: Ejecuta findByIdAndUpdate con operadores $pull e $inc.
   */
  async eliminarComentario(publicacionId: string, comentarioId: string) {
    return this.publicacionModel
      .findByIdAndUpdate(
        publicacionId,
        {
          $pull: { comentarios: comentarioId },
          $inc: { cantidadComentarios: -1 },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }
}