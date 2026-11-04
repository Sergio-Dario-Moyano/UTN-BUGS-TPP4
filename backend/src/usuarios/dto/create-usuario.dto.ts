import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { RolUsuario } from '../schemas/usuario.schema.js';

/**
 * DTO para la creación y registro de usuarios.
 * Qué hace: Sanitiza y valida los datos que llegan en la petición POST de registro.
 * Cómo lo hace: Utiliza decoradores de class-validator evaluados por el ValidationPipe global de NestJS.
 */
export class CreateUsuarioDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  nombre!: string;

  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  apellido!: string;

  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  @IsEmail({}, { message: 'El formato del correo es inválido' })
  @Matches(/^[a-zA-Z0-9._%+-]+@(gmail\.com|hotmail\.com|outlook\.com|utn\.edu\.ar)$/, {
    message: 'El correo debe ser de dominio gmail, hotmail, outlook o utn.edu.ar',
  })
  correo!: string;

  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto' })
  @MinLength(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres' })
  @MaxLength(15, { message: 'El nombre de usuario no puede superar los 15 caracteres' })
  nombreUsuario!: string;

  // 8 caracteres, al menos 1 mayúscula y 1 número
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe contener al menos una mayúscula y un número',
  })
  password!: string;

  @IsOptional()
  @IsString()
  repetirPassword?: string;

  @IsNotEmpty({ message: 'La fecha de nacimiento es obligatoria' })
  @IsDateString({}, { message: 'La fecha de nacimiento no es válida' })
  fechaNacimiento!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250, { message: 'La descripción no puede superar los 250 caracteres' })
  descripcion?: string;

  @IsOptional()
  @IsEnum(RolUsuario, { message: 'El perfil debe ser usuario o administrador' })
  perfil?: RolUsuario;
}