module.exports = {
  apps: [{
    name: 'historyAiBot',
    script: './index.js',
    instances: 1,
    exec_mode: 'cluster',
    watch: true,
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
