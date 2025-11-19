// Export all types
export * from './game'
export * from './auth'
export * from './map'

// Export scenario types (excluding FactionSetup que ya está en game.ts)
export type {
  ArmyTroopType,
  GarrisonTroopType,
  FleetShipType,
  ArmyComposition,
  GarrisonComposition,
  FleetComposition,
  DetailedUnit,
  EditableProvinceData
} from './scenario'
