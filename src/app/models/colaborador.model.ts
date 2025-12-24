export interface Colaborador {
  codPer: number;
  nomPer: string;
  apePat: string;
  apeMat: string;
  nroDId: string;
  idRol: number;
  nomRol: string;
}

export interface ColaboradorPagedResponse {
  items: Colaborador[];
  // totalRows: number;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  hasMore: boolean;
}
