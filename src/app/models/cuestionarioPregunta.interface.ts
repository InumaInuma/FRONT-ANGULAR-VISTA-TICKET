// Define la interfaz para las preguntas que trae el backend
export interface CuestionarioPregunta {
  ID: number;
  pregunta: string;
  FechaCreacion: Date; // O el tipo de dato que uses para las opciones
}