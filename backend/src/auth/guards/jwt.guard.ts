import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Determina si la petición entrante está autorizada.
   * Qué hace: Extrae la cookie 'autorizacion', valida el JWT y puebla request.user.
   * Cómo lo hace: Lee context.switchToHttp().getRequest().cookies['autorizacion'], ejecuta
   * jwtService.verify() y, si es válido, inyecta el payload en request.user; en caso contrario lanza UnauthorizedException (401).
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies ? request.cookies['autorizacion'] : null;

    if (!token) {
      throw new UnauthorizedException('No tienes permisos. Debes iniciar sesión.');
    }

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado. Vuelve a iniciar sesión.');
    }
  }
}