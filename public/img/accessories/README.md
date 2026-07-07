# Accessories (주얼리 v1) — 예시 이미지 (오피셜)

악세서리 템플릿 3패밀리(각 부모 + 파라미터형 컷)의 예시 사진을 여기에 둡니다.
파일명 = 레시피 id, 확장자 `.png`. 없으면 UI가 그라디언트 placeholder로 폴백하므로 깨지지 않습니다.

## 파일명 (정확히 이 이름으로)
| 패밀리 | 슬롯 | 파일 | 노출 위치 |
|---|---|---|---|
| **Product Cut** | 부모 카드 | `jewelry-product-cut.png` | 그리드 카드 썸네일 |
| | 컷 · Flat Lay | `jewelry-flat-lay.png` | 모달 컷 선택 미리보기 |
| | 컷 · Floating | `jewelry-floating.png` | 〃 |
| | 컷 · Pedestal | `jewelry-pedestal.png` | 〃 |
| | 컷 · Macro | `jewelry-macro-detail.png` | 〃 |
| **Worn Cut** | 부모 카드 | `jewelry-worn-cut.png` | 그리드 카드 썸네일 |
| | 컷 · On Hand | `jewelry-on-hand.png` | 모달 컷 선택 미리보기 |
| | 컷 · On Neck | `jewelry-on-neck.png` | 〃 |
| | 컷 · On Ears | `jewelry-on-ears.png` | 〃 |
| | 컷 · On Wrist | `jewelry-on-wrist.png` | 〃 |
| **Hero** | 부모 카드 | `jewelry-hero.png` | 그리드 카드 썸네일 |
| | 스타일 · Noir Gold | `jewelry-noir-gold.png` | 모달 스타일 선택 미리보기 |
| | 스타일 · Marble Plinth | `jewelry-marble-plinth.png` | 〃 |
| | 스타일 · Silk Drape | `jewelry-silk-drape.png` | 〃 |
| | 스타일 · Spotlight | `jewelry-spotlight.png` | 〃 |
| | 스타일 · Floating Luxe | `jewelry-floating-luxe.png` | 〃 |

권장: 4:5 비율(카드/모달 미리보기와 동일), 세로형.

## 경로를 바꾸고 싶으면
`src/recipes/seeds/recipes.accessories.v2.js`의 각 레시피에 `"preview"` 값을 추가하면 컨벤션 경로보다 우선합니다
(외부 URL·생성된 Doppia 이미지 URL도 가능). 바꾼 뒤
`node scripts/consolidate_recipes.js && node scripts/recipe_card_contract.js && node scripts/export_recipe_cards.js` 재실행.

파일만 이 폴더에 이름 맞춰 넣으면 시드 수정·재빌드 없이 바로 반영됩니다(정적 경로 고정).
