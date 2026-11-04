
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PublicacionesService } from './publicaciones.service.js';
import { CreatePublicacionDto } from './dto/create-publicacion.dto.js';
import { QueryPublicacionDto } from './dto/query-publicacion.dto.js';
import { multerConfig } from '../cloudinary/multer.config.js';
import { JwtGuard } from '../auth/guards/jwt.guard.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';

@Controller('publicaciones')
@UseGuards(JwtGuard)
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  /**
   * POST /publicaciones (Sprint 2).
   * Qué hace: Guarda un nuevo post con título, descripción e imagen opcional asociada al usuario.
   * Cómo lo hace: Intercepta 'file' con Multer, extrae el id de request.user y llama a publicacionesService.crear().
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async crear(
    @Body() createPublicacionDto: CreatePublicacionDto,
    @Req() request: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const usuarioId = request.user.id;
    const publicacion = await this.publicacionesService.crear(createPublicacionDto, usuarioId, file);
    return {
      message: 'Publicación creada con éxito',
      publicacion,
    };
  }

  /**
   * GET /publicaciones (Sprint 2).
   * Qué hace: Devuelve el listado paginado y ordenado de publicaciones junto con el total disponible.
   * Cómo lo hace: Pasa queryDto (offset, limit, orden, usuarioId) al servicio, que responde { publicaciones, total }.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listar(@Query() queryDto: QueryPublicacionDto) {
    return this.publicacionesService.listar(queryDto);
  }

  /**
   * DELETE /publicaciones/:id (Sprint 2).
   * Qué hace: Aplica baja lógica sobre el post indicado si quien lo pide es autor o admin.
   * Cómo lo hace: Extrae request.user.id e invoca publicacionesService.darDeBaja(id, usuarioId).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async darDeBaja(@Param('id', ParseObjectIdPipe) id: string, @Req() request: any) {
    const usuarioId = request.user.id;
    const publicacion = await this.publicacionesService.darDeBaja(id, usuarioId);
    return {
      message: 'Publicación eliminada correctamente',
      publicacion,
    };
  }

  /**
   * POST /publicaciones/:id/like (Sprint 2).
   * Qué hace: Registra un solo Me Gusta por usuario en la publicación.
   * Cómo lo hace: Invoca publicacionesService.darMeGusta(id, request.user.id).
   */
  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async darMeGusta(@Param('id', ParseObjectIdPipe) id: string, @Req() request: any) {
    const usuarioId = request.user.id;
    const publicacion = await this.publicacionesService.darMeGusta(id, usuarioId);
    return {
      message: 'Me gusta agregado',
      publicacion,
    };
  }

  /**
   * DELETE /publicaciones/:id/like (Sprint 2).
   * Qué hace: Remueve el Me Gusta previamente otorgado.
   * Cómo lo hace: Invoca publicacionesService.quitarMeGusta(id, request.user.id).
   */
  @Delete(':id/like')
  @HttpCode(HttpStatus.OK)
  async quitarMeGusta(@Param('id', ParseObjectIdPipe) id: string, @Req() request: any) {
    const usuarioId = request.user.id;
    const publicacion = await this.publicacionesService.quitarMeGusta(id, usuarioId);
    return {
      message: 'Me gusta eliminado',
      publicacion,
    };
  }

  /**
   * GET /publicaciones/:id.
   * Qué hace: Devuelve el detalle de una publicación por su ID.
   * Cómo lo hace: Invoca publicacionesService.buscarPorId(id).
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async buscarPorId(@Param('id', ParseObjectIdPipe) id: string) {
    const publicacion = await this.publicacionesService.buscarPorId(id);
    return { publicacion };
  }
}
