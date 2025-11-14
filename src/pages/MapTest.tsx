import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import GameBoard from '@/components/GameBoard'
import { Unit } from '@/types'

export default function MapTest() {
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const navigate = useNavigate()

  // Unidades de ejemplo para probar el renderizado
  const exampleUnits = useMemo<Unit[]>(() => [
    {
      id: 'unit-1',
      type: 'army',
      owner: 'player-florence',
      currentPosition: 'FLO',
      status: 'active',
      siegeTurns: 0,
      createdAt: Timestamp.now()
    },
    {
      id: 'unit-2',
      type: 'army',
      owner: 'player-florence',
      currentPosition: 'SIE',
      status: 'active',
      siegeTurns: 0,
      createdAt: Timestamp.now()
    },
    {
      id: 'unit-3',
      type: 'garrison',
      owner: 'player-florence',
      currentPosition: 'FLO',
      status: 'active',
      siegeTurns: 0,
      createdAt: Timestamp.now()
    },
    {
      id: 'unit-4',
      type: 'army',
      owner: 'player-venice',
      currentPosition: 'RAV',
      status: 'active',
      siegeTurns: 0,
      createdAt: Timestamp.now()
    },
    {
      id: 'unit-5',
      type: 'fleet',
      owner: 'player-venice',
      currentPosition: 'UA',
      status: 'active',
      siegeTurns: 0,
      createdAt: Timestamp.now()
    },
    {
      id: 'unit-6',
      type: 'army',
      owner: 'player-milan',
      currentPosition: 'MIL',
      status: 'active',
      siegeTurns: 0,
      createdAt: Timestamp.now()
    },
    {
      id: 'unit-7',
      type: 'army',
      owner: 'player-milan',
      currentPosition: 'GEN',
      status: 'active',
      siegeTurns: 0,
      createdAt: Timestamp.now()
    },
    {
      id: 'unit-8',
      type: 'army',
      owner: 'player-naples',
      currentPosition: 'NAP',
      status: 'active',
      siegeTurns: 0,
      createdAt: Timestamp.now()
    },
    {
      id: 'unit-9',
      type: 'fleet',
      owner: 'player-naples',
      currentPosition: 'TS',
      status: 'active',
      siegeTurns: 0,
      createdAt: Timestamp.now()
    },
    {
      id: 'unit-10',
      type: 'army',
      owner: 'player-papal',
      currentPosition: 'ROM',
      status: 'active',
      siegeTurns: 0,
      createdAt: Timestamp.now()
    },
    {
      id: 'unit-11',
      type: 'army',
      owner: 'player-papal',
      currentPosition: 'BOL',
      status: 'active',
      siegeTurns: 0,
      createdAt: Timestamp.now()
    },
    {
      id: 'unit-12',
      type: 'garrison',
      owner: 'player-papal',
      currentPosition: 'ROM',
      status: 'besieged',
      siegeTurns: 1,
      createdAt: Timestamp.now()
    }
  ], [])

  // Mapeo de jugadores a facciones (comentado - no usado tras migración)
  // const playerFactions = useMemo(() => ({
  //   'player-florence': 'FLORENCE',
  //   'player-venice': 'VENICE',
  //   'player-milan': 'MILAN',
  //   'player-naples': 'NAPLES',
  //   'player-papal': 'PAPAL'
  // }), [])

  // Mapeo de provincias a facciones (para colorear el mapa)
  const provinceFaction = useMemo(() => ({
    // Florencia
    'FLO': 'FLORENCE',
    'SIE': 'FLORENCE',
    'PIS': 'FLORENCE',
    'ARE': 'FLORENCE',
    // Venecia
    'VEN': 'VENICE',
    'PAD': 'VENICE',
    'VER': 'VENICE',
    'TRE': 'VENICE',
    'RAV': 'VENICE',
    // Milán
    'MIL': 'MILAN',
    'PAV': 'MILAN',
    'CRE': 'MILAN',
    'GEN': 'MILAN',
    'PAR': 'MILAN',
    // Nápoles
    'NAP': 'NAPLES',
    'CAP': 'NAPLES',
    'SAL': 'NAPLES',
    'BAR': 'NAPLES',
    // Papal
    'ROM': 'PAPAL',
    'BOL': 'PAPAL',
    'FER': 'PAPAL',
    'URB': 'PAPAL'
  }), [])

  const handleProvinceClick = (provinceId: string) => {
    setSelectedProvince(provinceId)
  }

  // handleUnitClick comentado (no usado tras migración)
  // const handleUnitClick = (unit: Unit) => {
  //   console.log('Unidad clickeada:', unit)
  // }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Machiavelli - Test del Mapa</h1>
            <p className="text-gray-400 text-sm">Fase 2: Integración del mapa italiano</p>
          </div>
          <button
            onClick={() => navigate('/lobby')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Volver al Lobby
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        <div className="container mx-auto h-full flex gap-4">
          {/* Mapa */}
          <div className="flex-1 h-[calc(100vh-180px)]">
            <GameBoard
              onProvinceClick={handleProvinceClick}
              selectedProvince={selectedProvince}
              provinceFaction={provinceFaction}
            />
          </div>

          {/* Panel lateral */}
          <div className="w-80 bg-gray-800 rounded-lg p-4 space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Información</h2>
              <div className="text-sm text-gray-400">
                <p>Click en una provincia para seleccionarla</p>
                <p className="mt-2">Usa el scroll para hacer zoom</p>
                <p className="mt-2">Arrastra el mapa para moverte</p>
              </div>
            </div>

            {selectedProvince && (
              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2">Provincia Seleccionada</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-400">Código:</span>
                    <span className="ml-2 font-mono font-bold">{selectedProvince}</span>
                  </div>
                  <button
                    onClick={() => setSelectedProvince(null)}
                    className="w-full mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors text-sm"
                  >
                    Deseleccionar
                  </button>
                </div>
              </div>
            )}

            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="font-bold mb-2">Estadísticas</h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Provincias terrestres:</span>
                  <span className="font-bold">38</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Regiones marítimas:</span>
                  <span className="font-bold">10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Unidades de ejemplo:</span>
                  <span className="font-bold">{exampleUnits.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="font-bold mb-2">Leyenda de Unidades</h3>
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span>Florencia (Verde)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span>Venecia (Azul)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span>Milán (Rojo)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <span>Nápoles (Amarillo)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white rounded-full border border-gray-600"></div>
                  <span>Papal (Blanco)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
