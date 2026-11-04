import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { CreateUsuarioDto } from '../usuarios/dto/create-usuario.dto.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { RolUsuario } from '../usuarios/schemas/usuario.schema.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Empaqueta el payload seguro y firma el token JWT.
   * Qué hace: Genera un JWT con id, correo, nombreUsuario y rol.
   * Cómo lo hace: Llama a jwtService.sign con los datos mínimos indispensables.
   */
  private generarToken(usuario: any): string {
    const payload = {
      id: usuario._id,
      correo: usuario.correo,
      nombreUsuario: usuario.nombreUsuario,
      perfil: usuario.perfil,
    };
    return this.jwtService.sign(payload);
  }

  /**
   * Procesa el registro de un nuevo usuario.
   * Qué hace: Verifica unicidad de correo/alias, encripta la contraseña, guarda en MongoDB y emite el token.
   * Cómo lo hace: Consulta findByCorreoONombreUsuario; genera un salt con bcrypt (10 rondas),
   * hashea la contraseña, asigna el rol recibido (o 'usuario' por defecto) y crea el registro con activo: true.
   */
  async registro(dto: CreateUsuarioDto, imagenUrl?: string) {
    const credencialesExisten = await this.usuariosService.findByCorreoONombreUsuario(
      dto.correo,
      dto.nombreUsuario,
    );

    if (credencialesExisten) {
      throw new ConflictException('El correo o nombre de usuario ya están registrados');
    }

    const { repetirPassword, password, perfil, ...datosUsuario } = dto;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const usuarioPorCrear = {
      ...datosUsuario,
      password: hashedPassword,
      imagen: imagenUrl,
      perfil: perfil || RolUsuario.USER,
      activo: true,
    };

    const usuario = await this.usuariosService.create(usuarioPorCrear);
    const usuarioSanitizado = this.usuariosService.sanitizarUsuario(usuario);
    const token = this.generarToken(usuarioSanitizado);

    return { token, usuario: usuarioSanitizado };
  }

  /**
   * Valida credenciales de acceso e inicia sesión.
   * Qué hace: Verifica usuario, comprueba si la cuenta no fue bloqueada y valida contraseña.
   * Cómo lo hace: Busca por correo o alias, comprueba activo: true, compara contraseñas con bcrypt.compare y firma un nuevo JWT.
   */
  async login(loginDto: LoginDto) {
    const { credencial, password } = loginDto;
    const usuario = await this.usuariosService.findByCorreoONombreUsuario(credencial);

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Esta cuenta está deshabilitada');
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const usuarioSanitizado = this.usuariosService.sanitizarUsuario(usuario);
    const token = this.generarToken(usuarioSanitizado);

    return { token, usuario: usuarioSanitizado };
  }

  /**
   * Verifica criptográficamente un token JWT.
   * Qué hace: Comprueba la firma y vigencia del token.
   * Cómo lo hace: Invoca jwtService.verify(); lanza UnauthorizedException si expiró o es adulterado.
   */
  verificarToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  /**
   * Busca un usuario por ID garantizando que siga activo.
   * Qué hace: Recupera el usuario para la validación silenciosa.
   * Cómo lo hace: Invoca usuariosService.findOne() y valida existencia y estado activo.
   */
  async buscarPorId(id: string) {
    const usuario = await this.usuariosService.findOne(id);
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');
    if (!usuario.activo) throw new UnauthorizedException('Cuenta desactivada');
    return this.usuariosService.sanitizarUsuario(usuario);
  }

  /**
   * Renueva un token de sesión antes de que expire.
   * Qué hace: Emite un nuevo token con 15 minutos de vigencia para el usuario activo.
   * Cómo lo hace: Verifica el token actual, busca el usuario en base de datos y genera una nueva firma.
   */
  async refrescar(tokenViejo: string) {
    try {
      const payload = this.verificarToken(tokenViejo);
      const usuario = await this.buscarPorId(payload.id);
      return this.generarToken(usuario);
    } catch {
      throw new UnauthorizedException('Sesión desconocida o expirada');
    }
  }
}