import { SubExamen } from "./subExamen.interface";

export interface Examen {
  codPer: number;
  nomPer: string;
  nroDId: string;
  nroTlf: string;
  edaPac: number;
  fecAte: string;
  nomCom: string;
  codTCh: string;
  codSer: number;
  nomSer: string;
  estado: number; // 0 en cola, 1 llamando, 3 atendido, 4 en espera

  // 🚨 Agregamos la lista de sub-exámenes
  subExamenes: SubExamen[];

  // Propiedad para controlar el despliegue
  isExpanded: boolean;
}