// Map and Province types

export type ProvinceType = 'land' | 'sea'

export interface Province {
  id: string // Código de 3 letras (ej: "FLO", "MIL", "ROM")
  name: string // Nombre completo (ej: "Florence", "Milan", "Rome")
  type: ProvinceType
  isCity: boolean // Si es una ciudad productora de ducados
  supplyCenterValue?: number // Valor en ducados (solo para ciudades)
  adjacentProvinces: string[] // IDs de provincias adyacentes
  adjacentSeas?: string[] // IDs de mares adyacentes (solo para provincias costeras)
}

export interface MapData {
  provinces: Record<string, Province>
  seas: Record<string, Province>
}
