/**
 * Interfaz para las credenciales de inicio de sesión.
 */
export interface ILogin {
  credencial: string;
  password: string;
}

/**
 * Interfaz para el formulario de registro de usuario nuevo.
 */
export interface IRegistroUsuario {
  nombre: string;
  apellido: string;
  correo: string;
  nombreUsuario: string;
  password: string;
  repetirPassword?: string;
  fechaNacimiento: string;
  descripcion?: string;
  perfil?: 'usuario' | 'administrador';
  imagen?: string;
}

/**
 * Entidad de Usuario devuelta por el backend.
 */
export interface IUsuario {
  _id: string;
  nombre: string;
  apellido: string;
  correo: string;
  nombreUsuario: string;
  fechaNacimiento: Date | string;
  descripcion: string;
  imagen: string;
  perfil: 'usuario' | 'administrador';
  activo: boolean;
  createdAt: string;
}