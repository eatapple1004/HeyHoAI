# Lemon Squeezy 연동 가이드 (⏸️ 보류 — 폴백용 보존)

> ⏸️ **2026-06-11 결정: 결제는 Eximbay 준비될 때까지 대기. Lemon Squeezy 우선 오픈은 보류.**
> 이 가이드는 폐기하지 않고 **폴백 자료로 보존** — Eximbay 지연/문제 시 즉시 LS로 오픈 가능.
> 작성일 2026-06-11. 코드는 이미 완성(`src/billing/billing.route.js`). 오픈하려면 LS 대시보드 세팅 + env 값 입력만 하면 됨. (`docs/결제_현황.md` 참조)

---

## 0. 동작 흐름 (코드가 하는 일)
```
[사용자] billing.html에서 팩 선택
   → POST /api/billing/checkout { packId }
   → 서버가 LS Checkout API 호출 (variant + custom_data{user_id,pack_id,credits})
   → LS 결제페이지 URL 반환 → 사용자 결제
   → 결제 완료 시 LS가 webhook 전송 (order_created)
   → POST /api/billing/webhook (HMAC-SHA256 서명검증 → 멱등 INSERT → 크레딧 충전 → 추천커미션)
   → redirect_url /billing?purchased=<packId> 로 복귀
```
- webhook은 `src/index.js:26`에서 `express.raw`로 마운트됨 (서명검증용 raw body). **이미 처리돼 있음.**
- 멱등: `payments(provider, order_id)` UNIQUE → 같은 주문 중복 충전 안 됨.

---

## 1. 필요한 환경변수 (`.env`)
| 변수 | 설명 | 어디서 얻나 |
|------|------|------------|
| `LEMONSQUEEZY_API_KEY` | API 키 (Bearer) | LS 대시보드 → Settings → API |
| `LEMONSQUEEZY_STORE_ID` | 스토어 ID (숫자) | LS 대시보드 → Settings → Stores (URL/목록의 숫자) |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | webhook 서명 시크릿 | webhook 생성 시 직접 지정한 문자열 |
| `LS_VARIANT_PACK50` | ◈50 / $5 상품의 variant ID | 상품 생성 후 variant ID |
| `LS_VARIANT_PACK120` | ◈100+20 / $11 상품의 variant ID | 〃 |
| `LS_VARIANT_PACK300` | ◈250+50 / $26 상품의 variant ID | 〃 |
| `LS_VARIANT_PACK700` | ◈600+100 / $56 상품의 variant ID | 〃 |

`.env.example` 58~65줄에 빈 칸으로 준비돼 있음 → 값만 채우면 됨.

---

## 2. 팩 ↔ 상품 매핑 (코드 기준 = 진실의 원천)
`src/billing/billing.route.js` PACKS (= `pricing.config.js` packs와 일치, 4개):
| packId | 크레딧(보너스) | 가격(USD) | LS variant 환경변수 |
|--------|--------------|----------|---------------------|
| `pack50` | ◈50 | $5 | `LS_VARIANT_PACK50` |
| `pack120` | ◈120 (100+20) | $11 | `LS_VARIANT_PACK120` |
| `pack300` | ◈300 (250+50) | $26 | `LS_VARIANT_PACK300` |
| `pack700` | ◈700 (600+100) | $56 | `LS_VARIANT_PACK700` |

> ✅ 2026-06-11 가격 재설계로 UI·결제 팩 4개 **일치** (`docs/가격_재설계.md`). 바닥 $0.08/cr.

LS에서 상품 가격은 **위 USD와 정확히 일치**시킬 것 (서버는 LS가 보낸 실결제액을 기록하지만, 표시가와 어긋나면 혼란).

---

## 3. webhook 설정값
- **URL**: `https://<배포도메인>/api/billing/webhook`  (예: `https://doppia.ai/api/billing/webhook`)
- **구독할 이벤트**: 최소 `order_created` (코드가 이 이벤트만 처리, 나머지는 무시)
- **Signing secret**: 임의 문자열 생성 → LS에 입력 + `.env`의 `LEMONSQUEEZY_WEBHOOK_SECRET`에 동일하게.

---

## 4. 검증 체크리스트 (값 입력 후)
1. 서버 재시작 → `GET /api/billing/packs` → `configured: true`, 각 팩 `available: true` 확인.
2. billing.html에서 팩 구매 → LS **테스트모드(Test mode)**로 결제.
3. webhook 수신 로그 `✅ Order ... → user` 확인 → DB `payments`·`credit_ledger`에 행 생성 확인.
4. 같은 결제 webhook 재전송 → `duplicate: true`(중복 충전 없음) 확인.
5. 정상 확인되면 LS **라이브 모드**로 전환 + 라이브 키로 env 교체.

---

## 5. 주의사항
- API 키/시크릿 **커밋 금지** (.env는 gitignore). 푸시 전 스캔.
- LS 테스트모드와 라이브모드는 **키·variant ID가 다름** → 모드 전환 시 env 전부 교체.
- webhook은 인증 미들웨어 우회(공개) + raw body 필수 → `src/index.js`에서 이미 `requireAuth` 앞에 마운트돼 있으니 건드리지 말 것.
