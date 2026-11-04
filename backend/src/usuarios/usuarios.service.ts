import { Injectable } from '@nestjs/common';
import { UsuariosRepository } from './usuarios.repository.js';
import { UsuarioDocument } from './schemas/usuario.schema.js';

@Injectable()
export class UsuariosService {
  constructor(private readonly usuariosRepository: UsuariosRepository) {}

  /**
   * Elimina la propiedad 'password' antes de exponer los datos del usuario.
   * Qué hace: Evita que el hash de la contraseña viaje en las respuestas de la API.
   * Cómo lo hace: Convierte el documento a un objeto literal plano de JavaScript y aplica delete obj.password.
   */
  sanitizarUsuario(usuario: any) {
    const obj = usuario.toObject ? usuario.toObject() : { ...usuario };
    delete obj.password;
    return obj;
  }

  /**
   * Crea un usuario en la persistencia.
   * Qué hace: Delega la inserción al repositorio.
   * Cómo lo hace: Invoca usuariosRepository.create con el payload recibido.
   */
  async create(datos: any): Promise<UsuarioDocument> {
    return this.usuariosRepository.create(datos);
  }

  /**
   * Busca un usuario por ID.
   * Qué hace: Recupera un documento por su clave primaria.
   * Cómo lo hace: Consulta al repositorio findById.
   */
  async findOne(id: string): Promise<UsuarioDocument | null> {
    return this.usuariosRepository.findById(id);
  }

  /**
   * Busca una cuenta por credencial (correo o alias).
   * Qué hace: Obtiene el usuario con su password para comparar el login.
   * Cómo lo hace: Consulta al repositorio findByCorreoONombreUsuario.
   */
  async findByCorreoONombreUsuario(correo: string, nombreUsuario?: string): Promise<UsuarioDocument | null> {
    return this.usuariosRepository.findByCorreoONombreUsuario(correo, nombreUsuario);
  }
}