import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SiglaService {
  private baseUrl = 'http://localhost:5106/api/Examenes'; // tu URL de la API

  constructor(private http: HttpClient) {}

   getExamenes(): Observable<any[]> {
    // Valores en duro
    const codEmp = 1;
    const codSed = 1;
    const codTCl = 2;
    const numOrd = 1;

    // Construimos la URL con los path params
    return this.http.get<any[]>(`${this.baseUrl}/${codEmp}/${codSed}/${codTCl}/${numOrd}`);
  }
}