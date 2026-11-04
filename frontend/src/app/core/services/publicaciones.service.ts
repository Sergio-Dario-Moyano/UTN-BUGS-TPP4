import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IPublicacion, IRespuestaPublicaciones } from '../models/publicacion.interface';

@Injectable({
  providedIn: 'root'
})
export class PublicacionesService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl || 'http://localhost:3000'}/publicaciones`;

  /**
   * Crea una nueva publicación enviando FormData al backend.
   * Qué hace: Transmite título, descripción y archivo opcional.
   * Cómo lo hace: Realiza una petición POST multipart/form-data.
   */
  crear(formData: FormData): Observable<{ message: string; publicacion: IPublicacion }> {
    return this.http.post<{ message: string; publicacion: IPublicacion }>(this.API_URL, formData);
  }

  /**
   * Obtiene la lista de publicaciones con paginación incremental y ordenamiento dinámico.
   * Qué hace: Consulta las publicaciones activas del feed o de un usuario específico.
   * Cómo lo hace: Pasa HttpParams con offset, limit, orden y usuarioId opcional mediante una petición GET.
   */
  listar(
    offset: number = 0,
    limit: number = 10,
    orden: 'fecha' | 'meGustas' = 'fecha',
    usuarioId?: string
  ): Observable<IRespuestaPublicaciones> {
    let params = new HttpParams()
      .set('offset', offset.toString())
      .set('limit', limit.toString())
      .set('orden', orden);

    if (usuarioId) {
      params = params.set('usuarioId', usuarioId);
    }

    return this.http.get<IRespuestaPublicaciones>(this.API_URL, { params });
  }

  /**
   * Da de baja lógica una publicación.
   * Qué hace: Oculta la publicación de la vista general.
   * Cómo lo hace: Ejecuta una petición DELETE enviando el ID del post.
   */
  eliminar(idPublicacion: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/${idPublicacion}`);
  }

  /**
   * Registra un Me Gusta del usuario autenticado.
   * Qué hace: Agrega el like y actualiza el contador.
   * Cómo lo hace: Ejecuta una petición POST a /publicaciones/:id/like.
   */
  darMeGusta(idPublicacion: string): Observable<any> {
    return this.http.post(`${this.API_URL}/${idPublicacion}/like`, {});
  }

  /**
   * Elimina el Me Gusta previamente otorgado.
   * Qué hace: Quita el like del usuario logueado.
   * Cómo lo hace: Ejecuta una petición DELETE a /publicaciones/:id/like.
   */
  quitarMeGusta(idPublicacion: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/${idPublicacion}/like`);
  }

  /**
   * Obtiene el detalle de una publicación por su ID.
   * Qué hace: Recupera el apunte junto con los datos de su autor.
   * Cómo lo hace: Ejecuta una petición GET a /publicaciones/:id.
   */

  getById(id: string): Observable<IPublicacion> {
    return this.http
      .get<{ publicacion: IPublicacion }>(`${this.API_URL}/${id}`)
      .pipe(map((response) => response.publicacion));
  }

}