import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configuração mais robusta com timeouts e reconexão
const client = postgres(process.env.DATABASE_URL, { 
  ssl: 'require',
  idle_timeout: 30,        // Aumentado para 30s
  max_lifetime: 60 * 60,   // Aumentado para 1 hora
  max: 5,                  // Reduzido para evitar sobrecarga
  connection: {
    application_name: 'buscador-pxt'
  },
  // Reconexão automática melhorada
  onnotice: () => {},
  transform: postgres.camel,
  // Timeouts mais conservadores
  query_timeout: 15,       // Reduzido para 15s
  connect_timeout: 5,      // Reduzido para 5s
  prepare: false,          // Desabilitar prepared statements para melhor compatibilidade
  // Configuração de retry
  socket_timeout: 0,
  // Log de erros para debug
  debug: process.env.NODE_ENV === 'development',
  onclose: () => {
    console.log('🔌 Database connection closed');
  },
  onconnect: () => {
    console.log('✅ Database connection established');
  }
});

// Error handling para reconexão
client.on?.('error', (err) => {
  console.error('❌ Database connection error:', err.message);
});

export const db = drizzle(client, { schema });