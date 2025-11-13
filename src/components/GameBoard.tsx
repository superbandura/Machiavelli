import { useState, useEffect, useRef, useCallback } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { getProvinceCoordinates } from '@/data/provinceCoordinates'
import { getFactionColor } from '@/data/factions'

interface GameBoardProps {
  onProvinceClick?: (provinceId: string) => void
  selectedProvince?: string | null
  famineProvinces?: string[] // Provincias con marcador de hambre
  provinceFaction?: Record<string, string> // Map de provinceId → factionId (para colorear provincias)
}

export default function GameBoard({
  onProvinceClick,
  selectedProvince,
  famineProvinces = [],
  provinceFaction = {}
}: GameBoardProps) {
  const [svgContent, setSvgContent] = useState<string>('')
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null)
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const hoveredProvinceRef = useRef<string | null>(null) // Ref para evitar re-renders del useEffect

  // FIX DEFINITIVO: Setear el SVG innerHTML solo una vez en useEffect
  // NO usar dangerouslySetInnerHTML en el JSX porque se ejecuta en cada render
  useEffect(() => {
    if (!svgContainerRef.current) return

    // Cargar el SVG y eliminar reglas :hover (manejadas con JavaScript)
    fetch('/mapa-italia.svg')
      .then((response) => response.text())
      .then((data) => {
        let cleanedSvg = data

        // SOLUCIÓN DEFINITIVA: Eliminar TODO el contenido del elemento <style>
        // y añadir las reglas base con colores originales pero sin :hover (manejado con JS)
        cleanedSvg = cleanedSvg.replace(
          /<style[^>]*>[\s\S]*?<\/style>/gi,
          `<style>
            .land {
              fill: #c4b896;
              stroke: #2a2a2a;
              stroke-width: 2;
              cursor: pointer;
              transition: fill 0.3s;
            }
            .sea {
              fill: #8ab4d6;
              stroke: #4a7fa0;
              stroke-width: 1.5;
              stroke-dasharray: 5,3;
              cursor: pointer;
            }
            .label {
              font-family: 'Georgia', serif;
              font-size: 13px;
              fill: #1a1a1a;
              font-weight: bold;
              text-anchor: middle;
              pointer-events: none;
            }
            .sea-label {
              font-family: 'Georgia', serif;
              font-size: 12px;
              fill: #1a4d7a;
              font-style: italic;
              text-anchor: middle;
              pointer-events: none;
            }
            .code {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              fill: #444;
              text-anchor: middle;
              pointer-events: none;
            }
          </style>`
        )

        // Setear innerHTML directamente en el ref, NO en el JSX
        // Esto previene que React reemplace el contenido en cada render
        svgContainerRef.current.innerHTML = cleanedSvg

        // Notificar que el SVG está listo
        setSvgContent(cleanedSvg)
      })
      .catch((error) => console.error('Error loading SVG:', error))
  }, [])

  // Event handlers estables con useCallback para prevenir re-renders innecesarios
  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as SVGElement

    // Verificar si es una provincia (land o sea)
    if (target.classList.contains('land') || target.classList.contains('sea')) {
      const provinceId = target.id

      if (provinceId && onProvinceClick) {
        onProvinceClick(provinceId)
      }
    }
  }, [onProvinceClick])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const target = e.target as SVGElement

    if (target.classList.contains('land') || target.classList.contains('sea')) {
      const provinceId = target.id
      // Usar ref para evitar re-renders del useEffect
      if (provinceId && provinceId !== hoveredProvinceRef.current) {
        hoveredProvinceRef.current = provinceId
        setHoveredProvince(provinceId) // Solo para el tooltip UI
      }
    } else {
      if (hoveredProvinceRef.current !== null) {
        hoveredProvinceRef.current = null
        setHoveredProvince(null)
      }
    }
  }, [])

  // Manejar hover effect con JavaScript (sin depender de CSS :hover)
  const handleMouseEnter = useCallback((e: MouseEvent) => {
    const target = e.target as SVGElement

    if (target.classList.contains('land') || target.classList.contains('sea')) {
      const element = target as HTMLElement

      // Aplicar efecto hover manualmente con JavaScript
      // Si la provincia tiene facción, aumentar opacidad en vez de brightness
      const hasFaction = element.hasAttribute('data-faction-color')

      if (hasFaction) {
        // Provincia con facción: aumentar opacidad para intensificar color
        element.style.setProperty('fill-opacity', '0.7', 'important')
      } else {
        // Provincia neutral: aplicar brightness
        element.style.filter = 'brightness(1.3)'
      }

      // Siempre aplicar borde blanco para indicar hover
      element.style.stroke = '#ffffff'
      element.style.strokeWidth = '2'
    }
  }, [])

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    const target = e.target as SVGElement

    if (target.classList.contains('land') || target.classList.contains('sea')) {
      const element = target as HTMLElement

      // Remover efecto hover
      const hasFaction = element.hasAttribute('data-faction-color')

      if (hasFaction) {
        // Provincia con facción: restaurar opacidad original
        element.style.setProperty('fill-opacity', '0.4', 'important')
      } else {
        // Provincia neutral: limpiar brightness
        element.style.filter = ''
      }

      // Siempre limpiar el borde
      element.style.stroke = ''
      element.style.strokeWidth = ''
    }
  }, [])

  useEffect(() => {
    if (!svgContent || !svgContainerRef.current) return

    const container = svgContainerRef.current

    // Añadir event listeners al contenedor
    // NOTA: Usar mouseover/mouseout en vez de mouseenter/mouseleave porque estos SÍ hacen bubble
    container.addEventListener('click', handleClick, true)
    container.addEventListener('mousemove', handleMouseMove, true)
    container.addEventListener('mouseover', handleMouseEnter, true)
    container.addEventListener('mouseout', handleMouseLeave, true)

    // Cleanup
    return () => {
      container.removeEventListener('click', handleClick, true)
      container.removeEventListener('mousemove', handleMouseMove, true)
      container.removeEventListener('mouseover', handleMouseEnter, true)
      container.removeEventListener('mouseout', handleMouseLeave, true)
    }
  }, [svgContent, handleClick, handleMouseMove, handleMouseEnter, handleMouseLeave]) // Handlers estables con useCallback

  // Colorear provincias según facción controladora
  useEffect(() => {
    if (!svgContainerRef.current || !svgContent) return

    const container = svgContainerRef.current
    const allProvinces = container.querySelectorAll('.land')

    allProvinces.forEach((el) => {
      const element = el as HTMLElement
      const provinceId = element.id
      const factionId = provinceFaction[provinceId]

      if (factionId) {
        // Provincia controlada por facción - aplicar color de facción
        const factionColor = getFactionColor(factionId)

        element.setAttribute('data-faction-color', factionColor)
        element.setAttribute('fill', factionColor)
        element.style.setProperty('fill', factionColor, 'important')
        element.style.setProperty('fill-opacity', '0.4', 'important')
      } else {
        // Provincia neutral - mantener color original del SVG
        element.removeAttribute('data-faction-color')
      }
    })
  }, [svgContent, provinceFaction])

  // Resaltar provincia seleccionada
  useEffect(() => {
    if (!svgContainerRef.current) return

    const container = svgContainerRef.current

    // Limpiar selección anterior
    const previousSelected = container.querySelector('[data-selected="true"]')
    if (previousSelected) {
      const el = previousSelected as HTMLElement
      el.removeAttribute('data-selected')
      el.style.stroke = ''
      el.style.strokeWidth = ''

      // Restaurar color de facción si existe, o aplicar color default del SVG si es neutral
      const factionColor = el.getAttribute('data-faction-color')
      if (factionColor) {
        // Provincia con facción: restaurar color de facción
        el.style.setProperty('fill', factionColor, 'important')
        el.style.setProperty('fill-opacity', '0.4', 'important')
      } else {
        // Provincia neutral: aplicar color default del SVG según su tipo
        if (el.classList.contains('land')) {
          el.style.setProperty('fill', '#c4b896', 'important') // Beige para tierra
        } else if (el.classList.contains('sea')) {
          el.style.setProperty('fill', '#8ab4d6', 'important') // Azul para mar
        }
        el.style.setProperty('fill-opacity', '1', 'important')
      }
    }

    if (!selectedProvince) return

    // Aplicar selección a la provincia actual
    const provinceElement = container.querySelector(`#${selectedProvince}`) as HTMLElement
    if (provinceElement) {
      provinceElement.setAttribute('data-selected', 'true')
      provinceElement.style.setProperty('fill', '#ffd700', 'important')
      provinceElement.style.setProperty('fill-opacity', '0.6', 'important')
      provinceElement.style.stroke = '#ff6b00'
      provinceElement.style.strokeWidth = '4'
    }
  }, [selectedProvince])

  return (
    <div className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden">
      {/* Controles */}
        <div className="absolute top-4 right-4 z-10 bg-gray-900/90 rounded-lg p-2 space-y-2">
        <div className="text-white text-sm font-medium px-2">Controles</div>
        <div className="text-gray-400 text-xs px-2">
          <div>🖱️ Arrastrar: Mover mapa</div>
          <div>🔍 Scroll: Zoom</div>
          <div>👆 Click: Seleccionar</div>
        </div>
      </div>

      {/* Info de provincia hover */}
      {hoveredProvince && (
        <div className="absolute top-4 left-4 z-10 bg-gray-900/90 rounded-lg p-3 text-white">
          <div className="font-bold text-lg">{hoveredProvince}</div>
          <div className="text-sm text-gray-400">Hover sobre provincia</div>
        </div>
      )}

      {/* Info de provincia seleccionada */}
      {selectedProvince && (
        <div className="absolute bottom-4 left-4 z-10 bg-blue-900/90 rounded-lg p-3 text-white border-2 border-blue-500">
          <div className="font-bold text-lg">{selectedProvince}</div>
          <div className="text-sm text-blue-300">Provincia seleccionada</div>
        </div>
      )}

      {/* Mapa con zoom y pan */}
      <TransformWrapper
        initialScale={0.6}
        minScale={0.3}
        maxScale={4}
        centerOnInit
        limitToBounds={false}
        wheel={{ step: 0.1 }}
        doubleClick={{ mode: 'reset' }}
        panning={{
          disabled: false,
          velocityDisabled: true
        }}
      >
        {() => (
          <>
            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full flex items-center justify-center"
              wrapperStyle={{ width: '100%', height: '100%' }}
            >
              <div className="relative">
                {/* Mapa base - el div SIEMPRE debe existir para que el ref funcione */}
                <div
                  ref={svgContainerRef}
                  className="svg-container pointer-events-auto"
                  style={{
                    pointerEvents: 'auto',
                    userSelect: 'none'
                  }}
                >
                  {/* SVG se inserta vía ref.innerHTML en useEffect, NO con dangerouslySetInnerHTML */}
                  {/* Esto previene que React reemplace el contenido en cada render */}
                </div>

                {/* Loading state */}
                {!svgContent && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="animate-pulse">Cargando mapa...</div>
                  </div>
                )}

                {/* Overlay de marcadores de eventos - solo cuando el SVG está cargado */}
                {svgContent && famineProvinces.length > 0 && (
                    <svg
                      className="absolute top-0 left-0 pointer-events-none"
                      width="1200"
                      height="1400"
                      viewBox="0 0 1200 1400"
                      style={{ pointerEvents: 'none' }}
                    >
                      {famineProvinces.map((provinceId) => {
                        const coords = getProvinceCoordinates(provinceId)
                        if (!coords) return null

                        return (
                          <g key={`famine-${provinceId}`}>
                            {/* Icono de trigo/hambre */}
                            <circle
                              cx={coords.x - 20}
                              cy={coords.y - 25}
                              r="14"
                              fill="#8B4513"
                              stroke="#FFA500"
                              strokeWidth="2"
                              opacity="0.9"
                            />
                            <text
                              x={coords.x - 20}
                              y={coords.y - 21}
                              fontSize="16"
                              textAnchor="middle"
                              fill="#FFF"
                              fontWeight="bold"
                            >
                              🌾
                            </text>
                            {/* Label "Hambre" */}
                            <text
                              x={coords.x - 20}
                              y={coords.y - 5}
                              fontSize="10"
                              textAnchor="middle"
                              fill="#FFA500"
                              fontWeight="bold"
                              style={{ textShadow: '1px 1px 2px black' }}
                            >
                              Hambre
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  )}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  )
}
