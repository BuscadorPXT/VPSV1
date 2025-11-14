// ========================================
// BUSCADOR PXT - PM2 ECOSYSTEM CONFIG
// Production Configuration for VPS
// ========================================

module.exports = {
  apps: [{
    // Informações básicas
    name: 'buscadorpxt',
    script: './dist/index.js',

    // Working directory
    cwd: '/home/buscadorpxt/buscadorpxt',

    // Modo de execução
    instances: 2,  // 2 instâncias para load balancing
    exec_mode: 'cluster',  // Cluster mode para usar múltiplos cores

    // Variáveis de ambiente
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },

    // Logs
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,  // Adicionar timestamp nos logs
    merge_logs: true,  // Combinar logs de todas as instâncias

    // Gestão de memória
    max_memory_restart: '1G',  // Reiniciar se usar mais de 1GB

    // Auto-restart
    autorestart: true,
    max_restarts: 10,  // Máximo de 10 restarts em 1 minuto
    min_uptime: '10s',  // Considerar "online" após 10 segundos

    // Watch (desabilitado em produção)
    watch: false,

    // Comportamento de restart
    kill_timeout: 5000,  // Aguardar 5s antes de SIGKILL
    listen_timeout: 10000,  // Aguardar 10s para a app iniciar

    // Node.js args (opcional)
    node_args: [
      '--max-old-space-size=2048'  // Limitar heap do Node.js a 2GB
    ],

    // Restart delay
    restart_delay: 4000,  // Aguardar 4s entre restarts

    // Cron restart (opcional - reiniciar 1x por dia às 4h da manhã)
    // cron_restart: '0 4 * * *',

    // Expor métricas (para PM2 Plus/monitoramento)
    pmx: true,

    // Comportamento de graceful reload
    wait_ready: true,  // Aguardar sinal "ready" do app

    // Comportamento de shutdown
    shutdown_with_message: true
  }]
};

// ========================================
// USO:
// ========================================
//
// Iniciar:
//   pm2 start ecosystem.config.js
//
// Status:
//   pm2 status
//
// Logs:
//   pm2 logs buscadorpxt
//   pm2 logs buscadorpxt --lines 100
//
// Monitorar:
//   pm2 monit
//
// Restart:
//   pm2 restart buscadorpxt
//
// Reload (zero-downtime):
//   pm2 reload buscadorpxt
//
// Stop:
//   pm2 stop buscadorpxt
//
// Delete:
//   pm2 delete buscadorpxt
//
// Salvar configuração:
//   pm2 save
//
// Listar processos:
//   pm2 list
//
// Informações detalhadas:
//   pm2 info buscadorpxt
//
// ========================================
