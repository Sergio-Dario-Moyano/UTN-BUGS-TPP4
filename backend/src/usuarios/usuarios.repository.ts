import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema.js';

@Injectable()
export class UsuariosRepository {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<UsuarioDocument>,
  ) {}

  /**
   * Guarda un nuevo usuario en la base de datos.
   * Qué hace: Persiste el documento en MongoDB y devuelve la instancia creada.
   * Cómo lo hace: Instancia el modelo inyectado con los datos provistos y ejecuta save().
   */
  async create(datos: any): Promise<UsuarioDocument> {
    const nuevoUsuario = new this.usuarioModel(datos);
    return nuevoUsuario.save();
  }

  /**
   * Busca un usuario por su identificador primario _id.
   * Qué hace: Devuelve el usuario activo o null si no existe.
   * Cómo lo hace: Ejecuta findById() sobre el modelo de Mongoose.
   */
  async findById(id: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel.findById(id).exec();
  }

  /**
   * Busca un usuario por correo o por alias, incluyendo la contraseña oculta.
   * Qué hace: Permite autenticar al usuario sin importar si ingresó su email o su nombre de usuario.
   * Cómo lo hace: Ejecuta findOne con el operador $or en minúsculas y añade explícitamente select('+password').
   */
  async findByCorreoONombreUsuario(correo: string, nombreUsuario?: string): Promise<UsuarioDocument | null> {
    const query = nombreUsuario
      ? { $or: [{ correo: correo.toLowerCase() }, { nombreUsuario: nombreUsuario.toLowerCase() }] }
      : { $or: [{ correo: correo.toLowerCase() }, { nombreUsuario: correo.toLowerCase() }] };

    return this.usuarioModel.findOne(query).select('+password').exec();
  }
}