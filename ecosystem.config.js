// PM2 앱 정의 — prod + staging + dev (같은 EC2, 다른 포트/환경/DB/브랜치 클론).
//   prod    : heyhoai          · NODE_ENV=production  · main    · 포트 3000 · doppia.ai
//   staging : heyhoai-staging  · NODE_ENV=staging     · staging · 포트 3001 · staging.doppia.ai
//   dev     : heyhoai-dev      · NODE_ENV=development  · develop · 포트 3002 · dev.doppia.ai
//   각 환경은 별도 git 클론에서 `--only <name>`으로 기동(클론 디렉터리가 곧 cwd).
//     pm2 start ecosystem.config.js --only heyhoai            # prod 클론(~/HeyHoAI)
//     pm2 start ecosystem.config.js --only heyhoai-staging    # staging 클론(~/HeyHoAI-staging)
//     pm2 start ecosystem.config.js --only heyhoai-dev        # dev 클론(~/HeyHoAI-dev)
module.exports = {
  apps: [
    {
      name: 'heyhoai',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'heyhoai-staging',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env: { NODE_ENV: 'staging' }, // PORT는 .env.staging(3001)에서 로드
    },
    {
      name: 'heyhoai-dev',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env: { NODE_ENV: 'development' }, // PORT는 .env.development(3002)에서 로드
    },
  ],
};
