import { AccountStatus } from '../vo/account.vo';

/** 계정 API 경계 계약 — src/publishing/account.route.js (조회는 reads, 나머지는 위임) */

/** 기본 캡션 저장 결과 = 갱신된 metadata */
export type DefaultCaptionsDto = Record<string, unknown>;

export class ListAccountsQueryDto {
  platform?: string;
  status?: AccountStatus;
}
export class UpdateAccountStatusDto {
  status!: AccountStatus;
}
export class UpdateDefaultCaptionsDto {
  defaultImageCaption?: string;
  defaultReelCaption?: string;
}
export class SetBasePhotoDto {
  mediaId!: string;
}
export class ListMediaQueryDto {
  status?: string;
  limit?: string;
  offset?: string;
}
export class ListPostQueueQueryDto {
  status?: string;
}
