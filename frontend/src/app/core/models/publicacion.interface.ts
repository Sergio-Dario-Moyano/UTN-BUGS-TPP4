import { IUsuario } from './auth.interface';

/**
 * Interfaz que modela una publicación en el sistema.
 */
export interface IPublicacion {
  _id: string;
  usuario: IUsuario;
  titulo: string;
  descripcion: string;
  imagenUrl?: string;
  meGustas: string[];
  cantidadMeGustas: number;
  comentarios: string[];
  cantidadComentarios: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IRespuestaPublicaciones {
  publicaciones: IPublicacion[];
  total?: number;
}