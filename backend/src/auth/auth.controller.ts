import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  Res,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
// import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { CreateUsuarioDto } from '../usuarios/dto/create-usuario.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../cloudinary/multer.config';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

// @ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Setea la cookie 'autorizacion' con los parámetros de seguridad.
   * Qué hace: Configura una cookie HttpOnly con vencimiento estricto a 15 minutos.
   * Cómo lo hace: Ejecuta response.cookie con httpOnly: true, sameSite: 'none' y secure: true.
   */
  private setAuthCookie(response: Response, token: string): void {
    // Misma duración que el JWT: variable SESION_MINUTOS (por defecto 15)
    const minutos = Number(this.configService.get('SESION_MINUTOS') ?? 15);
    response.cookie('autorizacion', token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      expires: new Date(Date.now() + 1000 * 60 * minutos),
    });
  }

  /**
   * Endpoint de Registro (Sprint 1).
   * Qué hace: Recibe datos multipart, sube foto a Cloudinary, crea usuario y setea cookie.
   * Cómo lo hace: Multer intercepta 'file', CloudinaryService lo sube a 'fotos_perfil',
   * authService.registro persiste los datos y setAuthCookie estampa la sesión en la respuesta.
   */
  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  // @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async registro(
    @Body() createUsuarioDto: CreateUsuarioDto,
    @UploadedFile() file: Express.Multer.File,
    @Res({ passthrough: true }) response: Response,
  ) {
    let imagenUrl: string | undefined = undefined;

    if (file) {
      const upload = await this.cloudinaryService.subirImagen(file, 'fotos_perfil');
      imagenUrl = upload?.secure_url;
    } else {
      imagenUrl = this.configService.get<string>('DEFAULT_PROFILE_IMAGE_URL');
    }

    const { token, usuario } = await this.authService.registro(createUsuarioDto, imagenUrl);
    this.setAuthCookie(response, token);

    return { message: 'Usuario registrado exitosamente', usuario };
  }

  /**
   * Endpoint de Login (Sprint 1 y 3).
   * Qué hace: Verifica credenciales contra base de datos y setea cookie HttpOnly.
   * Cómo lo hace: Invocación a authService.login y estampa de cookie con setAuthCookie.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Iniciar sesión con correo o alias' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, usuario } = await this.authService.login(loginDto);
    this.setAuthCookie(response, token);

    return { message: 'Inicio de sesión exitoso', usuario };
  }

  /**
   * Endpoint de Validación Silenciosa (Sprint 3).
   * Qué hace: Valida si la cookie activa es válida y devuelve el usuario logueado.
   * Cómo lo hace: Lee request.cookies['autorizacion'], verifica firma y busca el usuario activo.
   */
  @Post('autorizar')
  @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Validar token de sesión actual en cookies' })
  async autorizar(@Req() request: Request) {
    const token = request.cookies ? request.cookies['autorizacion'] : null;
    if (!token) throw new UnauthorizedException('No hay token de sesión');

    const payload = this.authService.verificarToken(token);
    const usuarioCompleto = await this.authService.buscarPorId(payload.id);

    return {
      message: 'Token válido',
      usuario: usuarioCompleto,
    };
  }

  /**
   * Endpoint de Refresco de Token (Sprint 3).
   * Qué hace: Emite un nuevo JWT de 15 minutos renovando la cookie antes de que expire.
   * Cómo lo hace: Recibe el token actual, invoca authService.refrescar y actualiza la cookie.
   */
  @Post('refrescar')
  @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Refrescar el token por otros 15 minutos' })
  async refrescar(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokenViejo = request.cookies ? request.cookies['autorizacion'] : null;
    if (!tokenViejo) throw new BadRequestException('Token no proporcionado');

    const nuevoToken = await this.authService.refrescar(tokenViejo);
    this.setAuthCookie(response, nuevoToken);

    return { message: 'Token refrescado exitosamente' };
  }

  /**
   * Endpoint de Cierre de Sesión.
   * Qué hace: Destruye la cookie de autenticación en el cliente.
   * Cómo lo hace: Asigna a la cookie 'autorizacion' una fecha de expiración en 0 (época Unix).
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Cerrar sesión e invalidar cookies' })
  async logout(@Res({ passthrough: true }) response: Response) {
    response.cookie('autorizacion', '', {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      expires: new Date(0),
    });

    return { message: 'Sesión cerrada correctamente' };
  }
}