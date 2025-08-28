import { Component } from '@angular/core';
import { SiglaService } from '../../services/sigla';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  /* imports: [], */
  standalone: true,
  imports: [CommonModule,FormsModule ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {

  dni: string = '';
  errorMessage: string | null = null;
  loading: boolean = false;

  constructor(private siglaService: SiglaService, private router: Router) { }

   onLogin(): void {

    if (!this.dni) {
      this.errorMessage = 'Por favor, ingresa tu número de DNI.';
      return;
    }

    this.loading = true;
    this.errorMessage = null;

      this.siglaService.login(this.dni).subscribe({
      next: (response) => {
        // En caso de éxito, navega a la página de exámenes
        console.log('¡Inicio de sesión exitoso!', response);
        this.router.navigate(['/examenes']); 
      },
      error: (err) => {
        // Maneja los diferentes tipos de error del backend
        if (err.message.includes('403')) {
          this.errorMessage = 'Ya has finalizado tus exámenes y no puedes ingresar.';
        } else if (err.message.includes('404')) {
          this.errorMessage = 'El número de DNI no se encontró.';
        } else if(err.message.includes('500')){
          this.errorMessage = 'El numero de DNI no se encontró o no tiene examenes programados o ya finalizo sus examenes'
        } 
        else {
          this.errorMessage = 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
        }
        console.error('Error al iniciar sesión:', err);
      }
    }).add(() => {
      this.loading = false;
    });
  

   }
}
