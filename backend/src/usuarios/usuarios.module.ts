import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Usuario, UsuarioSchema } from './schemas/usuario.schema.js';
import { UsuariosService } from './usuarios.service.js';
import { UsuariosRepository } from './usuarios.repository.js';

/**
 * Módulo de usuarios.
 * Qué hace: Registra el esquema de Usuario en Mongoose y exporta el servicio y repositorio.
 * Cómo lo hace: Usa MongooseModule.forFeature y define los providers necesarios para que Auth y Publicaciones los consuman.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }]),
  ],
  providers: [UsuariosService, UsuariosRepository],
  exports: [UsuariosService, UsuariosRepository],
})
export class UsuariosModule {}