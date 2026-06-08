# 도메인 연결 가이드 — Cloudflare + EC2 (nginx, Full Strict)

구성: **Cloudflare(주황 프록시, Full Strict)** → **nginx(443, Origin 인증서)** → **앱(127.0.0.1:3000, PM2)**

> `<도메인>`을 실제 도메인으로, `<EC2_IP>`를 EC2 퍼블릭 IP(예: 13.209.72.131)로 바꿔서 진행하세요.

---

## 1. Cloudflare DNS (대시보드)
1. 도메인을 Cloudflare에 추가하고, 도메인 등록기관의 네임서버를 Cloudflare 것으로 변경.
2. DNS 레코드 추가 (둘 다 **Proxied / 주황 구름**):
   - `A`  `@`    → `<EC2_IP>`
   - `A`  `www`  → `<EC2_IP>`

## 2. Cloudflare SSL/TLS (대시보드)
1. **SSL/TLS → Overview → Full (Strict)** 선택.
2. **SSL/TLS → Origin Server → Create Certificate** → 기본값(RSA, 15년)으로 생성.
   - **Origin Certificate**(cert)와 **Private Key**를 복사해 둠.

## 3. EC2 — 방화벽(보안 그룹)
인바운드 규칙:
- `443` (HTTPS) ← `0.0.0.0/0` (또는 Cloudflare IP 대역만 허용하면 더 안전)
- `80`  (HTTP)  ← `0.0.0.0/0` (리다이렉트용)
- `3000` 은 **외부 차단** (nginx가 내부에서만 접근). 기존에 열려 있으면 닫기.

## 4. EC2 — Origin 인증서 저장
```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/doppia.pem   # 2번의 Origin Certificate 붙여넣기
sudo nano /etc/ssl/cloudflare/doppia.key   # 2번의 Private Key 붙여넣기
sudo chmod 600 /etc/ssl/cloudflare/doppia.key
```

## 5. EC2 — nginx 설치 + 설정
```bash
sudo apt update && sudo apt install -y nginx
# 리포의 deploy/nginx-doppia.conf 를 복사하고 <도메인> 치환
sudo cp ~/HeyHoAI/deploy/nginx-doppia.conf /etc/nginx/sites-available/doppia
sudo sed -i 's/<도메인>/실제도메인.com/g' /etc/nginx/sites-available/doppia
sudo ln -sf /etc/nginx/sites-available/doppia /etc/nginx/sites-enabled/doppia
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t          # 문법 검사
sudo systemctl reload nginx
```

## 6. 앱 — .env 갱신 후 재시작
```bash
cd ~/HeyHoAI
# .env 에 추가/수정:
#   COOKIE_SECURE=true
#   PUBLIC_URL=https://실제도메인.com
npm run pm2:restart
```

## 7. 확인
- `https://<도메인>` 접속 → 랜딩(자물쇠 🔒) 표시
- 로그인 → 쿠키 유지(secure 쿠키 정상)
- `https://<도메인>/health` → `{"status":"ok"}`
- 사진 생성 정상 동작

---

## ⚠️ 알아둘 것 — 릴스(영상) 생성 & Cloudflare 100초 타임아웃
- 앱의 영상 생성(`POST /api/generate/video`)은 Kling을 **동기로 최대 5~10분 폴링**.
- **Cloudflare 무료/Pro 플랜은 프록시 요청을 100초에서 끊고 524** 반환 → 도메인 경유 릴스 생성은 실패할 수 있음. (사진은 30~60초라 OK)
- 해결 방향(후속 작업):
  1. **(권장) 영상 생성을 비동기로 전환** — 제출 시 taskId 반환 → 클라이언트가 상태를 폴링. 그러면 Cloudflare 타임아웃과 무관.
  2. 임시: 릴스만 "DNS only(회색 구름)" 서브도메인 또는 직접 IP로 호출.
- nginx 자체 타임아웃은 `proxy_read_timeout 600s`로 넉넉히 잡아둠(직접/회색구름 접근 시 동작).

## 참고
- 앱은 `app.set('trust proxy', 1)`로 `X-Forwarded-Proto`를 신뢰 → https 링크/secure 쿠키 정상.
- `PUBLIC_URL`은 인스타 발행 미디어 URL·발행 링크에 사용되므로 도메인으로 설정.
