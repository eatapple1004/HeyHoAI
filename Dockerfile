# Doppia (HeyHoAI) — Express/Node + pg + ffmpeg.wasm
# 단일 스테이지: @ffmpeg/core·@ffmpeg/util·@ffmpeg/ffmpeg 의 dist/esm 가
# 런타임에 node_modules 에서 그대로 서빙되므로(/vendor/ffmpeg*) prune 금지.
FROM node:20-slim

# ffmpeg.wasm 는 순수 wasm 라 OS 패키지 불필요.
# pg 는 connectionString 으로 동작(네이티브 빌드 불필요).
ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# 1) 의존성만 먼저 복사해 레이어 캐시 활용
#    package-lock.json 기준 재현 설치. devDependencies 가 없으므로 --omit=dev 로
#    경량화하되, @ffmpeg/* 는 dependencies 에 있어 그대로 유지된다(서빙에 필요).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 2) 애플리케이션 소스 복사 (.dockerignore 로 불필요 항목 제외)
COPY . .

# 3) 정적 서빙 대상 런타임 디렉터리 보장 (tmp/images, tmp/bgm)
RUN mkdir -p tmp/images tmp/bgm

# PORT 환경변수와 일치(플랫폼이 PORT 를 주입하면 그 값을 따른다)
EXPOSE 3000

# 컨테이너 PID 1 = node. process.cwd() = /app 이라 정적/vendor 경로가 맞는다.
CMD ["node", "src/index.js"]
