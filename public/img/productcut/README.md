# Product Cut — 예시 이미지 (오피셜)

제품컷 템플릿(부모 + 컷 5종)의 예시 사진을 여기에 둡니다. 파일명 = 레시피 id, 확장자 `.png`.
없으면 UI가 자동으로 그라디언트 placeholder("Sample image coming soon")로 폴백하므로 깨지지 않습니다.

## 파일명 (정확히 이 이름으로)
| 슬롯 | 파일 | 노출 위치 |
|---|---|---|
| 부모 카드 | `product-cut.png` | 그리드 카드 썸네일 · 컴포즈 칩 |
| 바닥컷 | `flat-lay-cut.png` | 모달 컷 선택 시 미리보기 |
| 옷걸이컷 | `hanger-cut.png` | 〃 |
| 고스트컷 | `ghost-mannequin-cut.png` | 〃 |
| 오브제컷 | `styled-object-cut.png` | 〃 |
| 디테일컷 | `detail-cut.png` | 〃 |

권장: 4:5 비율(카드/모달 미리보기와 동일), 세로형.

## 경로를 바꾸고 싶으면
`src/recipes/seeds/recipes.productcut.v2.js`의 각 레시피 `"preview"` 값을 원하는 URL/경로로 바꾸면 됩니다
(외부 URL·생성된 Doppia 이미지 URL도 가능). 바꾼 뒤 `node scripts/consolidate_recipes.js && node scripts/recipe_card_contract.js && node scripts/export_recipe_cards.js` 재실행.

파일만 이 폴더에 이름 맞춰 넣으면 시드 수정·재빌드 없이 바로 반영됩니다(정적 경로 고정).
