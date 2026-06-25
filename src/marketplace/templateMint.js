const { query } = require('../db/client');

// 라이프사이클 재설계(2026-06-26): Custom 생성 시 자동민팅(auto-mint).
//   - origin='auto' · visibility='private'(블랙박스, prompt='') · from_creation_idx 포인터.
//   - template_owns 행은 만들지 않음 → "Creator Studio에만 보임, My templates 미추가" 상태[A].
//   - 동일 creation 중복 민팅은 부분유니크(uq_marketplace_auto_creation)로 멱등(ON CONFLICT DO NOTHING).
//   - category='Custom'(미분류 의미, CATEGORIES Set 내 값) → 사용자가 Creator Studio에서 보강.
// creatorHandle 없으면 users에서 도출(영상 finalize는 email이 없어 creatorId만 넘김).
async function mintAutoTemplate({ creatorId, creatorHandle, name, type, fromCreationIdx, previewUrl }) {
  if (!creatorId || !fromCreationIdx) return null;
  let handle = creatorHandle;
  if (!handle) {
    const u = await query('SELECT email FROM users WHERE id = $1', [creatorId]);
    handle = '@' + String(u.rows[0]?.email || 'creator').split('@')[0];
  }
  const r = await query(
    `INSERT INTO marketplace_templates
       (creator_id, creator_handle, name, category, type, style, prompt, visibility, emoji, from_creation_idx, preview_media, origin)
     VALUES ($1,$2,$3,'Custom',$4,'Natural','','private','🎨',$5,$6::jsonb,'auto')
     ON CONFLICT (creator_id, from_creation_idx) WHERE origin = 'auto' DO NOTHING
     RETURNING id`,
    [
      creatorId,
      handle,
      String(name || 'My custom look').slice(0, 120),
      type === 'reel' ? 'reel' : 'image',
      fromCreationIdx,
      JSON.stringify(previewUrl ? [previewUrl] : []),
    ]
  );
  return r.rows[0]?.id || null; // null = 이미 민팅됨(멱등) 또는 미생성
}

module.exports = { mintAutoTemplate };
