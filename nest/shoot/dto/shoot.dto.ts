/** Shoot 모델 API 계약 — src/shoot/shootModel.service.js pub() */
export interface ShootModelDto {
  id: string;
  name: string;
  /** angles(다각도 생성) · training(Soul ID 학습) · bank(장면 생성) · ready · failed */
  status: 'angles' | 'training' | 'bank' | 'ready' | 'failed';
  error: string | null;
  avatar: string | null;
  bank: Array<{ key: string; label: string; url: string }>;
  photos: string[];
  /** bank 단계 진행 "3/8", 그 외 null */
  progress: string | null;
  createdAt: string;
}

export class CreateShootModelDto {
  name?: string;
  /** 'true' 여야 한다 — 사진 속 인물(본인 또는 동의한 성인)·생체정보 처리 동의 */
  consent?: string;
}
