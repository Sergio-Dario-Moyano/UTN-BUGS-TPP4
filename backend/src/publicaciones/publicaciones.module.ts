import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Publicacion, PublicacionSchema } from './schemas/publicacion.schema.js';
import { PublicacionesService } from './publicaciones.service.js';
import { PublicacionesController } from './publicaciones.controller.js';
import { PublicacionesRepository } from './publicaciones.repository.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { ComentariosModule } from '../comentarios/comentarios.module.js';

/**
 * Módulo de Publicaciones.
 * Qué hace: Declara el esquema de Mongoose, servicios y controladores para publicaciones.
 * Cómo lo hace: Resuelve referencias circulares con ComentariosModule mediante forwardRef().
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Publicacion.name, schema: PublicacionSchema }]),
    CloudinaryModule,
    UsuariosModule,
    forwardRef(() => ComentariosModule),
  ],
  controllers: [PublicacionesController],
  providers: [PublicacionesService, PublicacionesRepository],
  exports: [PublicacionesService, PublicacionesRepository],
})
export class PublicacionesModule {}