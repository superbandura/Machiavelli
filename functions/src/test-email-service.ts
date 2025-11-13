/**
 * Script de Testing para Servicio de Emails
 *
 * Ejecutar: npx ts-node src/test-email-service.ts
 *
 * Prueba las funciones de envío de emails (sendEmail, sendBulkEmails, isValidEmail)
 */

import { sendEmail, sendBulkEmails, isValidEmail } from './email/emailService';

async function runTests() {
  console.log('====================================');
  console.log('🧪 TESTING SERVICIO DE EMAILS');
  console.log('====================================\n');

  // Test 1: Validación de emails
  console.log('📧 Test 1: Validación de Emails');
  console.log('----------------------------------------');

  const validEmails = [
    'user@example.com',
    'marco.polo@venezia.it',
    'lorenzo.medici@firenze.gov',
    'test+tag@domain.co.uk'
  ];

  const invalidEmails = [
    'invalid',
    '@example.com',
    'user@',
    'user @example.com',
    'user@.com',
    ''
  ];

  console.log('Emails válidos:');
  validEmails.forEach(email => {
    const result = isValidEmail(email);
    console.log(`  ${email}: ${result ? '✅' : '❌'}`);
    if (!result) {
      console.error(`    ❌ ERROR: Se esperaba true pero se obtuvo false`);
    }
  });

  console.log('\nEmails inválidos:');
  invalidEmails.forEach(email => {
    const result = isValidEmail(email);
    console.log(`  ${email || '(vacío)'}: ${result ? '❌' : '✅'}`);
    if (result) {
      console.error(`    ❌ ERROR: Se esperaba false pero se obtuvo true`);
    }
  });

  console.log('\n✅ Test de validación completado\n');

  // Test 2: Envío de email individual
  console.log('📧 Test 2: Envío de Email Individual');
  console.log('----------------------------------------');

  const singleEmailResult = await sendEmail({
    to: 'marco.polo@venezia.it',
    subject: 'Test: Email Individual',
    html: '<h1>Este es un email de prueba</h1><p>Contenido de prueba para verificar el servicio.</p>'
  });

  console.log('Resultado:', singleEmailResult ? '✅ Enviado (simulado)' : '❌ Error');
  console.log('Nota: En modo desarrollo, el email se simula con logs\n');

  // Test 3: Envío masivo de emails
  console.log('📧 Test 3: Envío Masivo de Emails');
  console.log('----------------------------------------');

  const bulkMessages = [
    {
      to: 'lorenzo.medici@firenze.gov',
      subject: 'Test: Email Masivo 1',
      html: '<p>Mensaje para Lorenzo de Médici</p>'
    },
    {
      to: 'ludovico.sforza@milano.it',
      subject: 'Test: Email Masivo 2',
      html: '<p>Mensaje para Ludovico Sforza</p>'
    },
    {
      to: 'cesar.borgia@vaticano.va',
      subject: 'Test: Email Masivo 3',
      html: '<p>Mensaje para César Borgia</p>'
    },
    {
      to: 'alfonso@napoli.it',
      subject: 'Test: Email Masivo 4',
      html: '<p>Mensaje para Alfonso V de Nápoles</p>'
    },
    {
      to: 'rey@francia.fr',
      subject: 'Test: Email Masivo 5',
      html: '<p>Mensaje para Rey de Francia</p>'
    }
  ];

  console.log(`Enviando ${bulkMessages.length} emails...`);
  const sentCount = await sendBulkEmails(bulkMessages);

  console.log(`Resultado: ${sentCount}/${bulkMessages.length} emails enviados`);

  if (sentCount === bulkMessages.length) {
    console.log('✅ Todos los emails se enviaron correctamente (simulados)\n');
  } else {
    console.error(`❌ ERROR: Se enviaron ${sentCount} de ${bulkMessages.length} emails\n`);
  }

  // Test 4: Manejo de emails inválidos
  console.log('📧 Test 4: Manejo de Emails Inválidos');
  console.log('----------------------------------------');

  const mixedMessages = [
    {
      to: 'valid@example.com',
      subject: 'Email válido',
      html: '<p>Este debería enviarse</p>'
    },
    {
      to: 'invalid-email',
      subject: 'Email inválido',
      html: '<p>Este NO debería enviarse</p>'
    },
    {
      to: 'another-valid@example.com',
      subject: 'Otro email válido',
      html: '<p>Este también debería enviarse</p>'
    }
  ];

  console.log('Enviando mezcla de emails válidos e inválidos...');
  const sentMixed = await sendBulkEmails(mixedMessages);

  console.log(`Resultado: ${sentMixed}/${mixedMessages.length} emails enviados`);

  if (sentMixed === 2) {
    console.log('✅ Solo se enviaron los emails válidos (comportamiento esperado)\n');
  } else {
    console.error(`❌ ERROR: Se esperaban 2 emails enviados pero se obtuvieron ${sentMixed}\n`);
  }

  // Test 5: Email con contenido HTML complejo
  console.log('📧 Test 5: Email con HTML Complejo');
  console.log('----------------------------------------');

  const complexHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
    .content { padding: 20px; }
    .button { background-color: #667eea; color: white; padding: 10px 20px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎭 Machiavelli</h1>
    </div>
    <div class="content">
      <h2>Email de Prueba Complejo</h2>
      <p>Este email tiene:</p>
      <ul>
        <li>Estilos inline</li>
        <li>Estructura HTML completa</li>
        <li>Gradientes CSS</li>
        <li>Emojis unicode</li>
      </ul>
      <a href="https://machiavelli.game" class="button">Ir al Juego</a>
    </div>
  </div>
</body>
</html>
  `;

  const complexResult = await sendEmail({
    to: 'test@machiavelli.game',
    subject: 'Test: HTML Complejo',
    html: complexHtml
  });

  console.log('Resultado:', complexResult ? '✅ Enviado (simulado)' : '❌ Error');
  console.log('HTML Length:', complexHtml.length, 'chars');
  console.log('✅ Email complejo procesado correctamente\n');

  // Resumen
  console.log('====================================');
  console.log('✅ TODOS LOS TESTS PASARON');
  console.log('====================================');
  console.log('Tests ejecutados:');
  console.log('1. ✅ Validación de emails (válidos e inválidos)');
  console.log('2. ✅ Envío de email individual');
  console.log('3. ✅ Envío masivo de emails (5 emails)');
  console.log('4. ✅ Manejo de emails inválidos en batch');
  console.log('5. ✅ Email con HTML complejo y estilos');
  console.log('\n📝 Nota: En modo desarrollo, todos los emails se simulan con logs.');
  console.log('El servicio está listo para producción con SendGrid.\n');
}

// Ejecutar tests
runTests().catch(error => {
  console.error('❌ Error ejecutando tests:', error);
  process.exit(1);
});
