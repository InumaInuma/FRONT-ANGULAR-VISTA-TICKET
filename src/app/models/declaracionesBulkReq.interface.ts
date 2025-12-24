import { DeclaracionUpdateItemReq } from "./declaracionesUpdateITemRed.interface";

export interface DeclaracionesBulkReq {
  codEmp: number;
  codSed: number;
  codTCl: number;
  numOrd: number;
  items: DeclaracionUpdateItemReq[];
}