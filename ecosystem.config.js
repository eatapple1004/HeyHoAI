// PM2 앱 정의 — prod + staging (같은 EC2, 다른 포트/환경/DB).
//   prod    : heyhoai          · NODE_ENV=production · .env(또는 .env.production) · 포트=.env의 PORT(기본 3000)
//   staging : heyhoai-staging  · NODE_ENV=staging    · .env.staging               · 포트 3001
//   개별 기동:  pm2 start ecosystem.config.js --only heyhoai
//              pm2 start ecosystem.config.js --only heyhoai-staging
module.exports = {
  apps: [
    {
      name: 'heyhoai',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'heyhoai-staging',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'staging',
        // PORT는 .env.staging에서 3001로 지정됨(config가 로드). 명시하려면 아래 주석 해제.
        // PORT: 3001,
      },
    },
  ],
};
