import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mediaStore = require(path.join(__dirname, '..', '..', 'src', 'storage', 'mediaStore.js'));

/**
 * 인스타 프로필 사진을 우리 저장소(/images)로 복사해 그 주소를 돌려준다.
 *
 * 왜: 인스타·Zernio가 주는 프로필 사진 주소(cdninstagram.com)는 서명에 만료(`oe=`)가 박혀 있어
 *   몇 주 지나면 403이 난다 → 사업체 화면의 프로필 사진이 깨진 아이콘으로 남았다(2026-10-04 dev 실측).
 *   우리 /images 는 만료가 없다(로컬 → R2 폴백).
 *
 * 파일명은 매번 새 UUID — /images 는 immutable 캐시라 같은 이름을 덮어쓰면 옛 사진이 계속 보인다.
 * 실패(네트워크·403·이미지 아님)하면 원래 주소를 그대로 돌려준다 — 프로필 갱신 자체를 막지 않는다.
 */
export async function mirrorProfileImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('/images/')) return url; // 이미 우리 것
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/')) return url;
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const filename = `${crypto.randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), 'tmp', 'images');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), buf);
    await mediaStore.put(filename, buf); // R2 영속화 — tmp/images 는 cleanup cron이 지운다
    return `/images/${filename}`;
  } catch (e) {
    return url;
  }
}
