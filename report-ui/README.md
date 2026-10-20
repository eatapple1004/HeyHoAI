# report-ui — 사업체 마케팅 진단 화면

도피아 관리자 `/admin-business/:id/report` 화면(React + Tailwind + shadcn + [Bklit UI](https://github.com/bklit/bklit-ui) 차트).
데이터는 `GET/POST /api/admin/business/:id/report` (nest/biz-report).

- 빌드 결과는 `../public/report-app/` 에 커밋한다 — 서버 배포(`npm run deploy:*`)는 이 폴더를 그대로 서빙하므로 서버에서 빌드하지 않는다.
- 화면을 고친 뒤: `cd report-ui && npm ci && npm run build` → `public/report-app` 변경분을 같이 커밋.
- 로컬 확인: `report-ui/dev/mock.json`(gitignore)에 API 응답(`{success,data}`)을 넣고 `npm run dev` → http://localhost:5173/report-app/
- 차트 추가: `npx shadcn@latest add @bklit/<chart>` (components.json 에 `@bklit` 레지스트리 등록됨)
