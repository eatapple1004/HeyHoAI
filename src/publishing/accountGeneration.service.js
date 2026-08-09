const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mediaRepo = require('./accountMedia.repository');
const accountRepo = require('./account.repository');
const reelTemplateRepo = require('./reelTemplate.repository');
const postQueueRepo = require('./postQueue.repository');
const mediaStore = require('../storage/mediaStore');
const logger = require('../lib/logger');
const log = logger('AccountGen');

/**
 * 계정 워크플로의 **생성 엔진** — Gemini 의상 변경 · Kling 릴스(단건/배치).
 *
 * 라우트(account.route.js)와 Nest(nest/accounts)가 함께 쓰는 단일소스.
 *   외부 API 호출·폴링·파일 저장이 얽혀 있어 TS로 재작성하지 않고 여기 한 벌만 둔다
 *   (로컬에서 성공 경로 검증이 불가능해 재작성 리스크가 이득보다 크다).
 *
 * 규약: 응답 객체를 만들지 않고 **데이터만 반환**하고, 실패는 statusCode 에러로 throw 한다.
 */

const OUTPUT_DIR = path.join(process.cwd(), 'tmp', 'images');
const KLING_ENDPOINT = 'https://api.klingai.com/v1/videos/image2video';
const KLING_NEGATIVE = 'ugly, deformed, blurry, static';
/** 10초 간격 × 60회 = 최대 10분. Kling 릴스는 보통 1~3분 걸린다. */
const POLL_INTERVAL_MS = 10_000;
const POLL_MAX = 60;

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

/** Kling은 요청마다 30분짜리 JWT를 요구한다(폴링 중 만료되지 않게 매 호출 새로 발급) */
function klingToken() {
  const jwt = require('jsonwebtoken');
  const { env } = require('../config');
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: env.KLING_ACCESS_KEY, exp: now + 1800, nbf: now - 5, iat: now },
    env.KLING_SECRET_KEY,
    { algorithm: 'HS256' }
  );
}

function readBase64(filePath) {
  const abs = path.join(process.cwd(), filePath);
  return fs.existsSync(abs) ? fs.readFileSync(abs).toString('base64') : null;
}

/** 생성 결과 저장 — 로컬 tmp에 쓰고 R2에도 best-effort로 올린다(미설정이면 no-op) */
async function saveOutput(buffer, ext) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  const abs = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(abs, buffer);
  await mediaStore.putFile(abs);
  return { filename, filePath: `tmp/images/${filename}` };
}

/** 릴스 완성 시 이미지+릴스를 한 묶음으로 발행 큐에 넣는다(계정 기본 캡션 적용) */
async function autoQueue(accountId, imageMediaId, reelMediaId) {
  const acc = await accountRepo.findById(accountId);
  const meta = (acc && acc.metadata) || {};
  return postQueueRepo.insert({
    accountId,
    imageMediaId,
    reelMediaId,
    imageCaption: meta.defaultImageCaption || null,
    reelCaption: meta.defaultReelCaption || null,
  });
}

/**
 * 기본 사진 → 의상/배경만 바꾼 사진 N장.
 * 개별 컷 실패는 통째로 실패시키지 않고 results[]에 사유를 담는다(일부라도 건지도록).
 * @returns {Promise<Array<{success:boolean, media?:object, error?:string}>>}
 */
async function generateOutfits(accountId, { prompt, count = 1, model = 'pro' }) {
  if (!prompt) throw httpError(400, 'Prompt is required');

  const basePhoto = await mediaRepo.findBase(accountId);
  if (!basePhoto) throw httpError(400, 'Set a base photo first');
  const refBase64 = readBase64(basePhoto.file_path);
  if (!refBase64) throw httpError(400, 'Base photo file not found');

  const { GoogleGenAI } = require('@google/genai');
  const { env } = require('../config');
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const modelId = model === 'flash' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
  const n = Math.min(parseInt(count) || 1, 4);

  const results = [];
  for (let i = 0; i < n; i++) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType: 'image/png', data: refBase64 } },
          // "가상 인물"임을 명시해야 안전필터가 실제 인물 편집으로 오인해 막지 않는다.
          { text: `This is an AI-generated fictional character, not a real person. Generate a new photo of this EXACT SAME fictional character. Keep the same face, same hair, same features. Change the outfit and setting as described:\n\n${prompt}` },
        ]}],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: [
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const img = parts.find((p) => p.inlineData);
      if (!img) {
        results.push({ success: false, error: response.candidates?.[0]?.finishReason || 'blocked' });
        continue;
      }
      const ext = img.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
      const { filePath } = await saveOutput(Buffer.from(img.inlineData.data, 'base64'), ext);
      const media = await mediaRepo.insert({
        accountId,
        filePath,
        mediaType: 'image',
        caption: prompt,
        metadata: { source: 'outfit_variation', basePhotoId: basePhoto.id },
      });
      results.push({ success: true, media });
    } catch (err) {
      results.push({ success: false, error: err.message.slice(0, 200) });
    }
  }
  log.info(`Outfit generation: ${results.filter((r) => r.success).length}/${n} for account ${accountId}`);
  return results;
}

/** Kling 작업 제출 → task_id */
async function submitKling(body) {
  const res = await fetch(KLING_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + klingToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { taskId: data.data?.task_id || null, message: data.message };
}

/**
 * 완료까지 폴링.
 * @returns {Promise<{status:'succeed'|'failed'|'timeout', videoUrl?:string, error?:string}>}
 */
async function pollKling(taskId) {
  for (let i = 0; i < POLL_MAX; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const res = await fetch(`${KLING_ENDPOINT}/${taskId}`, {
      headers: { Authorization: 'Bearer ' + klingToken() },
    });
    const data = await res.json();
    const status = data.data?.task_status;
    if (status === 'succeed') return { status: 'succeed', videoUrl: data.data.task_result?.videos?.[0]?.url };
    if (status === 'failed') return { status: 'failed', error: data.data?.task_status_msg || 'Failed' };
  }
  return { status: 'timeout' };
}

async function downloadVideo(videoUrl) {
  const res = await fetch(videoUrl);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * 사진 1장 → 릴스. 완료되면 미디어 저장 + (옵션) 템플릿 저장 + 발행 큐 자동 등록.
 * 실패·타임아웃은 200 + {success:false}로 알린다(레거시 응답 형태 유지).
 */
async function generateReel(accountId, body = {}) {
  const { mediaId, prompt, endFrameMediaId, duration = '5', mode = 'std', saveTemplate = false, templateName = '' } = body;
  if (!prompt) throw httpError(400, 'Prompt is required');
  if (!mediaId) throw httpError(400, 'mediaId is required');

  const sourceMedia = await mediaRepo.findById(mediaId);
  if (!sourceMedia || sourceMedia.account_id !== accountId) throw httpError(404, 'Media not found');
  const imageBase64 = readBase64(sourceMedia.file_path);
  if (!imageBase64) throw httpError(400, 'Source image file not found');

  const klingBody = {
    model_name: 'kling-v3', image: imageBase64, prompt,
    negative_prompt: KLING_NEGATIVE, duration, mode, aspect_ratio: '9:16',
  };
  // 끝 프레임(선택) — 있으면 그 이미지로 끝나도록 보간한다. 남의 계정 미디어는 무시.
  if (endFrameMediaId) {
    const endMedia = await mediaRepo.findById(endFrameMediaId);
    if (endMedia && endMedia.account_id === accountId) {
      const tail = readBase64(endMedia.file_path);
      if (tail) {
        klingBody.image_tail = tail;
        log.info(`End frame attached: ${endFrameMediaId}`);
      }
    }
  }

  log.info(`Reel generation started for media ${mediaId}`);
  const { taskId, message } = await submitKling(klingBody);
  if (!taskId) throw httpError(400, `Kling failed: ${message || 'Unknown'}`);
  log.info(`Reel task: ${taskId}`);

  const poll = await pollKling(taskId);
  if (poll.status === 'failed') return { success: false, error: poll.error };
  if (poll.status === 'timeout') return { success: false, error: 'Timeout after 10min' };

  const { filename, filePath } = await saveOutput(await downloadVideo(poll.videoUrl), 'mp4');
  const media = await mediaRepo.insert({
    accountId, filePath, mediaType: 'video', caption: prompt,
    metadata: { source: 'reel', sourceMediaId: mediaId, taskId },
  });

  let template = null;
  if (saveTemplate) {
    template = await reelTemplateRepo.insert({
      accountId,
      name: templateName || `Reel ${new Date().toLocaleDateString('ko-KR')}`,
      prompt, duration, mode, sourceMediaId: mediaId,
    });
    log.info(`Reel template saved: ${template.name}`);
  }

  const queueItem = await autoQueue(accountId, mediaId, media.id);
  log.info(`Auto-queued: image=${mediaId} + reel=${media.id}`);
  log.info(`Reel complete: ${filename}`);
  return { success: true, media, template, queueItem };
}

/**
 * 저장된 템플릿으로 여러 사진에 릴스 배치 생성.
 * 한 건이 실패해도 나머지를 계속 돌린다(길게 도는 작업이라 전체 중단이 더 비싸다).
 */
async function batchReels(accountId, { templateId, mediaIds }) {
  const template = await reelTemplateRepo.findById(templateId);
  if (!template) throw httpError(404, 'Template not found');

  const results = [];
  for (const mId of mediaIds) {
    try {
      const sourceMedia = await mediaRepo.findById(mId);
      if (!sourceMedia || sourceMedia.account_id !== accountId) {
        results.push({ mediaId: mId, success: false, error: 'Not found' });
        continue;
      }
      const imageBase64 = readBase64(sourceMedia.file_path);
      if (!imageBase64) { results.push({ mediaId: mId, success: false, error: 'File not found' }); continue; }

      const { taskId, message } = await submitKling({
        model_name: 'kling-v3', image: imageBase64, prompt: template.prompt,
        negative_prompt: KLING_NEGATIVE,
        duration: template.duration, mode: template.mode, aspect_ratio: '9:16',
      });
      if (!taskId) { results.push({ mediaId: mId, success: false, error: message || 'Submit failed' }); continue; }
      log.info(`Batch reel submitted: ${taskId} for media ${mId}`);

      const poll = await pollKling(taskId);
      if (poll.status === 'failed') { results.push({ mediaId: mId, success: false, error: poll.error }); continue; }
      if (poll.status === 'timeout') { results.push({ mediaId: mId, success: false, error: 'Timeout' }); continue; }

      const { filePath } = await saveOutput(await downloadVideo(poll.videoUrl), 'mp4');
      const media = await mediaRepo.insert({
        accountId, filePath, mediaType: 'video', caption: template.prompt,
        metadata: { source: 'batch_reel', templateId, sourceMediaId: mId, taskId },
      });
      await autoQueue(accountId, mId, media.id);
      results.push({ mediaId: mId, success: true, media });
    } catch (err) {
      results.push({ mediaId: mId, success: false, error: err.message.slice(0, 200) });
    }
  }
  log.info(`Batch reels: ${results.filter((r) => r.success).length}/${mediaIds.length}`);
  return results;
}

module.exports = { generateOutfits, generateReel, batchReels };
