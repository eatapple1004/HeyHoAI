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
      // 🔴 350M → 700M (2026-08-19). 350M에서 콘텐츠팩 생성이 반복적으로 죽었다.
      //   원본 사진을 읽어 R2 업로드 + 비전 호출용 base64(원본의 약 1.33배)를 만드는 구간에서
      //   순간 388~558MB까지 튀고, pm2가 SIGINT로 끊는다. 예외가 아니라 외부 종료라
      //   **로그에 스택이 안 남고** prepPack의 catch도 안 돌아, 팩이 'processing'인 채로 남았다.
      //   실측(~/.pm2/pm2.log): 하루 8회 "exceeds --max-memory-restart" — dev만 팩을 실제로 돌린다.
      //   서버 여유 2.7GB라 700M은 안전. 근본 해결은 이미지 처리 메모리를 줄이는 것(별건).
      max_memory_restart: '700M',
      env: { NODE_ENV: 'development' }, // PORT는 .env.development(3002)에서 로드
    },
  ],
};
