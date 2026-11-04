import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Módulo de Autenticación.
 * Qué hace: Centraliza el flujo de login, registro, refresco y verificación de tokens.
 * Cómo lo hace: Configura JwtModule con signOptions en 15m y vincula UsuariosModule y CloudinaryModule.
 */
@Module({
  imports: [
    UsuariosModule,
    CloudinaryModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        // Duración de la sesión en minutos: variable SESION_MINUTOS (por defecto 15)
        signOptions: { expiresIn: `${Number(configService.get('SESION_MINUTOS') ?? 15)}m` },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}