export interface DeclaracionUpdateItemReq {
  codDec: number;
  estado: boolean; // 👈 bool, no number
  divice?: string | null;
  firmas?: string | null;
  fecAce?: string | null;
  noStPe?: boolean | null;
  stDuPe?: boolean | null;
  staPer?: boolean | null;

  // ISO string
}