import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
// import { LoadingService } from '../../core/services/loading.service';
import { ModalService } from '../../shared/components/modal/modal.service';
// import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';

/**
 * Componente standalone que administra el formulario completo de registro de usuarios (Sprint 1).
 * Qué hace: Recopila datos de usuario, valida formatos, sube imagen de perfil en FormData y ejecuta el alta.
 * Cómo lo hace: Emplea FormGroup con validadores síncronos y cruzados; ensambla FormData y llama a auth.registro().
 */
@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ReactiveFormsModule],
  // imports: [RouterLink, RouterLinkActive, ReactiveFormsModule, SpinnerComponent],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro {
  private auth = inject(AuthService);
  private router = inject(Router);
  private modalService = inject(ModalService);
  // private loadingService = inject(LoadingService);

  loading = signal<boolean>(false);
  errorMensaje = signal<string | null>(null);
  togglePassword = signal<boolean>(false);
  togglePasswordRepeat = signal<boolean>(false);

  archivoSeleccionado: File | null = null;
  previewFoto = signal<string | null>(null);

  registroForm = new FormGroup(
    {
      // nombreCompleto: new FormControl<string>('', {
      //   nonNullable: true,
      //   validators: [
      //     Validators.required,
      //     Validators.minLength(3),
      //     Validators.pattern('^[A-Za-zÁÉÍÓÚáéíóúÑñ]+(?: [A-Za-zÁÉÍÓÚáéíóúÑñ]+)+$')
      //   ]
      // }),


      nombre: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
          // Letras y acentos; permite nombres compuestos ("María José")
          Validators.pattern('^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(?: [A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$')
        ]
      }),
      apellido: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
          Validators.pattern('^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(?: [A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$')
        ]
      }),
      correo: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.email,
          Validators.pattern('^[a-zA-Z0-9._%+-]+@(gmail\\.com|hotmail\\.com|outlook\\.com|utn\\.edu\\.ar)$')
        ]
      }),
      nombreUsuario: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(15),
          Validators.pattern('^[a-zA-Z0-9_]+$')
        ]
      }),
      fechaNacimiento: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required, this.validarFechaNacimiento.bind(this)]
      }),
      password: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Z])(?=.*\d)/)
        ]
      }),
      repetirPassword: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      descripcion: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.maxLength(250)]
      }),
      perfil: new FormControl<'usuario' | 'administrador'>('usuario', {
        nonNullable: true,
        validators: [Validators.required]
      })
    },
    { validators: this.passwordsCoinciden.bind(this) }
  );

  descripcionSignal = toSignal(this.registroForm.controls.descripcion.valueChanges, { initialValue: '' });
  caracteresDescripcion = computed(() => this.descripcionSignal()?.length || 0);

  /**
   * Validador cruzado de coincidencia de contraseñas.
   * Qué hace: Comprueba que los campos password y repetirPassword tengan el mismo valor.
   * Cómo lo hace: Lee ambos controles y devuelve { passwordsNoCoinciden: true } si difieren.
   */
  passwordsCoinciden(control: AbstractControl): ValidationErrors | null {
    const pass = control.get('password')?.value;
    const repetir = control.get('repetirPassword')?.value;
    return pass === repetir ? null : { passwordsNoCoinciden: true };
  }

  /**
   * Validador de rango de edad admisible (13 a 100 años).
   * Qué hace: Impide fechas futuras y restringe la edad entre 13 y 100 años.
   * Cómo lo hace: Compara la fecha ingresada contra el día actual y calcula años cumplidos.
   */


  validarFechaNacimiento(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;

  // "YYYY-MM-DD" -> números, sin pasar por Date/UTC
  const [anio, mes, dia] = (control.value as string).split('-').map(Number);

  const hoy = new Date();
  const anioHoy = hoy.getFullYear();
  const mesHoy = hoy.getMonth() + 1;
  const diaHoy = hoy.getDate();

  // Fecha futura
  if (
    anio > anioHoy ||
    (anio === anioHoy && (mes > mesHoy || (mes === mesHoy && dia > diaHoy)))
  ) {
    return { fechaFutura: true };
  }

  let edad = anioHoy - anio;
  if (mesHoy < mes || (mesHoy === mes && diaHoy < dia)) {
    edad--;
  }

  if (edad < 13) return { menorDeEdad: true };
  if (edad > 100) return { mayorDeEdad: true };

  return null;
}

  togglePw(): void {
    this.togglePassword.update((v) => !v);
  }

  togglePwRepeat(): void {
    this.togglePasswordRepeat.update((v) => !v);
  }

  tieneError(controlName: keyof typeof this.registroForm.controls, errorName: string): boolean {
    const control = this.registroForm.controls[controlName];
    return !!control && control.touched && control.hasError(errorName);
  }

  get passwordsNoCoinciden(): boolean {
    return (
      this.registroForm.controls.repetirPassword.touched &&
      this.registroForm.hasError('passwordsNoCoinciden')
    );
  }

  /**
   * Procesa la selección del archivo de imagen.
   * Qué hace: Valida formato (JPG/PNG/WEBP), tamaño máximo (5 MB) y genera previsualización local.
   * Cómo lo hace: Lee input.files[0], comprueba restricciones y usa FileReader para setear previewFoto.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        this.errorMensaje.set('Solo se permiten imágenes JPG, PNG o WEBP.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.errorMensaje.set('La imagen no puede superar los 5 MB.');
        return;
      }

      this.archivoSeleccionado = file;

      const reader = new FileReader();
      reader.onload = (e) => this.previewFoto.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  /**
   * Envía el formulario para el alta de cuenta.
   * Qué hace: Desglosa nombre y apellido, empaca los datos en FormData y llama a auth.registro().
   * Cómo lo hace: Si el formulario es válido, construye el FormData y redirige a /login ante respuesta exitosa.
   */
  onSubmit(): void {
    if (this.registroForm.invalid) {
      this.errorMensaje.set('Por favor, completá todos los campos correctamente.');
      this.registroForm.markAllAsTouched();
      return;
    }

    // this.loadingService.mostrar('Registrando tu cuenta...');
    this.loading.set(true);
    this.errorMensaje.set(null);

    const val = this.registroForm.getRawValue();

    // const partesNombre = val.nombreCompleto.trim().split(' ');
    // const nombre = partesNombre[0];
    // const apellido = partesNombre.slice(1).join(' ');

    const formData = new FormData();
    formData.append('nombre', val.nombre.trim());
    formData.append('apellido', val.apellido.trim());
    formData.append('correo', val.correo);
    formData.append('nombreUsuario', val.nombreUsuario);
    formData.append('password', val.password);
    formData.append('repetirPassword', val.repetirPassword);
    formData.append('fechaNacimiento', val.fechaNacimiento);
    formData.append('descripcion', val.descripcion);
    formData.append('perfil', val.perfil);

    if (this.archivoSeleccionado) {
      formData.append('file', this.archivoSeleccionado);
    }

this.auth.registro(formData).subscribe({
  next: async () => {
    // this.loadingService.ocultarInmediato();
    this.loading.set(false);

    await this.modalService.alerta({
      categoria: 'REGISTRO EXITOSO!!!',
      titulo: '¡Tu cuenta fue creada!',
      mensaje: 'Tu cuenta se registró correctamente. Iniciá sesión para empezar a compartir apuntes.',
      textoConfirmar: 'Ir a iniciar sesión',
      tipoIcono: 'success',
      esPeligro: false
    });

    this.router.navigate(['/login']);
  },
  error: (err: any) => {
    // this.loadingService.ocultarInmediato();
    this.loading.set(false);
    const mensaje = err?.error?.message;
    this.errorMensaje.set(
      Array.isArray(mensaje)
        ? mensaje.join(' ')
        : mensaje ?? 'Hubo un error al registrar tu cuenta. Intentá de nuevo.'
    );
  }
});
  }
}