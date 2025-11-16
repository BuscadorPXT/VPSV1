// Load environment variables from .env file
require('dotenv').config({ path: '/home/buscadorpxt/buscadorpxt/.env' });

module.exports = {
  apps: [{
    name: 'buscadorpxt',
    script: './dist/index.js',
    cwd: '/home/buscadorpxt/buscadorpxt',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      // Explicitly pass all environment variables from .env
      ...process.env
    },
    max_memory_restart: '1G',
    autorestart: true,
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    watch: false
  }]
};