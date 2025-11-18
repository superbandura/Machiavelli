/**
 * HistoryModal - Modal para mostrar el historial de eventos de turnos anteriores
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

interface HistoryModalProps {
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryModal({ gameId, isOpen, onClose }: HistoryModalProps) {
  const [history, setHistory] = useState<TurnHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurn, setSelectedTurn] = useState<TurnHistoryEntry | null>(null);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [gameId, isOpen]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#d4c4a1] rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border-4 border-[#8b4513]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-[#8b4513] bg-gradient-to-r from-[#c4b49a] to-[#d4c4a1]">
          <h2 className="text-2xl font-serif font-bold text-[#2d1810] flex items-center gap-3">
            <span className="text-3xl">📜</span>
            Historial de Turnos
          </h2>
          <button
            onClick={onClose}
            className="text-[#2d1810] hover:text-[#8b4513] text-3xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-[#2d1810] font-serif text-lg">Cargando historial...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[#2d1810] font-serif text-lg">No hay turnos resueltos todavía.</p>
            </div>
          ) : (
            <div className="flex h-full">
              {/* Lista de turnos */}
              <div className="w-1/3 border-r-4 border-[#8b4513] overflow-y-auto bg-[#c4b49a]">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedTurn(entry)}
                    className={`w-full text-left p-4 border-b-2 border-[#b4a481] hover:bg-[#b4a48a] transition-colors font-serif ${
                      selectedTurn?.id === entry.id ? 'bg-[#a49471] border-l-4 border-[#8b4513]' : ''
                    }`}
                  >
                    <div className="font-bold text-[#2d1810] text-lg">
                      Turno {entry.turnNumber}
                    </div>
                    <div className="text-sm text-[#3d2820] mt-1">
                      {entry.season} {entry.year}
                    </div>
                    <div className="text-xs text-[#4d3830] mt-1">
                      {entry.summary.totalEvents} eventos
                    </div>
                  </button>
                ))}
              </div>

              {/* Detalles del turno seleccionado */}
              <div className="flex-1 p-6 overflow-y-auto bg-[#d4c4a1]">
                {selectedTurn ? (
                  <>
                    {/* Resumen */}
                    <div className="mb-6">
                      <h4 className="text-[#2d1810] font-serif font-bold text-xl mb-4">
                        Turno {selectedTurn.turnNumber} - {selectedTurn.season} {selectedTurn.year}
                      </h4>

                      <div className="grid grid-cols-2 gap-3">
                        {selectedTurn.summary.battles > 0 && (
                          <div className="bg-[#c4b49a] rounded-lg p-3 border-2 border-[#b4a481]">
                            <span className="text-[#4d3830] font-serif">Batallas:</span>
                            <span className="text-[#8b4513] font-serif font-bold ml-2 text-lg">
                              {selectedTurn.summary.battles}
                            </span>
                          </div>
                        )}
                        {selectedTurn.summary.conquests > 0 && (
                          <div className="bg-[#c4b49a] rounded-lg p-3 border-2 border-[#b4a481]">
                            <span className="text-[#4d3830] font-serif">Conquistas:</span>
                            <span className="text-[#d4af37] font-serif font-bold ml-2 text-lg">
                              {selectedTurn.summary.conquests}
                            </span>
                          </div>
                        )}
                        {selectedTurn.summary.movements > 0 && (
                          <div className="bg-[#c4b49a] rounded-lg p-3 border-2 border-[#b4a481]">
                            <span className="text-[#4d3830] font-serif">Movimientos:</span>
                            <span className="text-[#5b7c99] font-serif font-bold ml-2 text-lg">
                              {selectedTurn.summary.movements}
                            </span>
                          </div>
                        )}
                        {selectedTurn.summary.retreats > 0 && (
                          <div className="bg-[#c4b49a] rounded-lg p-3 border-2 border-[#b4a481]">
                            <span className="text-[#4d3830] font-serif">Retiradas:</span>
                            <span className="text-[#cd853f] font-serif font-bold ml-2 text-lg">
                              {selectedTurn.summary.retreats}
                            </span>
                          </div>
                        )}
                        {selectedTurn.summary.standoffs > 0 && (
                          <div className="bg-[#c4b49a] rounded-lg p-3 border-2 border-[#b4a481]">
                            <span className="text-[#4d3830] font-serif">Empates:</span>
                            <span className="text-[#8b4789] font-serif font-bold ml-2 text-lg">
                              {selectedTurn.summary.standoffs}
                            </span>
                          </div>
                        )}
                        {selectedTurn.summary.conversions > 0 && (
                          <div className="bg-[#c4b49a] rounded-lg p-3 border-2 border-[#b4a481]">
                            <span className="text-[#4d3830] font-serif">Conversiones:</span>
                            <span className="text-[#6b8e23] font-serif font-bold ml-2 text-lg">
                              {selectedTurn.summary.conversions}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Eventos importantes */}
                    {selectedTurn.majorEvents.length > 0 && (
                      <div className="mb-6">
                        <h5 className="text-[#2d1810] font-serif font-bold mb-3 text-lg">Eventos Destacados</h5>
                        <div className="space-y-3">
                          {selectedTurn.majorEvents.map((event, index) => (
                            <div
                              key={index}
                              className="bg-[#c4b49a] rounded-lg p-4 border-l-4 border-[#d4af37] shadow-md"
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">{getEventIcon(event.type)}</span>
                                <p className="text-[#2d1810] font-serif flex-1">{event.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Todos los eventos */}
                    <div>
                      <h5 className="text-[#2d1810] font-serif font-bold mb-3 text-lg">Todos los Eventos</h5>
                      <div className="space-y-2 max-h-96 overflow-y-auto bg-[#c4b49a] rounded-lg p-4 border-2 border-[#b4a481]">
                        {selectedTurn.events.map((event, index) => (
                          <div
                            key={index}
                            className="text-sm text-[#2d1810] font-serif p-2 hover:bg-[#b4a48a] rounded transition-colors"
                          >
                            <span className="mr-2">{getEventIcon(event.type)}</span>
                            {event.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[#4d3830] font-serif text-center mt-8">
                    Selecciona un turno para ver detalles
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
