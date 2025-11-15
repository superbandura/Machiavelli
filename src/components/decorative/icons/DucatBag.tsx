interface DucatBagProps {
  className?: string
  filled?: boolean
}

export default function DucatBag({ className = '', filled = true }: DucatBagProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cuerda */}
      <path
        d="M35,20 Q35,10 50,10 Q65,10 65,20"
        stroke="#8B4513"
        strokeWidth="3"
        fill="none"
      />

      {/* Bolsa principal */}
      <path
        d="M30,25 Q25,30 25,50 Q25,75 50,90 Q75,75 75,50 Q75,30 70,25 Z"
        fill={filled ? "#d4af37" : "#b59a5f"}
        stroke="#b8941f"
        strokeWidth="2"
      />

      {/* Detalle de monedas (círculos en relieve) */}
      <circle cx="45" cy="50" r="8" fill="#f0d877" opacity="0.4" />
      <circle cx="60" cy="45" r="6" fill="#f0d877" opacity="0.3" />
      <circle cx="50" cy="65" r="7" fill="#f0d877" opacity="0.35" />

      {/* Sombra interior */}
      <path
        d="M35,30 Q32,40 32,50 Q32,70 50,82"
        stroke="#b8941f"
        strokeWidth="1.5"
        opacity="0.5"
        fill="none"
      />

      {/* Pliegues de tela */}
      <path
        d="M45,28 Q45,35 45,45"
        stroke="#b8941f"
        strokeWidth="1"
        opacity="0.6"
        fill="none"
      />
      <path
        d="M55,28 Q55,35 55,45"
        stroke="#b8941f"
        strokeWidth="1"
        opacity="0.6"
        fill="none"
      />
    </svg>
  )
}
