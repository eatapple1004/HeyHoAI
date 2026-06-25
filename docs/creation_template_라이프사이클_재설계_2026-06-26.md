# Creation ↔ Template 라이프사이클 재설계 (정본)

작성 2026-06-26. 대상 worktree=`~/HeyHoAI-launch`(feat/launch-scope·배포본). 멀티에이전트 분석(현재코드 매핑→설계→적대검토) + 사용자 확정 답변 반영. **상태: 설계 확정, 구현 착수 대기.**

---

## 0. 핵심 전환
"수동 Save로 템플릿 민팅" → **"Custom 생성 시 즉시 본인 템플릿 자동 민팅(auto-mint)"**. 비-Custom 생성은 자동민팅 없음(이미 출처 템플릿 존재).

## 1. 모델 — 2축 분리
- **축1 = creation 공개(Private Mode)**: `generation_results.visibility`. OFF=공개(Explore Creations 자동 노출) / ON=비공개. (서버 강제 — 기존 generate.route.js 로직 유지)
- **축2 = 템플릿 단계**: `marketplace_templates` + 보유(`template_owns`). 생성 즉시 자동민팅되더라도 **라이브러리 추가·공개는 별도 단계.**
- 두 축은 현재 코드에서 이미 독립 → 연결고리만 신규.

## 2. 템플릿 4상태
| 상태 | 정의 | 노출 |
|---|---|---|
| ① auto-minted | Custom 생성 즉시. `origin='auto'`, `visibility='private'`, **owns 행 없음** | Creator Studio Templates만 |
| ② added (My templates) | 명시적 추가 → **owns 행 생성** | + Library My templates·studio 사용가능 |
| ③ published | `visibility='public'` 전환. 선행=creation Private OFF + is_creator | + Explore Templates 카탈로그 |
| ④ owned/purchased | 타인 템플릿 acquire → owns(creator≠나) | 내 My templates만(Creator엔 X) |

**"My templates = owns 행 존재"로 단일화** (신규 `added_to_library` 컬럼 불필요). Creator Studio Templates = `creator_id=me` 전부(미추가 포함). → 사용자 답변5(화면 역할 분담)와 일치.

## 3. 확정 결정 (사용자)
1. Custom 생성 1회 = 템플릿 1개(변형 N장도 1개). 비-Custom 자동민팅 없음.
2. 릴스도 자동민팅 포함(보류 안 함). ⚠️미리보기/재생은 R2 미디어 스토리지 선결(§9).
3. 가격: 크리에이터가 구매가(`price_credits`, 1회 언락) + 생성가(`use_price_credits`, per-use 로열티) 독립 설정. 점화 전 `MARKETPLACE_PAID` off=무료 언락.
4. Private ON→OFF 사후 공개 가능. OFF→ON 되돌리면 노출 creation·공개 template 회수 + **타유저가 1명이라도 구매/사용했으면 ON 거부(락).**
5. 화면 역할: Creator Studio Templates=내 인벤토리·공개/가격 관리 / Library My templates=studio용 큐레이션(추가+구매). 구매 타인 템플릿은 My templates만.
6. 사용 전 필수=My templates 추가/구매. 기존 수동 "Save as template"·γ-2 잔재 제거, 액션을 "My templates에 추가(구매)"로 일원화.
7. 자동민팅 템플릿=미분류(카테고리/테마 없음)·블랙박스. 테마는 추가/관리 시 다중선택.
8. **요구6 "스튜디오 넣다뺐다" = 안A(Themes 패널 일원화).** `template_owns.in_studio` 토글 폐기 → studio 노출 = 테마 ≥1개 배치 여부로 도출. 공식=기본 배치·Themes 패널에서 제거 가능.
9. creation 구매 게이트 = **"creation이 공개인가"** 기준(템플릿 Explore 공개 여부 무관). 블랙박스 γ.

## 4. 데이터 모델 변경 (migrate — prod에서만·누적분과 함께)
- `marketplace_templates.origin VARCHAR DEFAULT 'manual'`(`'auto'|'manual'`) — 자동민팅 구분·멱등 기준
- 부분 유니크 `(creator_id, from_creation_idx) WHERE origin='auto'` — 중복 민팅 방지
- `marketplace_templates.visibility` DEFAULT → `'private'` (민팅 시 항상 명시 INSERT, 기본값 의존 금지)
- 백필: 기존 행 `origin='manual'`, owns 유지 → 현행 화면 무변화
- 재사용(신규 아님): `visibility`, `from_creation_idx`, `template_owns`, `user_studio_theme_items`/`user_theme_overrides`(Themes 패널), `community/findCommunity`
- 폐기: `template_owns.in_studio`(코드에서 미사용·컬럼은 잔존 deprecate)

## 5. 백엔드 변경
- **[신규·핵심] 자동민팅 훅**: `mintTemplateFromCreation()` 헬퍼(현 `save-creation` INSERT 추출). `generate.route.js` 성공 후 1회(루프 밖) + 영상 `finalizeSucceeded`. `templateSource==null && success` 게이트. `origin='auto'`·`private`·`from_creation_idx`·prompt=''(블랙박스). **owns 안 만듦.** try/catch 격리(민팅 실패가 생성 안 깨게). 멱등(ON CONFLICT).
- **[신규] `POST /api/marketplace/templates/:id/add-to-my-templates`**: owns INSERT(내것=무료) → My templates 등장.
- **[변경] creation에서 구매(요구3)**: `/acquire` 게이트 확장 — "연결 creation이 public이면 그 auto 템플릿 acquire 허용"(템플릿 private여도). owns INSERT.
- **[변경] 공개 전환 게이트**: `PATCH /templates/:id` → public 시 `from_creation_idx`의 creation이 Private OFF일 때만 허용(아니면 403). `from_creation_idx=null`(수동/일반)은 기존 게이트만.
- **[변경] Private OFF→ON 락(결정4)**: creation ON 전환 시 — 타유저 구매/사용 ≥1이면 거부(403), 없으면 연결 공개 템플릿 private 강등(cascade) + toast.
- **[변경] 소스 분리**: Library My templates = `/owned`(owns). Creator Studio Templates = `/me`(creator_id=me 전부). `/me` 누출 방지.
- **[변경] 응답 필드**: `/results`(My creations)·`/community`(Explore)에 `mintedTemplateId`/`ownableTemplateId`+`owned`(LEFT JOIN). 기존 `template_id`(출처)와 필드명 분리.
- **[변경·안A] studio 노출 = 테마 멤버십**: `in_studio` 의존 제거. `ensureOwnedIfMine`는 자동민팅 템플릿엔 자동보유 적용 안 함(추가는 명시적 add로만).

## 6. UI 변경 (버튼 4분기)
- **My creations 카드(Custom)**: ①"템플릿 관리하기"→Creator / ②"My templates에서 보기"→추가됐으면 My templates, 미추가면 *"아직 추가 안 함"* 토스트+→Creator.
- **My creations 카드(비-Custom)**: "템플릿 보기"→My templates(사용=선추가라 보유 상태).
- **Explore Creations 카드/상세**: 타유저="템플릿 구매하기(추가)"→`/acquire` / 본인="템플릿 관리하기".
- **Creator Studio Templates**: 행에 "My templates에 추가"·"Explore 공개"(Private OFF·is_creator만 활성)·Auto/In-Library 배지.
- **creation 상세 [Save] 모달** → "My templates에 추가"로 의미 전환(테마 다중선택 재사용). 수동 Save·γ-2 제거.
- **Library My templates / studio**: Themes 패널이 정본 넣다뺐다(안A). 공식 기본 배치.

## 7. 요구 1~6 추적
- [1] Custom+ON: 자동민팅(private·owns없음)→Creator만. My creations 2버튼. ②미추가→안내+Creator. 공개는 Private ON이라 차단.
- [2] Custom+OFF: [1]+creation Explore Creations 자동노출. 템플릿은 private이라 Explore Templates 비자동. 타유저 acquire 가능(creation public 게이트).
- [3] 발견→구매: `/community` ownableTemplateId + "구매하기"→`/acquire`(creation public).
- [4] ON+비-Custom: 자동민팅 없음. Explore 미노출+My creations. "템플릿 보기"→My templates(선추가 보유).
- [5] OFF+비-Custom: [4]+Explore Creations 노출.
- [6] 넣다뺐다: Themes 패널(안A)로 본인/구매 무관 studio 배치/제거.

## 8. 구현 단계 순서 (각 단계=커밋+:3002 검증+승인 시 push)
- **P0 스키마**: origin·부분유니크·visibility default·백필 (migrate 누적분과 함께, prod에서만)
- **P1 자동민팅 백엔드**: mintTemplateFromCreation + generate/영상 훅 (owns 미생성, 멱등)
- **P2 상태/엔드포인트**: /me(Creator inventory)↔/owned(My templates) 분리, add-to-my-templates, acquire-via-creation 게이트, publish 게이트, OFF→ON 락+cascade, 응답 필드
- **P3 Themes 일원화(안A)**: in_studio 제거, studio 노출=테마 멤버십, 공식 기본배치
- **P4 UI**: My creations 4분기 버튼, Creator Templates, Explore 구매버튼, creation [Save]→추가, 수동 Save/γ 제거
- **P5 릴스**: 영상 자동민팅 활성 + (의존) R2 미디어 스토리지(§9)

## 9. 리스크/의존성
- ⚠️ **R2(릴스)**: 릴스 미디어가 현재 로컬 tmp 저장→404([[doppia_media_storage_bug]]). 자동민팅 행 생성은 되나 **미리보기/재생은 R2 오브젝트 스토리지 선결.** R2 작업의 이번 스코프 포함 여부 미정(P5에서 결정). 영상 preview=썸네일/첫프레임 추출 신규 필요.
- 자동민팅 핫패스: 동기 생성 응답 지연 방지 위해 try/catch+후속 재시도. 영상은 비동기 finalize라 자연스러움.
- 대표 result 생명주기: from_creation_idx 가리키는 result 삭제/테이크다운 시 cascade(템플릿 비공개 강등·preview 대체) 정의 필요.
- 비-Custom "템플릿 보기": 순수 내장 recipe(marketplace 행 없음)·역추적 불가 출처는 폴백(/studio?recipe= 또는 버튼 숨김). "선추가 필수" 모델로 대부분 해소.
- 필드 의미충돌: `template_id`(출처) vs `mintedTemplateId`/`ownableTemplateId`(낳은 템플릿) 분리 필수.
- migrate 운영: `.env`=prod RDS·개발자 활동중 → 로컬 migrate 금지. 작업 전 fetch+rebase.

## 10. 분석 출처
멀티에이전트 워크플로 wf_04d852fb-ecb (9 에이전트). ⚠️엣지케이스 리뷰어는 옛 mock 워크트리(`~/HeyHoAI`) 오독으로 "기능 없음" 단정 — 무효(배포본 `~/HeyHoAI-launch`에 실측 확인됨). requirement-trace·data-model 리뷰어 지적이 유효.
