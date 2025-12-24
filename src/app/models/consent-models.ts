export interface PolicyVersionInfo {
  id: string; // ej. 'POL-001'
  version: string; // ej. '1.0.0'
  updatedAt: string; // ISO string
}

export interface ConsentPayload {
  /* patientId?: string;  */ // si lo tienes por sesión
  fullName: string;
  accepted: boolean;
  acceptedAt: string; // ISO string desde frontend
  policy: PolicyVersionInfo;
  signaturePngBase64: string; // data:image/png;base64,....
  userAgent?: string;
  ipAddress?: string; // puedes completarlo en backend
  // ✅ añade esto para indicar qué declaraciones se aceptan
  acceptedDeclarationIds?: number[];
}

export interface ConsentResponse {
  id: string; // id de consentimiento creado
  storedAt: string; // ISO string
}
