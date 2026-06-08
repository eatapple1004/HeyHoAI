# 도메인 연결 가이드 — doppia.ai / Cloudflare + EC2 (nginx, Full Strict)

구성: **Cloudflare(주황 프록시, Full Strict)** → **nginx(443, Origin 인증서)** → **Doppia 앱(127.0.0.1:3000, PM2)**

> EC2에는 다른 앱이 자기 포트로 같이 떠 있음 — nginx는 도메인(server_name)으로 구분하므로
> doppia.ai 트래픽만 :3000으로 보내고, 다른 앱(다른 포트)은 그대로 둠. `13.209.72.131`는 EC2 퍼블릭 IP.

---

## 1. Cloudflare — doppia.ai 존 추가 + DNS
1. Cloudflare에 **doppia.ai** 사이트 추가 → 도메인 등록기관 네임서버를 Cloudflare 것으로 변경.
2. DNS 레코드 (둘 다 **Proxied / 주황 구름**):
   - `A`  `@`    → `13.209.72.131`
   - `A`  `www`  → `13.209.72.131`
   > EC2 퍼블릭 IP는 재부팅 시 바뀔 수 있음 → **Elastic IP(고정 IP)** 할당 후 그 값 사용 권장.

## 2. Cloudflare — SSL/TLS
1. **SSL/TLS → Overview → Full (Strict)**.
2. **SSL/TLS → Origin Server → Create Certificate** → 호스트명에 `doppia.ai`, `*.doppia.ai` 포함해 발급.
   - Origin Certificate(cert) + Private Key 복사.

## 3. EC2 — 보안 그룹
- `443`, `80` ← 0.0.0.0/0 (또는 Cloudflare IP 대역).
- `3000`은 외부 차단(nginx가 내부에서만 접근). 다른 앱 포트는 기존대로.

## 4. EC2 — Origin 인증서 저장
```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/doppia.pem   # Origin Certificate 붙여넣기
sudo nano /etc/ssl/cloudflare/doppia.key   # Private Key 붙여넣기
sudo chmod 600 /etc/ssl/cloudflare/doppia.key
```

## 5. EC2 — nginx 설치 + 설정
```bash
sudo apt update && sudo apt install -y nginx
sudo cp ~/HeyHoAI/deploy/nginx-doppia.conf /etc/nginx/sites-available/doppia
sudo ln -sf /etc/nginx/sites-available/doppia /etc/nginx/sites-enabled/doppia
sudo rm -f /etc/nginx/sites-enabled/default   # 기본 페이지 제거
sudo nginx -t
sudo systemctl reload nginx
```
> 다른 앱이 80/443을 쓰고 있지 않다면(다른 포트면) nginx 설치가 충돌 없이 됨.
> 만약 다른 앱이 80을 직접 쓰고 있었다면, 그 앱도 nginx server 블록으로 옮겨야 함(별도 요청).

## 6. 앱 — .env 갱신 후 재시작
```bash
cd ~/HeyHoAI
# .env 에 추가/수정:
#   COOKIE_SECURE=true
#   PUBLIC_URL=https://doppia.ai
npm run pm2:restart
```

## 7. 확인
- `https://doppia.ai` → 랜딩(🔒)
- 로그인 → 쿠키 유지
- `https://doppia.ai/health` → `{"status":"ok"}`
- 사진 생성 정상

---

## ⚠️ 릴스(영상) 생성 & Cloudflare 100초 타임아웃
- `POST /api/generate/video`는 Kling을 **동기로 최대 5~10분 폴링**.
- **Cloudflare 무료/Pro는 프록시 요청을 100초에서 끊고 524** → 도메인 경유 릴스 생성 실패 가능. (사진은 OK)
- 해결(후속): **영상 생성을 비동기로 전환**(제출→taskId→상태 폴링)하면 Cloudflare 타임아웃과 무관.
- nginx 자체는 `proxy_read_timeout 600s`로 넉넉히 둠.

## 참고
- 앱은 `app.set('trust proxy', 1)` → `X-Forwarded-Proto`로 https 링크/secure 쿠키 정상.
- `PUBLIC_URL`은 인스타 발행 미디어 URL·발행 링크에 사용되므로 도메인으로 설정.
