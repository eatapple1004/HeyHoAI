/** Shoot 모델 API 계약 — src/shoot/shootModel.service.js pub() */
export interface ShootModelDto {
  id: string;
  name: string;
  /** training(Soul ID 학습) · bank(장면 생성) · ready · failed */
  status: 'training' | 'bank' | 'ready' | 'failed';
  error: string | null;
  avatar: string | null;
  bank: Array<{ key: string; label: string; url: string }>;
  photos: string[];
  /** 사진에서 추정한 성별·나이대·머리·체형 — 모든 생성 프롬프트 앞에 붙는다 */
  profile: { gender: string; age: string; hair: string; build: string } | null;
  profileLine: string;
  /** bank 단계 진행 "3/8", 그 외 null */
  progress: string | null;
  createdAt: string;
}

export class CreateShootModelDto {
  name?: string;
  /** 'true' 여야 한다 — 사진 속 인물(본인 또는 동의한 성인)·생체정보 처리 동의 */
  consent?: string;
  /** 이미 우리 서버에 있는 사진(다각도 결과 등) 공개 URL — JSON 배열 문자열(multipart) */
  photoUrls?: string;
}

/** 다각도 잡 — POST /api/shoot/angles(사진 1장) → GET /api/shoot/angles/:id 폴링 */
export interface AngleJobDto {
  id: string;
  done: boolean;
  error: string | null;
  /** 만들어진 순서대로 쌓이는 공개 URL */
  urls: string[];
  total: number;
  /** 두 모델(Pro→Flash) 다 막혀 건너뛴 각도 수 */
  skipped: number;
  /** 원본 사진 공개 URL */
  source: string;
}
