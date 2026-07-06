// 미디어 오브젝트 스토리지 어댑터 (S3 호환 — AWS S3 / Cloudflare R2).
//
// 목적: 신규 영상/이미지가 `process.cwd()/tmp/images`(로컬·비영속)에만 저장돼
//       재배포·메모리 킬·cwd 드리프트 시 라이브에서 간헐 404 나던 문제를 영속 스토리지로 해결.
//
// 설계 원칙
//  - env-gated: MEDIA_S3_BUCKET 미설정이면 isRemote()=false → 순수 로컬(현행 동작 무변경). 로컬 개발/:3001/:3002 무영향.
//  - dual-write: 로컬 write(fs.writeFileSync)는 그대로 둔다. 같은 프로세스의 statSync·kling 로컬읽기 최적화가 로컬 파일을 전제로 하므로.
//               여기로는 best-effort **추가** 업로드만 한다. 업로드가 실패해도 절대 throw 안 함(로컬 파일이 있으니 생성/finalize가 죽지 않게).
//  - 읽기: index.js의 /images·/bgm 라우트가 로컬 파일 우선 → 없으면 remoteUrl()로 302 redirect.
//         → 과거 로컬 파일과 신규 S3 파일이 같은 `/images/<file>` URL로 투명하게 서빙됨(프런트·DB 무변경).
//
// 자격증명: SDK 기본 자격증명 체인(AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY 환경변수 또는 EC2 인스턴스 프로파일 IAM Role)에서 자동 해석.
//          R2를 쓸 땐 MEDIA_S3_ENDPOINT + AWS_ACCESS_KEY_ID/SECRET(R2 토큰)로 설정.
const fs = require('fs');
const path = require('path');
const { env } = require('../config');
const log = require('../lib/logger')('MediaStore');

let _client = null;
function client() {
  if (_client) return _client;
  const { S3Client } = require('@aws-sdk/client-s3');
  _client = new S3Client({
    region: env.MEDIA_S3_REGION,
    // R2 등 S3 호환 스토리지는 커스텀 엔드포인트 필요. 순정 S3면 미설정(리전으로 자동 해석).
    ...(env.MEDIA_S3_ENDPOINT ? { endpoint: env.MEDIA_S3_ENDPOINT, forcePathStyle: true } : {}),
  });
  return _client;
}

// 버킷이 설정돼 있을 때만 원격 활성. 미설정이면 전부 로컬 동작으로 폴백.
function isRemote() {
  return !!env.MEDIA_S3_BUCKET;
}

// 파일명 → 버킷 키. path traversal 방지로 basename만 취하고 prefix 결합.
function keyFor(filename) {
  const base = path.basename(String(filename || ''));
  const prefix = (env.MEDIA_S3_PREFIX || '').replace(/^\/+|\/+$/g, '');
  return prefix ? `${prefix}/${base}` : base;
}

const MIME = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
};
function contentTypeFor(filename) {
  return MIME[path.extname(String(filename || '')).toLowerCase()] || 'application/octet-stream';
}

// best-effort 업로드(버퍼). 실패해도 throw 안 함 → 반환값 false로만 알림.
async function put(filename, buffer, contentType) {
  if (!isRemote()) return false;
  try {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await client().send(new PutObjectCommand({
      Bucket: env.MEDIA_S3_BUCKET,
      Key: keyFor(filename),
      Body: buffer,
      ContentType: contentType || contentTypeFor(filename),
    }));
    log.info(`uploaded ${keyFor(filename)} (${buffer.length} bytes)`);
    return true;
  } catch (e) {
    log.error(`upload failed ${filename}: ${e.message}`);
    return false;
  }
}

// best-effort 업로드(디스크 경로). ffmpeg 병합처럼 버퍼가 없고 파일만 있는 경우용.
// 원격 미설정/파일 없음이면 조용히 false.
async function putFile(absPath) {
  if (!isRemote()) return false;
  try {
    const buffer = fs.readFileSync(absPath);
    return await put(path.basename(absPath), buffer);
  } catch (e) {
    log.error(`putFile failed ${absPath}: ${e.message}`);
    return false;
  }
}

// 공개 URL. MEDIA_S3_PUBLIC_BASE(CDN 또는 공개 버킷 URL base)가 있을 때만.
// 미설정이면 null → 라우트는 프록시 스트리밍(비공개 버킷)으로 폴백.
function remoteUrl(filename) {
  if (!isRemote() || !env.MEDIA_S3_PUBLIC_BASE) return null;
  const base = env.MEDIA_S3_PUBLIC_BASE.replace(/\/+$/, '');
  return `${base}/${keyFor(filename)}`;
}

// 비공개 버킷 프록시 스트리밍용 — GetObject 결과(Body=Readable, ContentType/Length, ContentRange 등) 반환.
// range = 요청의 Range 헤더(예 'bytes=0-') 그대로 전달 → S3가 206 부분응답(영상 seek). 없거나 실패 시 null.
async function getObject(filename, range) {
  if (!isRemote()) return null;
  try {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    return await client().send(new GetObjectCommand({
      Bucket: env.MEDIA_S3_BUCKET,
      Key: keyFor(filename),
      ...(range ? { Range: range } : {}),
    }));
  } catch (e) {
    return null; // NoSuchKey 등 → 라우트에서 404
  }
}

module.exports = { isRemote, put, putFile, remoteUrl, getObject, keyFor, contentTypeFor };
