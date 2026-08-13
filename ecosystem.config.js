// PM2 앱 정의 — prod + staging + dev (같은 EC2, 다른 포트/환경/DB/브랜치 클론).
//   prod    : heyhoai          · NODE_ENV=production  · main    · 포트 3000 · doppia.ai
//   staging : heyhoai-staging  · NODE_ENV=staging     · staging · 포트 3001 · staging.doppia.ai
//   dev     : heyhoai-dev      · NODE_ENV=development  · develop · 포트 3002 · dev.doppia.ai
//   ⚠️ 세 환경 모두 **NestJS(dist/main.js)** 로 부팅한다(2026-08-14 stg·prod 전환).
//      dist/는 커밋되지 않으므로 배포 시 `npm run build`(tsc)가 반드시 선행돼야 한다 — deploy.sh가 처리.
//   각 환경은 별도 git 클론에서 `--only <name>`으로 기동(클론 디렉터리가 곧 cwd).
//     pm2 start ecosystem.config.js --only heyhoai            # prod 클론(~/HeyHoAI)
//     pm2 start ecosystem.config.js --only heyhoai-staging    # staging 클론(~/HeyHoAI-staging)
//     pm2 start ecosystem.config.js --only heyhoai-dev        # dev 클론(~/HeyHoAI-dev)
module.exports = {
  apps: [
    {
      // NestJS(strangler) 부팅 — dist/main.js가 Nest를 띄우고 미매칭 요청만 레거시 Express로 흘린다.
      name: 'heyhoai',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'heyhoai-staging',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env: { NODE_ENV: 'staging' }, // PORT는 .env.staging(3001)에서 로드
    },
    {
      name: 'heyhoai-dev',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env: { NODE_ENV: 'development' }, // PORT는 .env.development(3002)에서 로드
    },
  ],
};
