/**
 * TurnHistory - Muestra el historial de eventos de turnos anteriores
 *
 * Lee la colección 'history' de Firestore y muestra:
 * - Eventos principales (batallas, conquistas, eliminaciones)
 * - Resumen estadístico del turno
 * - Filtrado por turno
 */

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface TurnEvent {
  type: string;
  message: string;
  [key: string]: any;
}

interface TurnHistoryEntry {
  id: string;
  turnNumber: number;
  season: string;
  year: number;
  timestamp: any;
  events: TurnEvent[];
  summary: {
    totalEvents: number;
    conquests: number;
    battles: number;
    retreats: number;
    movements: number;
    conversions: number;
    standoffs: number;
  };
  majorEvents: TurnEvent[];
}

interface TurnHistoryProps {
  gameId: string;
}

export default function TurnHistory({ gameId }: TurnHistoryProps) {
  const [history, setHistory] = useState<TurnHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurn, setSelectedTurn] = useState<TurnHistoryEntry | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const historyRef = collection(db, 'history');
        const q = query(
          historyRef,
          where('gameId', '==', gameId),
          orderBy('turnNumber', 'desc'),
          limit(20)
        );

        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TurnHistoryEntry[];

        setHistory(entries);
        if (entries.length > 0) {
          setSelectedTurn(entries[0]); // Seleccionar el turno más reciente
        }
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [gameId]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <p className="text-gray-400">Cargando historial...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-3">📜 Historial de Turnos</h3>
        <p className="text-gray-400">No hay turnos resueltos todavía.</p>
      </div>
    );
  }

  const getEventIcon = (eventType: string) => {
    const icons: Record<string, string> = {
      battle: '⚔️',
      city_captured: '🏰',
      city_auto_captured: '🏴',
      player_eliminated: '☠️',
      move_success: '➡️',
      retreat: '🏃',
      standoff: '⚡',
      support_cut: '❌',
      conversion: '🔄',
      siege_started: '⚔️',
      siege_progress: '⏳',
      unit_destroyed: '💥',
    };
    return icons[eventType] || '📍';
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 h-full flex flex-col">
      <h3 className="text-lg font-bold text-white p-4 border-b border-gray-700">
        📜 Historial de Turnos
      </h3>

      <div className="flex-1 flex overflow-hidden">
        {/* Lista de turnos */}
        <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
          {history.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setSelectedTurn(entry)}
              className={`w-full text-left p-3 border-b border-gray-700 hover:bg-gray-750 transition-colors ${
                selectedTurn?.id === entry.id ? 'bg-gray-700' : ''
              }`}
            >
              <div className="font-semibold text-white">
                Turno {entry.turnNumber}
              </div>
              <div className="text-sm text-gray-400">
                {entry.season} {entry.year}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {entry.summary.totalEvents} eventos
              </div>
            </button>
          ))}
        </div>

        {/* Detalles del turno seleccionado */}
        <div className="flex-1 p-4 overflow-y-auto">
          {selectedTurn ? (
            <>
              {/* Resumen */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3">
                  Turno {selectedTurn.turnNumber} - {selectedTurn.season} {selectedTurn.year}
                </h4>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedTurn.summary.battles > 0 && (
                    <div className="bg-gray-900 rounded p-2">
                      <span className="text-gray-400">Batallas:</span>
                      <span className="text-white font-semibold ml-2">{selectedTurn.summary.battles}</span>
                    </div>
                  )}
                  {selectedTurn.summary.conquests > 0 && (
                    <div className="bg-gray-900 rounded p-2">
                      <span className="text-gray-400">Conquistas:</span>
                      <span className="text-yellow-400 font-semibold ml-2">{selectedTurn.summary.conquests}</span>
                    </div>
                  )}
                  {selectedTurn.summary.movements > 0 && (
                    <div className="bg-gray-900 rounded p-2">
                      <span className="text-gray-400">Movimientos:</span>
                      <span className="text-blue-400 font-semibold ml-2">{selectedTurn.summary.movements}</span>
                    </div>
                  )}
                  {selectedTurn.summary.retreats > 0 && (
                    <div className="bg-gray-900 rounded p-2">
                      <span className="text-gray-400">Retiradas:</span>
                      <span className="text-orange-400 font-semibold ml-2">{selectedTurn.summary.retreats}</span>
                    </div>
                  )}
                  {selectedTurn.summary.standoffs > 0 && (
                    <div className="bg-gray-900 rounded p-2">
                      <span className="text-gray-400">Empates:</span>
                      <span className="text-purple-400 font-semibold ml-2">{selectedTurn.summary.standoffs}</span>
                    </div>
                  )}
                  {selectedTurn.summary.conversions > 0 && (
                    <div className="bg-gray-900 rounded p-2">
                      <span className="text-gray-400">Conversiones:</span>
                      <span className="text-green-400 font-semibold ml-2">{selectedTurn.summary.conversions}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Eventos importantes */}
              {selectedTurn.majorEvents.length > 0 && (
                <div className="mb-6">
                  <h5 className="text-white font-semibold mb-3 text-sm">Eventos Destacados</h5>
                  <div className="space-y-2">
                    {selectedTurn.majorEvents.map((event, index) => (
                      <div
                        key={index}
                        className="bg-gray-900 rounded p-3 border-l-4 border-yellow-500"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xl">{getEventIcon(event.type)}</span>
                          <p className="text-sm text-gray-300 flex-1">{event.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Todos los eventos */}
              <div>
                <h5 className="text-white font-semibold mb-3 text-sm">Todos los Eventos</h5>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {selectedTurn.events.map((event, index) => (
                    <div
                      key={index}
                      className="text-sm text-gray-400 p-2 hover:bg-gray-900 rounded transition-colors"
                    >
                      <span className="mr-2">{getEventIcon(event.type)}</span>
                      {event.message}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-400">Selecciona un turno para ver detalles</p>
          )}
        </div>
      </div>
    </div>
  );
}
