/**
 * Plantillas HTML para emails del juego
 *
 * Sistema de notificaciones para mantener a los jugadores informados
 */

interface EmailData {
  playerName: string
  gameName: string
  gameId: string
  gameUrl: string
}

interface PhaseChangeData extends EmailData {
  newPhase: string
  deadline: string
  turnNumber: number
  year: number
  season: string
}

interface ReminderData extends EmailData {
  currentPhase: string
  hoursRemaining: number
  deadline: string
}

interface InactivityWarningData extends EmailData {
  missedTurns: number
  maxStrikes: number
}

interface GameEndedData extends EmailData {
  winner: string
  victoryType: string
  finalTurn: number
}

/**
 * Plantilla base con estilos
 */
const getBaseTemplate = (content: string): string => {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Machiavelli - Notificación</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #1a1a1a;
      color: #ffffff;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #2d2d2d;
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      color: #ffffff;
    }
    .content {
      padding: 30px;
    }
    .content p {
      line-height: 1.6;
      margin: 15px 0;
      color: #e0e0e0;
    }
    .button {
      display: inline-block;
      padding: 15px 30px;
      margin: 20px 0;
      background-color: #667eea;
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      text-align: center;
    }
    .button:hover {
      background-color: #5568d3;
    }
    .info-box {
      background-color: #3d3d3d;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-box {
      background-color: #3d2d2d;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background-color: #1a1a1a;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #888888;
    }
    .game-info {
      background-color: #3d3d3d;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .game-info strong {
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎭 Machiavelli</h1>
    </div>
    ${content}
    <div class="footer">
      <p>Este es un email automático de Machiavelli.</p>
      <p>Si no deseas recibir estas notificaciones, puedes desactivarlas en la configuración del juego.</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Email de cambio de fase
 */
export const getPhaseChangeEmail = (data: PhaseChangeData): { subject: string; html: string } => {
  const phaseNames: Record<string, string> = {
    diplomatic: 'Diplomacia',
    orders: 'Órdenes',
    resolution: 'Resolución'
  }

  const phaseEmojis: Record<string, string> = {
    diplomatic: '💬',
    orders: '⚔️',
    resolution: '⚙️'
  }

  const content = `
    <div class="content">
      <h2>¡Nueva Fase Comenzada!</h2>

      <div class="game-info">
        <p><strong>Partida:</strong> ${data.gameName}</p>
        <p><strong>Turno:</strong> ${data.turnNumber} - ${data.season} ${data.year}</p>
        <p><strong>Nueva Fase:</strong> ${phaseEmojis[data.newPhase]} ${phaseNames[data.newPhase]}</p>
      </div>

      <p>
        ${data.newPhase === 'diplomatic'
          ? 'Es momento de negociar con otros jugadores. Envía mensajes secretos y forma alianzas.'
          : data.newPhase === 'orders'
          ? 'Es hora de dar órdenes a tus unidades. Planifica tus movimientos estratégicos.'
          : 'Las órdenes están siendo procesadas automáticamente. ¡Pronto verás los resultados!'
        }
      </p>

      <div class="info-box">
        <p><strong>⏰ Deadline:</strong> ${data.deadline}</p>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #aaa;">
          Tienes hasta esta fecha para completar tus acciones.
        </p>
      </div>

      <center>
        <a href="${data.gameUrl}" class="button">
          Ir a la Partida
        </a>
      </center>

      <p style="font-size: 14px; color: #aaa; margin-top: 30px;">
        💡 <em>Consejo:</em> Revisa el mapa y las posiciones de tus enemigos antes de actuar.
      </p>
    </div>
  `

  return {
    subject: `[Machiavelli] Nueva fase: ${phaseNames[data.newPhase]} - ${data.gameName}`,
    html: getBaseTemplate(content)
  }
}

/**
 * Email de recordatorio (24h antes del deadline)
 */
export const getReminderEmail = (data: ReminderData): { subject: string; html: string } => {
  const content = `
    <div class="content">
      <h2>⏰ Recordatorio de Deadline</h2>

      <div class="game-info">
        <p><strong>Partida:</strong> ${data.gameName}</p>
      </div>

      <div class="warning-box">
        <p><strong>⚠️ Quedan ${data.hoursRemaining} horas</strong></p>
        <p style="margin: 5px 0 0 0;">
          El deadline es: <strong>${data.deadline}</strong>
        </p>
      </div>

      <p>
        ${data.currentPhase === 'diplomatic'
          ? 'Aún tienes tiempo para enviar mensajes a otros jugadores y formar alianzas.'
          : data.currentPhase === 'orders'
          ? '¡No olvides dar órdenes a todas tus unidades! Las unidades sin órdenes se mantendrán en su posición.'
          : 'La fase de resolución está en progreso.'
        }
      </p>

      <center>
        <a href="${data.gameUrl}" class="button">
          Ir a la Partida
        </a>
      </center>
    </div>
  `

  return {
    subject: `[Machiavelli] ⏰ Quedan ${data.hoursRemaining}h - ${data.gameName}`,
    html: getBaseTemplate(content)
  }
}

/**
 * Email de advertencia de inactividad
 */
export const getInactivityWarningEmail = (data: InactivityWarningData): { subject: string; html: string } => {
  const isLastWarning = data.missedTurns >= data.maxStrikes - 1

  const content = `
    <div class="content">
      <h2>⚠️ Advertencia de Inactividad</h2>

      <div class="game-info">
        <p><strong>Partida:</strong> ${data.gameName}</p>
      </div>

      <div class="warning-box">
        <p><strong>Has faltado a ${data.missedTurns} turno(s) consecutivos</strong></p>
        ${isLastWarning
          ? '<p style="margin: 10px 0 0 0; color: #f59e0b; font-weight: bold;">⚠️ ADVERTENCIA FINAL: Si faltas al próximo turno, serás marcado como inactivo y podrás ser reemplazado o eliminado por votación de otros jugadores.</p>'
          : '<p style="margin: 10px 0 0 0;">Si faltas a ${data.maxStrikes} turnos consecutivos, serás marcado como inactivo.</p>'
        }
      </div>

      <p>Todas tus unidades mantuvieron su posición automáticamente.</p>

      <p>
        <strong>¿Qué ocurre si eres marcado como inactivo?</strong>
      </p>
      <ul style="color: #e0e0e0; line-height: 1.8;">
        <li>Los demás jugadores podrán votar para mantenerte en modo IA, reemplazarte, o eliminarte del juego</li>
        <li>Si te mantienen en modo IA, todas tus unidades seguirán manteniendo posición automáticamente</li>
        <li>Si te eliminan, todas tus unidades serán destruidas y tus territorios quedarán neutrales</li>
      </ul>

      <center>
        <a href="${data.gameUrl}" class="button">
          Volver al Juego Ahora
        </a>
      </center>

      <p style="font-size: 14px; color: #aaa; margin-top: 30px;">
        💡 Si vuelves a enviar órdenes, tu contador de inactividad se reinicia a 0.
      </p>
    </div>
  `

  return {
    subject: `[URGENTE] Advertencia de Inactividad (${data.missedTurns}/${data.maxStrikes}) - ${data.gameName}`,
    html: getBaseTemplate(content)
  }
}

/**
 * Email de fin de partida
 */
export const getGameEndedEmail = (data: GameEndedData): { subject: string; html: string } => {
  const content = `
    <div class="content">
      <h2>🏆 ¡Partida Finalizada!</h2>

      <div class="game-info">
        <p><strong>Partida:</strong> ${data.gameName}</p>
        <p><strong>Turno Final:</strong> ${data.finalTurn}</p>
      </div>

      <div class="info-box">
        <p style="font-size: 20px; margin: 0;">
          👑 <strong>Ganador:</strong> ${data.winner}
        </p>
        <p style="margin: 10px 0 0 0; color: #aaa;">
          Tipo de victoria: ${data.victoryType}
        </p>
      </div>

      <p>
        La partida ha concluido. Puedes ver el resultado final y las estadísticas completas.
      </p>

      <center>
        <a href="${data.gameUrl}" class="button">
          Ver Resultado Final
        </a>
      </center>

      <p style="font-size: 14px; color: #aaa; margin-top: 30px;">
        ¡Gracias por jugar! ¿Listo para otra partida?
      </p>
    </div>
  `

  return {
    subject: `[Machiavelli] 🏆 Partida Finalizada - ${data.winner} ha ganado!`,
    html: getBaseTemplate(content)
  }
}
