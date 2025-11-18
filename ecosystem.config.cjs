module.exports = {
  apps: [{
    name: 'buscadorpxt',
    script: './dist/index.js',
    instances: 2, // ou 'max' para usar todos os CPUs
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    // Configurações para zero-downtime
    wait_ready: true,           // Aguarda sinal de "ready" antes de considerar iniciado
    listen_timeout: 10000,      // 10 segundos para a aplicação iniciar
    kill_timeout: 5000,         // 5 segundos para fechar gracefully
    max_memory_restart: '500M', // Reinicia se ultrapassar 500MB

    // Logs
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Restart policies
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Graceful shutdown
    merge_logs: true,
    watch: false
  }]
};
