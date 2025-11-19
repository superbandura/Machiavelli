import React from 'react'
import { TacticalFormation, DeploymentZone, CampaignReinforcement } from '@/types/game'
import { FACTIONS } from '@/data/factions'
import { getFactionImageName } from '@/utils/factionHelpers'

interface TacticalDeploymentModalProps {
  isOpen: boolean
  onClose: () => void
  formations: TacticalFormation[]
  reinforcements?: CampaignReinforcement[] // Refuerzos de jugadores neutrales
}

const DEPLOYMENT_ZONES: { zone: DeploymentZone; label: string }[] = [
  { zone: 'left', label: 'FLANCO IZQUIERDO' },
  { zone: 'center', label: 'CENTRO' },
  { zone: 'right', label: 'FLANCO DERECHO' },
]

const TROOP_TYPE_LABELS: Record<string, string> = {
  militia: 'Milicia',
  lancers: 'Lanceros',
  pikemen: 'Piqueros',
  archers: 'Arqueros',
  crossbowmen: 'Ballesteros',
  lightCavalry: 'Caballería Ligera',
  heavyCavalry: 'Caballería Pesada',
}

const TACTICAL_ORDER_LABELS: Record<string, string> = {
  charge: 'Carga',
  hold: 'Mantener posición',
  skirmish: 'Escaramuza',
  withdraw: 'Retirada',
  support: 'Apoyo',
  none: 'Sin orden',
}

/**
 * Obtiene el icono correspondiente según el tipo de tropa
 * - Infantería (militia, lancers, pikemen): inf.png
 * - Caballería (lightCavalry, heavyCavalry): cab.png
 * - Arqueros (archers, crossbowmen): arq.png
 */
function getTroopIcon(troopType: string): string {
  const infantryTypes = ['militia', 'lancers', 'pikemen']
  const cavalryTypes = ['lightCavalry', 'heavyCavalry']
  const archerTypes = ['archers', 'crossbowmen']

  if (infantryTypes.includes(troopType)) {
    return '/icons/inf.png'
  } else if (cavalryTypes.includes(troopType)) {
    return '/icons/cab.png'
  } else if (archerTypes.includes(troopType)) {
    return '/icons/arq.png'
  }

  // Por defecto, infantería
  return '/icons/inf.png'
}

export default function TacticalDeploymentModal({
  isOpen,
  onClose,
  formations,
  reinforcements = [],
}: TacticalDeploymentModalProps) {
  if (!isOpen) return null

  // Combinar formaciones principales con formaciones de refuerzos
  // Marcar las formaciones de refuerzos con un flag especial
  const allFormations = [
    ...formations.map(f => ({ ...f, isReinforcement: false })),
    ...reinforcements.flatMap(r =>
      (r.formations || []).map(f => ({
        ...f,
        isReinforcement: true,
        reinforcementFaction: r.faction,
        reinforcementSide: r.side
      }))
    )
  ]

  // Agrupar formaciones por zona de despliegue
  const formationsByZone = {
    left: allFormations.filter((f) => f.deploymentZone === 'left'),
    center: allFormations.filter((f) => f.deploymentZone === 'center'),
    right: allFormations.filter((f) => f.deploymentZone === 'right'),
    reserve: allFormations.filter((f) => f.deploymentZone === 'reserve'),
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-7xl max-h-[90vh] bg-[#e8dcc0] border-4 border-[#6b5d42] rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#2d2416] border-b-4 border-[#6b5d42]">
          <div className="flex items-center gap-3">
            <img
              src="/icons/campañas.png"
              alt=""
              className="w-8 h-8 object-contain"
            />
            <h2 className="text-2xl font-heading font-bold text-[#e8dcc0]">
              Despliegue Táctico
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-3xl text-[#e8dcc0] hover:text-white transition-colors leading-none px-2"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8">
          {formations.length === 0 ? (
            /* Estado vacío global */
            <div className="py-12 text-center">
              <img
                src="/icons/reclutar.png"
                alt=""
                className="w-20 h-20 object-contain mx-auto mb-4 opacity-50"
              />
              <h3 className="text-xl font-heading font-semibold text-[#2d1810] mb-2">
                No hay formaciones desplegadas
              </h3>
              <p className="text-[#4a3f2a]">
                Crea formaciones tácticas para verlas en el campo de batalla
              </p>
            </div>
          ) : (
            /* Campo de batalla */
            <div className="relative h-full min-h-[600px] flex flex-col justify-center">
              {/* Línea de batalla - Fila superior */}
              <div className="grid grid-cols-3 gap-16 pb-8">
                {/* Flanco Izquierdo */}
                <div className="relative">
                  <h3 className="text-xs font-heading font-bold text-[#6b5d42] mb-6 text-center tracking-wider opacity-60">
                    FLANCO IZQUIERDO
                  </h3>
                  <div className="flex flex-wrap gap-4 justify-center">
                    {formationsByZone.left.map((formation) => (
                      <FormationCard key={formation.id} formation={formation} />
                    ))}
                    {formationsByZone.left.length === 0 && (
                      <p className="text-[#6b5d42] text-xs italic">Sin formaciones</p>
                    )}
                  </div>
                </div>

                {/* Centro */}
                <div className="relative">
                  <h3 className="text-xs font-heading font-bold text-[#6b5d42] mb-6 text-center tracking-wider opacity-60">
                    CENTRO
                  </h3>
                  <div className="flex flex-wrap gap-4 justify-center">
                    {formationsByZone.center.map((formation) => (
                      <FormationCard key={formation.id} formation={formation} />
                    ))}
                    {formationsByZone.center.length === 0 && (
                      <p className="text-[#6b5d42] text-xs italic">Sin formaciones</p>
                    )}
                  </div>
                </div>

                {/* Flanco Derecho */}
                <div className="relative">
                  <h3 className="text-xs font-heading font-bold text-[#6b5d42] mb-6 text-center tracking-wider opacity-60">
                    FLANCO DERECHO
                  </h3>
                  <div className="flex flex-wrap gap-4 justify-center">
                    {formationsByZone.right.map((formation) => (
                      <FormationCard key={formation.id} formation={formation} />
                    ))}
                    {formationsByZone.right.length === 0 && (
                      <p className="text-[#6b5d42] text-xs italic">Sin formaciones</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Línea divisoria horizontal centrada */}
              <div className="border-t-2 border-[#6b5d42] border-dashed my-8" />

              {/* Reserva - Fila inferior */}
              <div className="pt-8">
                <h3 className="text-xs font-heading font-bold text-[#6b5d42] mb-6 text-center tracking-wider opacity-60">
                  RESERVA
                </h3>
                <div className="flex flex-wrap gap-4 justify-center max-w-4xl mx-auto">
                  {formationsByZone.reserve.map((formation) => (
                    <FormationCard key={formation.id} formation={formation} />
                  ))}
                  {formationsByZone.reserve.length === 0 && (
                    <p className="text-[#6b5d42] text-xs italic">Sin formaciones</p>
                  )}
                </div>
              </div>

              {/* Leyenda */}
              <div className="absolute bottom-0 left-0 right-0 text-center">
                <p className="text-xs text-[#6b5d42] italic">
                  Pasa el cursor sobre cada formación para ver detalles
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface FormationCardProps {
  formation: TacticalFormation & {
    isReinforcement?: boolean
    reinforcementFaction?: string
    reinforcementSide?: 'attacker' | 'defender'
  }
}

function FormationCard({ formation }: FormationCardProps) {
  const [showTooltip, setShowTooltip] = React.useState(false)
  const troopIcon = getTroopIcon(formation.troopType)

  // Obtener emblema de la facción
  const factionKey = formation.faction.toUpperCase()
  const factionImageName = getFactionImageName(factionKey)

  // Determinar estilo de borde si es refuerzo
  const borderClass = formation.isReinforcement
    ? 'border-2 border-blue-500 shadow-blue-300'
    : 'border border-[#6b5d42]/30'

  return (
    <div className="relative">
      <div
        className={`bg-white/90 ${borderClass} rounded-lg p-2 cursor-help transition-all hover:shadow-md hover:scale-110 hover:bg-white flex items-center justify-center relative`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Emblema de facción */}
        <img
          src={`/factions/${factionImageName}.png`}
          alt={formation.faction}
          className="absolute top-0 left-0 w-6 h-6 object-contain border-2 border-white rounded-full bg-white shadow-sm"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />

        <img
          src={troopIcon}
          alt=""
          className="w-10 h-10 object-contain opacity-90"
        />
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 bg-[#2d2416] border-2 border-[#6b5d42] rounded-lg p-3 shadow-xl">
          {/* Flecha del tooltip */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-[#2d2416]" />

          <div className="space-y-2 text-xs text-[#e8dcc0]">
            <div className="flex justify-between">
              <span className="font-semibold">Nombre:</span>
              <span className="text-right">{formation.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Tipo:</span>
              <span>{TROOP_TYPE_LABELS[formation.troopType] || formation.troopType}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Cantidad:</span>
              <span>{formation.quantity} tropas</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Facción:</span>
              <span className="capitalize">{formation.faction}</span>
            </div>
            {formation.isReinforcement && (
              <div className="bg-blue-900/30 border border-blue-500/50 rounded px-2 py-1 mt-2">
                <div className="text-blue-300 font-semibold text-center mb-1">🛡️ REFUERZO</div>
                <div className="flex justify-between">
                  <span className="font-semibold">Enviado por:</span>
                  <span className="capitalize">{formation.reinforcementFaction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Apoya a:</span>
                  <span className="capitalize">{formation.reinforcementSide === 'attacker' ? 'Atacante' : 'Defensor'}</span>
                </div>
              </div>
            )}
            <div className="border-t border-[#6b5d42] pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold">Orden táctica:</span>
                <span className="capitalize">{TACTICAL_ORDER_LABELS[formation.tacticalOrder] || formation.tacticalOrder}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
