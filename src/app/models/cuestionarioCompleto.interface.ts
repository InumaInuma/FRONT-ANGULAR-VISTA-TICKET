import { RespuestaDetalle } from "./respuestaDetalle.interface";

// ✅ Interfaz para el cuestionario completo
export interface CuestionarioCompleto {
  CodPer: number;
  Comentario: string;
  Respuestas: RespuestaDetalle[];
}