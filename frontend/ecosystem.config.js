module.exports = {
  apps: [
    {
      name: 'web',
      cwd: '/home/<usuario>/apps/frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production', PORT: 3000 },
      out_file: '/home/<usuario>/apps/logs/web.out.log',
      error_file: '/home/<usuario>/apps/logs/web.err.log',
      max_memory_restart: '256M'
    }
  ]
}
