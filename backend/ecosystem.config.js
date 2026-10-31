module.exports = {
  apps: [
    {
      name: 'api',
      cwd: '/home/<usuario>/apps/backend',
      script: 'dist/server.js',
      env: { NODE_ENV: 'production' },
      out_file: '/home/<usuario>/apps/logs/api.out.log',
      error_file: '/home/<usuario>/apps/logs/api.err.log',
      max_memory_restart: '256M'
    },
    {
      name: 'reminders',
      cwd: '/home/<usuario>/apps/backend',
      script: 'dist/jobs/reminders-worker.entry.js',
      env: { NODE_ENV: 'production' },
      out_file: '/home/<usuario>/apps/logs/reminders.out.log',
      error_file: '/home/<usuario>/apps/logs/reminders.err.log',
      max_memory_restart: '128M'
    },
    {
      name: 'whatsapp-inbox',
      cwd: '/home/<usuario>/apps/backend',
      script: 'dist/jobs/whatsapp-inbox-worker.entry.js',
      env: { NODE_ENV: 'production' },
      out_file: '/home/<usuario>/apps/logs/whatsapp-inbox.out.log',
      error_file: '/home/<usuario>/apps/logs/whatsapp-inbox.err.log',
      max_memory_restart: '128M'
    }
  ]
}
