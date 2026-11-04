import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

/**
 * DTO para la creación de publicaciones.
 * Qué hace: Valida los campos obligatorios 'titulo' y 'descripcion' del formulario.
 * Cómo lo hace: Emplea decoradores de class-validator que rechazan strings vacíos o fuera de los límites.
 */
export class CreatePublicacionDto {

  @IsString({ message: 'El título debe ser un texto' })
  @IsNotEmpty({ message: 'El título no puede estar vacío' })
  @MinLength(1, { message: 'El título debe tener al menos 1 carácter' })
  @MaxLength(100, { message: 'El título no puede superar los 100 caracteres' })
  titulo!: string;

  @IsString({ message: 'La descripción debe ser un texto' })
  @IsNotEmpty({ message: 'La descripción no puede estar vacía' })
  @MinLength(1, { message: 'La descripción debe tener al menos 1 carácter' })
  @MaxLength(500, { message: 'La descripción no puede superar los 500 caracteres' })
  descripcion!: string;
}