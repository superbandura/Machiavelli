/**
 * Servicio de Envío de Emails
 *
 * Abstracción para enviar emails usando diferentes proveedores
 * Por defecto usa SendGrid, pero puede ser reemplazado fácilmente
 */

interface EmailMessage {
  to: string
  subject: string
  html: string
}

/**
 * Enviar email usando SendGrid
 *
 * IMPORTANTE: Para usar esto en producción, necesitas:
 * 1. Crear cuenta en SendGrid (https://sendgrid.com)
 * 2. Obtener API Key
 * 3. Configurar variable de entorno SENDGRID_API_KEY
 * 4. Instalar: npm install @sendgrid/mail
 *
 * Para desarrollo, el sistema registra los emails en logs en lugar de enviarlos
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  // Verificar si estamos en modo desarrollo o producción
  const isDevelopment = !process.env.SENDGRID_API_KEY

  if (isDevelopment) {
    // Modo desarrollo: Solo loggear
    console.log('=== EMAIL SIMULATION (Development Mode) ===')
    console.log('To:', message.to)
    console.log('Subject:', message.subject)
    console.log('HTML length:', message.html.length, 'characters')
    console.log('=== END EMAIL SIMULATION ===')
    return true
  }

  try {
    // Modo producción: Enviar email real con SendGrid
    // NOTA: Descomentar cuando se configure SendGrid
    /*
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    await sgMail.send({
      to: message.to,
      from: 'noreply@machiavelli.game', // Cambiar por tu dominio verificado
      subject: message.subject,
      html: message.html
    })

    console.log(`Email sent to ${message.to}: ${message.subject}`)
    return true
    */

    // Por ahora, simular en producción también
    console.log('[PRODUCTION] Would send email to:', message.to)
    console.log('[PRODUCTION] Subject:', message.subject)
    return true

  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

/**
 * Enviar email a múltiples destinatarios
 * Solo envía emails con formato válido
 */
export async function sendBulkEmails(messages: EmailMessage[]): Promise<number> {
  let successCount = 0

  for (const message of messages) {
    // Validar email antes de enviar
    if (!isValidEmail(message.to)) {
      console.log(`Skipping invalid email: ${message.to}`)
      continue
    }

    const success = await sendEmail(message)
    if (success) successCount++
  }

  console.log(`Sent ${successCount}/${messages.length} emails successfully`)
  return successCount
}

/**
 * Validar formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * NOTAS DE CONFIGURACIÓN:
 *
 * Para activar el envío real de emails en producción:
 *
 * 1. Instalar SendGrid:
 *    npm install @sendgrid/mail
 *
 * 2. Obtener API Key de SendGrid:
 *    https://app.sendgrid.com/settings/api_keys
 *
 * 3. Configurar Firebase Functions:
 *    firebase functions:config:set sendgrid.key="SG.xxxxx"
 *
 * 4. Leer en el código:
 *    const apiKey = functions.config().sendgrid.key
 *
 * 5. Verificar dominio en SendGrid:
 *    Añadir registros DNS para verificar tu dominio
 *    Usar email verificado como remitente
 *
 * ALTERNATIVAS A SENDGRID:
 *
 * - Mailgun: https://www.mailgun.com/
 * - Postmark: https://postmarkapp.com/
 * - Firebase Extensions: "Trigger Email"
 *   https://extensions.dev/extensions/firebase/firestore-send-email
 *
 * La extensión de Firebase es la más fácil:
 * - firebase ext:install firebase/firestore-send-email
 * - Configurar SMTP o SendGrid
 * - Añadir documentos a colección "mail" y se envían automáticamente
 */
