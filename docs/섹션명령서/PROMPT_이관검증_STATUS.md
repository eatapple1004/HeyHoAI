# 프롬프트 네거티브 이관 — 수거·검증 롤업 (프롬프트 정밀화 총지휘)

> 검증일 2026-06-10 · 검증자=프롬프트 정밀화 총지휘 · 대상=11섹션 시드 `src/recipes/seeds/recipes.<key>.v2.js`
> 임무: 死필드 `look.negative` → live 필드 `look.extra_negative` 이관 + SAFETY 중복 제거 + text_overlay 'text/logo' 제외.
> 근거 명령서: [PROMPT_프롬프트정밀화_명령서.md](PROMPT_프롬프트정밀화_명령서.md). (이 파일은 수동 롤업 — `_STATUS.md`는 consolidate가 매 실행마다 덮어쓰므로 여기 별도 기록.)

## 게이트 결과 (요약 — 2026-06-11 beauty 이관 후 갱신)
| 게이트 | 최초(06-10) | 현재(06-11 beauty 이관 후) |
|---|---|---|
| 모든 섹션 `grep -c '"negative":'` == 0 (死필드 비움) | ❌ 10/11, beauty=16 | ✅ **0/11 전 섹션 통과** |
| `node scripts/consolidate_recipes.js` 이슈 0 | ❌ 이슈 2 | ⚠️ EXIT 0·중복0, **잔존 이슈 2 = beauty 개수16·pet 개수12 (템플릿 *개수* 플래그, 네거티브 이관과 무관·포트폴리오 결정)** |

**판정: 네거티브 이관 게이트(死필드 0) = 11/11 통과.** beauty는 총지휘가 직접 이관(아래 진단 참조). consolidate 잔존 2건은 개수 플래그뿐 — Chief 별도 판단.

## 검증 방법 (3중 교차)
1. **grep 게이트**: `grep -c '"negative":'` 섹션별 — 死필드 잔존 여부.
2. **LLM 감사(11 에이전트)**: 각 시드 정독 → extra_negative 채움/SAFETY 중복/ text_overlay 누수 구조화 보고 + 플래그된 누수는 별도 에이전트가 역검증(substring 오탐 제거).
3. **독립 grep 교차검증**: 고신호 SAFETY 토큰(watermark·lowres·extra fingers·bad anatomy·nsfw·mutated hands) 실측 — 10섹션 전부 주석/`render_notes`에만 존재, live `extra_negative` 값엔 0건. `text`/`logo`도 live extra_negative 0건.

## 섹션별 판정
| 섹션 | 템플릿 | 死필드 negative | extra_negative | SAFETY 중복 | text_overlay 누수 | 판정 |
|---|---|---|---|---|---|---|
| influencer | 6 | 0 | 채움 | 없음 | 없음 | ✅ clean |
| fashion | 8 | 0 | 채움 | 없음 | 없음 | ✅ clean |
| food | 7 | 0 | 채움 | 없음 | 없음 | ✅ clean |
| general | 8 | 0 | 채움 | 없음 | 없음 | ✅ clean |
| headshot | 7 | 0 | 채움 | 없음 | (t.o.없음) | ✅ clean |
| home | 7 | 0 | 채움 | 없음 | 없음 | ✅ clean |
| jewelry | 8 | 0 | 채움 | 없음 | 없음 | ✅ clean |
| pet | 12 | 0 | 채움 | 없음 | 없음 | ✅ clean |
| tech | 7 | 0 | 채움 | 없음 | 없음 | ✅ clean |
| ugc | 7 | 0 | 채움 | 없음 | 없음 | ✅ clean |
| **beauty** | **16** | **0** ✅ | 채움(16) | 없음 ✅ | 없음 ✅ | ✅ **clean (06-11 총지휘 이관)** |

- live `extra_negative` 내 `text`/`logo` 누수: 10섹션 전부 0건(텍스트오버레이 17개 템플릿 포함 — influencer1·fashion1·food1·general2·home3·jewelry1·pet4·tech2·ugc2).

## beauty 진단 → 해소 (2026-06-11 총지휘 직접 이관)
- 최초: 16/16 死필드 그대로·extra_negative 0 = 워커 미수행. SAFETY 중복(watermark16·lowres16·text9·logo1) + text_overlay 4개 'baked-in text' 보유.
- **조치(Chief 승인 "지금 총지휘가 이관", 현 16개 구성 유지):** 16/16 `look.negative`→`look.extra_negative` 이관 + SAFETY dedup + text_overlay 4개 text 제외 + 손 노출은 §99 `six fingers/fused·webbed` 유지. b08fbe0은 옛 16개 구성 대조 참고만, 실제는 현 main 시드 기반으로 직접 이관.
- **검증:** dead negative/positive 키 0(node 파싱)·extra_negative 16·고신호 SAFETY 토큰 0·extra_negative 내 text/logo 0. 상세 = [03_beauty_작업기록.md](03_beauty_작업기록.md) 2026-06-11 항목.
- ⚠️ **개수 16 vs 권장 6~8**은 여전히 프롬프트 영역 밖 포트폴리오 결정(Chief). 이번 이관은 현 16개 구성을 *전제*로 한 것이며 개수 자체는 미결.

## consolidate 이슈 2건의 성격
- `beauty 개수 16`, `pet 개수 12` — 둘 다 **템플릿 개수** 권장범위(6~8) 초과 플래그. 프롬프트 워커가 만든 게 아님(개수=포트폴리오 결정). pet은 네거티브 이관 완료(死필드 0). 즉 이 2건은 네거티브 이관 회귀가 아니라 기존 구조 상태.

## 잔여 작업 / 권고
1. ✅ **beauty 이관 완료**(2026-06-11 총지휘). 네거티브 이관 게이트 11/11 통과.
2. ⬜ consolidate 개수 플래그(beauty16·pet12) 해소 여부 = Chief/도메인 포트폴리오 결정(프롬프트 영역 밖).
3. ⬜ (참고) consolidate의 text_overlay 집계와 시드 `"text_overlay":true` 실측 개수 불일치(예: pet 4·tech 2·ugc 2 등 미집계) — 별개 데이터정합 이슈(이관 검증과 무관, 추후 확인).
4. ⬜ 구조화 export(명령서 §122 `scripts/export_recipe_prompts.js`) — 미신설. 시드↔CSV/Excel 동기화 규칙(CLAUDE.md) 이행은 별도 작업.

## git
- 총지휘 로컬 검증·기록 완료. **commit = Chief 확인 후 진행, push = Chief 승인 후**(아무것도 push 안 함). 현재 working tree: 11섹션 시드(워커10+beauty1) + docs 미커밋.
