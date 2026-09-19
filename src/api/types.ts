/**
 * Raw response types for the public COF Cádiz endpoint:
 * https://www.cofcadiz.es/wp-json/vcomm/v1/farmacias/guardia
 */

export interface GuardiaHorario {
  /** Schedule description, e.g. "SERVICIO NOCTURNO (de 22,00 a 9,00 h)". */
  tipo: string
  color?: string
  /** "HH:MM:SS" — start time of the shift on the queried date. */
  hora_apertura: string
  /** "HH:MM:SS" — end time, on the next day when cierre_dia_siguiente is true. */
  hora_cierre: string
  /** When true, the shift closes on the day after the queried date. */
  cierre_dia_siguiente: boolean
}

export interface GuardiaContacto {
  direccion?: string
  provincia?: string
  municipio?: string
  localidad?: string
  codigo_postal?: string
  telefono?: string
  /** Stringified JSON array, e.g. "[36.1808804, -5.4921107]". */
  coordenadas?: string
  nota?: string
}

export interface GuardiaRecord {
  /** Date the shift refers to, "YYYY-MM-DD". */
  fecha: string
  soe: string
  /** Pharmacist / pharmacy name, e.g. "Hernández Sansalvador, Milagros". */
  nombre: string
  nombre_fiscal?: string
  /** Guard zone name, e.g. "LOS BARRIOS" (may cover several municipalities). */
  zona_guardia: string
  contactos_profesionales?: GuardiaContacto[]
  horarios?: GuardiaHorario[]
}

export interface GuardiaResponse {
  informacion?: GuardiaRecord[]
  metadatos?: {
    paginacion?: {
      offset?: number
      limit?: number
      totalElementos?: number | string
    }
  }
}
