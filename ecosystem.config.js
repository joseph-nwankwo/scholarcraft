module.exports = {
  apps: [{
    name: 'scholarcraft-backend',
    script: 'dist/app.js',
    cwd: './backend',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 4001,
    },
    out_file: './logs/backend-out.log',
    error_file: './logs/backend-error.log',
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
  }],
}
