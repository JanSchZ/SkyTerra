#!/usr/bin/env node
/* eslint-env node */

/**
 * Script de configuración de variables de entorno para SkyTerra Frontend
 * 
 * Este script ayuda a configurar las variables de entorno necesarias
 * de forma segura siguiendo las mejores prácticas de Mapbox.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_FILE = path.join(__dirname, '.env');
const ENV_EXAMPLE_FILE = path.join(__dirname, 'env.example');

console.log('🔧 Configurando entorno de SkyTerra Frontend...\n');

// Verificar si ya existe .env
if (fs.existsSync(ENV_FILE)) {
  console.log('⚠️  El archivo .env ya existe.');
  console.log('   Si necesitas reconfigurarlo, elimínalo primero.\n');
  process.exit(0);
}

// Verificar si existe env.example
if (!fs.existsSync(ENV_EXAMPLE_FILE)) {
  console.error('❌ No se encontró env.example');
  console.error('   Asegúrate de estar en el directorio correcto.\n');
  process.exit(1);
}

// Copiar env.example a .env
try {
  fs.copyFileSync(ENV_EXAMPLE_FILE, ENV_FILE);
  console.log('✅ Archivo .env creado desde env.example');
} catch (error) {
  console.error('❌ Error al crear .env:', error.message);
  process.exit(1);
}

// Mostrar instrucciones
console.log('\n📋 Próximos pasos:');
console.log('');
console.log('1. Edita el archivo .env y configura las siguientes variables:');
console.log('');
console.log('   📍 Mapbox (requerido):');
console.log('   VITE_MAPBOX_ACCESS_TOKEN=tu_token_aqui');
console.log('');
console.log('   💳 Stripe (para pagos):');
console.log('   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_tu_publishable_key_aqui');
console.log('   Nota: Los price IDs ya están configurados para los planes recurrentes.');
console.log('');
console.log('2. Para obtener tokens:');
console.log('   📍 Mapbox: https://console.mapbox.com/account/access-tokens/');
console.log('   💳 Stripe: https://dashboard.stripe.com/apikeys');
console.log('');
console.log('3. Configuración recomendada:');
console.log('   📍 Mapbox: Scopes: styles:read, fonts:read');
console.log('   📍 Mapbox: Restricciones URL: http://localhost:*, tu-dominio.com/*');
console.log('   💳 Stripe: Usa la publishable key de TEST para desarrollo');
console.log('');
console.log('4. Reinicia el servidor de desarrollo después de configurar.');
console.log('');
console.log('📖 Para más información consulta: apps/web/SECURITY.md');
console.log('');
console.log('✨ ¡Configuración completada!'); 
