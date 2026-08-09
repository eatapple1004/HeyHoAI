/**
 * API 응답 봉투 — 레거시부터 지켜온 `{ success, data }` 계약을 타입으로 고정한다.
 *   컨트롤러 반환 타입에 이걸 달면 필드명 오타·누락이 **컴파일에서** 잡힌다(런타임 동작은 불변).
 *
 * ⚠️ 봉투를 쓰지 않는 도메인이 있다(의도적):
 *   - pack: 팩 객체를 그대로 반환하고 에러는 `{ error }`
 *   - 일부 응답은 data 외에 최상위 필드를 더 싣는다(pagination·total·hasMore·pending 등) → With* 타입 사용
 */

/** 표준 성공 응답: { success: true, data } */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** 데이터 없이 성공만 알리는 응답: { success: true } */
export interface ApiOk {
  success: true;
}

/** 에러 응답 — LegacyErrorFilter가 내려주는 형태(레거시 errorHandler와 동일) */
export interface ApiError {
  success: false;
  error: string;
  /** 402(구매 필요)처럼 부가 정보를 함께 싣는 경우 */
  data?: unknown;
  /** Zod 검증 실패 시 */
  details?: Array<{ path: string; message: string }>;
}

/** data + 최상위 pagination (characters·contents) */
export interface ApiPaginated<T> extends ApiResponse<T> {
  pagination: { total: number; limit?: number; offset?: number };
}

/** data + 최상위 total (accounts media) */
export interface ApiWithTotal<T> extends ApiResponse<T> {
  total: number;
}

/** data + 최상위 hasMore (admin creations) */
export interface ApiWithHasMore<T> extends ApiResponse<T> {
  hasMore: boolean;
}
