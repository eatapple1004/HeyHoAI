const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const { env } = require('../config');
const logger = require('../lib/logger');
const characterRepo = require('../characters/character.repository');
const promptRepo = require('./prompt.repository');
const resultRepo = require('./result.repository');
const reviewRepo = require('./review.repository');
const styleRepo = require('./stylePreset.repository');
const { assertCharacterOwned, assertPromptOwned, assertReviewOwned } = require('../middleware/ownership');
const teamCredit = require('../teams/team.credit');
const { query } = require('../db/client');
const { getTool, listTools } = require('../tools/registry');
const { entitlementsFor } = require('../lib/entitlements');
// #6: 워터마크 폐지 — 전 출력물 클린, 접근제어는 크레딧 하드게이트(charge→402)만 사용.

const router = Router();

// Private Mode(결과 비공개)는 구독자 전용 — JWT엔 plan이 없으므로 DB에서 로드해 권한 판정.
// 프론트 잠금은 UX일 뿐, 비구독자가 privateMode=true를 보내도 여기서 공개로 강제(진짜 게이트).
async function canUsePrivate(reqUser) {
  if (!reqUser) return false;
  if (reqUser.role === 'admin') return true;
  try {
    const r = await query('SELECT plan FROM users WHERE id = $1', [reqUser.id]);
    return !!entitlementsFor({ role: reqUser.role, plan: r.rows[0] && r.rows[0].plan }).privateMode;
  } catch (e) { logger.warn({ err: e, userId: reqUser && reqUser.id }, 'canUsePrivate plan lookup failed — defaulting to public'); return false; }
}
function wantsPrivate(body) {
  return body && (body.privateMode === 'true' || body.privateMode === true);
}

// 업로드 설정
const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * POST /api/generate
 */
router.post('/', upload.array('referenceImages', 14), async (req, res, next) => {
  try {
    let { characterId, prompt, model = 'pro', count = '1', style = 'none', templateName } = req.body;
    // enhance 토글(기본 ON): OFF면 인물 정체성 고정 프리픽스를 빼고 사용자 프롬프트 원문 그대로 생성(완전 raw)
    const enhance = !(req.body.enhance === 'false' || req.body.enhance === false);
    // 자동 공개: Private Mode 끄면(기본) 결과물 공개. + 출처 템플릿 attribution.
    // Private Mode는 구독자 전용 → 비구독자가 요청해도 공개로 강제(서버 게이트).
    const resultVisibility = (wantsPrivate(req.body) && await canUsePrivate(req.user)) ? 'private' : 'public';
    const templateId = req.body.templateId || null;
    const templateSource = req.body.templateSource || null; // 'marketplace' | 'recipe'
    const generateCount = Math.min(parseInt(count, 10) || 1, 8); // 유저 선택 1~8

    // #4: 툴이 템플릿에 박힘 — req.body.tool(템플릿 지정 또는 파워유저 override) → 레지스트리로 해석.
    //     이미지 툴은 레거시 model 키(pro/flash/gpt-image-2/gpt-image-2-high)로 환원해 하위 경로를 그대로 재사용.
    //     tool 미지정 시 기존 model 경로 유지(하위호환). 영상 툴은 reels 경로 소관(여기 아님).
    const toolDef = req.body.tool ? getTool(req.body.tool) : null;
    if (toolDef && toolDef.type === 'image' && toolDef.costKey) {
      model = toolDef.costKey;
    }

    // ─── Custom 풀 컨트롤 (비율·해상도·네거티브) — 미지정 시 기존 동작 유지 ───
    // 비율: Gemini API 지원값 화이트리스트. 그 외/빈값 → 미적용.
    const ASPECT_ALLOW = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']; // Gemini 10종(+4:5/5:4 = IG 피드)
    const aspectRatio = ASPECT_ALLOW.includes(req.body.aspectRatio) ? req.body.aspectRatio : null;
    // 해상도: 2K는 Nano Banana Pro(model=pro) 전용. 4K는 보류(D1). 그 외 → 1K(미적용).
    const imageSize = (model === 'pro' && String(req.body.imageSize || '').toUpperCase() === '2K') ? '2K' : null;
    // 네거티브: provider 관용(Avoid:)으로 finalPrompt에 합침. 길이 캡 1000(입력란 maxlength와 일치).
    const negativePrompt = String(req.body.negativePrompt || '').trim().slice(0, 1000);

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // 스타일 프리셋 적용
    const styled = await styleRepo.applyStyle(style, prompt);
    let finalPrompt = styled.prompt;

    // 네거티브 프롬프트: provider 관용대로 "Avoid:" 절로 합침
    if (negativePrompt) {
      finalPrompt += `\n\nAvoid: ${negativePrompt}`;
    }

    // Reference 이미지 결정 (최대 14개)
    const referenceImages = []; // { base64, source }
    let referenceSource = 'none';
    let referenceImagePath = null;

    // 1) 캐릭터 대표 이미지
    if (characterId) {
      await assertCharacterOwned(characterId, req.user.id);
      const character = await characterRepo.findById(characterId);
      if (character?.reference_image_url) {
        const filename = character.reference_image_url.split('/').pop();
        const refPath = path.join(process.cwd(), 'tmp', 'images', filename);
        if (fs.existsSync(refPath)) {
          referenceImages.push({ base64: fs.readFileSync(refPath).toString('base64'), source: 'character' });
          referenceImagePath = `tmp/images/${filename}`;
        }
      }
    }

    // 2) 업로드된 이미지들 (최대 14개)
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (referenceImages.length < 14) {
          referenceImages.push({ base64: fs.readFileSync(file.path).toString('base64'), source: 'upload' });
        }
      });
    }

    if (referenceImages.length > 0) {
      referenceSource = referenceImages.map(r => r.source).includes('character') && referenceImages.map(r => r.source).includes('upload')
        ? 'character+upload' : referenceImages[0].source;
    }

    const isGpt = model.startsWith('gpt-');
    const gptQuality = model === 'gpt-image-2-high' ? 'high' : 'medium';
    const gptModelName = model.replace('-high', '');
    // GPT 이미지는 size로만 비율 표현 (gemini의 imageConfig.aspectRatio 대체)
    const gptSize = ['16:9', '3:2', '4:3', '21:9'].includes(aspectRatio) ? '1536x1024'
      : ['9:16', '2:3', '3:4'].includes(aspectRatio) ? '1024x1536'
      : '1024x1024';
    const modelId = isGpt ? gptModelName
      : model === 'flash' ? 'gemini-2.5-flash-image'
      : 'gemini-3-pro-image-preview';

    // ─── 유료 템플릿 게이트 + 사용당 로열티(하이브리드). ───
    //   marketplace 출처: 보유 마켓 템플릿이면 use_price_credits 추가 과금 → 성공 시 크리에이터 70%.
    //   recipe 출처: recipe-backed 유료 템플릿이 있으면 보유 필수(미보유 402), 보유 시 use_price 로열티.
    //   fail-open(조회 실패=게이트/로열티 스킵, 생성 진행) · mint-safe(관리자 charge=null이면 분배 안 함) · official(creator NULL)=분배 없이 플랫폼.
    let useRoyalty = 0, royaltyCreatorId = null;
    try {
      if (templateSource === 'marketplace' && templateId) {
        const tr = await query('SELECT use_price_credits, creator_id, is_official FROM marketplace_templates WHERE id = $1', [templateId]);
        const row = tr.rows[0];
        // 점화 게이트: 비공식(유저) 템플릿 사용당 로열티는 MARKETPLACE_PAID 전엔 미과금(공식은 항상 라이브).
        const paidLive = env.MARKETPLACE_PAID === true || (row && row.is_official === true);
        if (paidLive && row && row.use_price_credits > 0 && row.creator_id && row.creator_id !== req.user.id) {
          useRoyalty = row.use_price_credits; royaltyCreatorId = row.creator_id;
        }
      } else if (templateSource === 'recipe' && templateId) {
        const tr = await query(
          `SELECT mt.id, mt.name, mt.price_credits, mt.use_price_credits, mt.creator_id,
                  EXISTS(SELECT 1 FROM template_owns ow WHERE ow.template_id = mt.id AND ow.user_id = $2) AS owned
           FROM marketplace_templates mt
           WHERE mt.recipe_id = $1 AND mt.status = 'active' AND mt.price_credits > 0
           ORDER BY mt.is_official DESC LIMIT 1`,
          [templateId, req.user.id]
        );
        const row = tr.rows[0];
        if (row) {
          const isCreator = !!(row.creator_id && row.creator_id === req.user.id);
          if (!row.owned && !isCreator) {
            return res.status(402).json({ success: false, error: `먼저 구매해야 사용할 수 있습니다: ${row.name}`, data: { needPurchase: true, templateId: row.id, price: row.price_credits } });
          }
          if (row.use_price_credits > 0 && !isCreator) {
            useRoyalty = row.use_price_credits;
            royaltyCreatorId = row.creator_id || null; // official(creator NULL)=분배 없이 플랫폼
          }
        }
      }
    } catch (e) { /* fail-open: 게이트/로열티 스킵, 생성 진행 */ }

    // ─── 크레딧 차감 (개인=admin면제, 팀=풀차감/viewer 403, 부족 시 402) ───
    const creditService = require('../credits/credit.service');
    const teamCredit = require('../teams/team.credit');
    let charge;
    try {
      charge = await teamCredit.chargeGeneration(
        req.user,
        creditService.imageCost(model, generateCount) + useRoyalty,
        `사진 생성 (${model}, ${generateCount}장)`
      );
    } catch (e) {
      if (e.statusCode) return res.status(e.statusCode).json({ success: false, error: e.message });
      throw e;
    }

    // ─── 프롬프트 DB 저장 (활성 팀 컨텍스트면 팀 소유) ───
    const genTeamId = await teamCredit.activeTeamId(req.user.id);
    const savedPrompt = await promptRepo.insert({
      userId: req.user.id,
      characterId: characterId || null,
      promptText: finalPrompt,
      model: modelId,
      referenceImagePath,
      tags: [referenceSource, model, styled.styleName, templateName ? `tpl:${String(templateName).slice(0, 80)}` : null].filter(Boolean),
      stylePreset: styled.styleName !== 'none' ? styled.styleName : null,
      teamId: genTeamId,
    });

    const outputDir = path.join(process.cwd(), 'tmp', 'images');
    fs.mkdirSync(outputDir, { recursive: true });

    // ─── #6: 워터마크 폐지 — 전 출력물 클린. 접근제어는 크레딧 차감(charge→402)이 담당. ───

    const results = [];

    for (let i = 0; i < generateCount; i++) {
      try {
        let imageBuffer, description = '';

        if (isGpt) {
          // ─── GPT Image Generation ───
          const OpenAI = require('openai');
          const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

          const gptParams = { model: modelId, prompt: finalPrompt, n: 1, size: gptSize, quality: gptQuality };

          // 레퍼런스 이미지가 있으면 편집 모드
          if (referenceImages.length > 0) {
            gptParams.prompt = enhance
              ? `This is an AI-generated fictional character, not a real person. Generate a new photo of this EXACT SAME fictional character. Keep the same face, same hair, same features.\n\n${finalPrompt}`
              : finalPrompt;
            // GPT Image는 edit 엔드포인트로 레퍼런스 지원
            const refBuffer = Buffer.from(referenceImages[0].base64, 'base64');
            const refFile = new File([refBuffer], 'ref.png', { type: 'image/png' });
            const editResult = await openai.images.edit({
              model: modelId,
              image: refFile,
              prompt: gptParams.prompt,
              n: 1,
              size: gptSize,
            });
            imageBuffer = Buffer.from(editResult.data[0].b64_json, 'base64');
          } else {
            const genResult = await openai.images.generate(gptParams);
            imageBuffer = Buffer.from(genResult.data[0].b64_json, 'base64');
          }
        } else {
          // ─── Gemini Generation ───
          const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
          let contents;
          if (referenceImages.length > 0) {
            const parts = [];
            const fictionalPrefix = 'This is an AI-generated fictional character, not a real person.';
            referenceImages.forEach((ref) => {
              parts.push({ inlineData: { mimeType: 'image/png', data: ref.base64 } });
            });
            let promptText;
            if (!enhance) {
              promptText = finalPrompt;
            } else if (referenceImages.length === 1) {
              promptText = `${fictionalPrefix} Generate a new photo of this EXACT SAME fictional character. Keep the same face, same hair, same features.\n\n${finalPrompt}`;
            } else {
              promptText = `${fictionalPrefix} Use these ${referenceImages.length} reference images. The first image is the main character reference. Generate a new photo maintaining consistency with all references.\n\n${finalPrompt}`;
            }
            parts.push({ text: promptText });
            contents = [{ role: 'user', parts }];
          } else {
            contents = finalPrompt;
          }

          const imageConfig = {};
          if (aspectRatio) imageConfig.aspectRatio = aspectRatio;
          if (imageSize) imageConfig.imageSize = imageSize;

          const response = await ai.models.generateContent({
            model: modelId,
            contents,
            config: {
              responseModalities: ['TEXT', 'IMAGE'],
              safetySettings: [
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
              ],
              ...(Object.keys(imageConfig).length ? { imageConfig } : {}),
            },
          });

          const respParts = response.candidates?.[0]?.content?.parts || [];
          const finishReason = response.candidates?.[0]?.finishReason;
          const img = respParts.find((p) => p.inlineData);

          if (!img) {
            throw new Error(`Blocked: ${finishReason || 'unknown'}`);
          }

          imageBuffer = Buffer.from(img.inlineData.data, 'base64');
          const textPart = respParts.find((p) => p.text);
          description = textPart?.text || '';
        }

        // ─── #6: 워터마크 없음 — imageBuffer 그대로(클린) 저장 ───

        // ─── 공통: 파일 저장 + DB ───
        const imageId = crypto.randomUUID();
        const filename = `${imageId}.png`;
        fs.writeFileSync(path.join(outputDir, filename), imageBuffer);

        const savedResult = await resultRepo.insert({
          promptIdx: savedPrompt.idx,
          characterId: characterId || null,
          filePath: `tmp/images/${filename}`,
          fileSizeKb: Math.round(imageBuffer.length / 1024),
          model: modelId,
          visibility: resultVisibility, templateId, templateSource, templateName,
          metadata: { description },
        });

        const savedReview = await reviewRepo.insert({
          resultIdx: savedResult.idx,
          promptIdx: savedPrompt.idx,
        });

        results.push({
          success: true,
          filename,
          url: `/images/${filename}`,
          size: Math.round(imageBuffer.length / 1024) + 'KB',
          description,
          watermarked: false,
          resultIdx: savedResult.idx,
          reviewIdx: savedReview.idx,
        });
      } catch (err) {
        const errorMsg = err.message.slice(0, 200);
        const failedResult = await resultRepo.insertFailed({
          promptIdx: savedPrompt.idx,
          characterId: characterId || null,
          model: modelId,
          errorMessage: errorMsg,
        }).catch(() => null);
        if (failedResult) {
          await reviewRepo.insert({
            resultIdx: failedResult.idx,
            promptIdx: savedPrompt.idx,
            memo: errorMsg,
          }).catch(() => {});
        }
        results.push({
          success: false,
          error: errorMsg,
          resultIdx: failedResult?.idx,
        });
      }
    }

    // 전부 실패하면 환불 (사용당 로열티 surcharge 포함 전액)
    const okCount = results.filter((r) => r.success).length;
    if (okCount === 0 && charge) await charge.refund();
    // 생성 성공 + 실제 과금(admin 면제 시 charge=null → 분배 안 함)일 때만 사용당 로열티 70% 분배
    else if (okCount > 0 && charge && useRoyalty > 0 && royaltyCreatorId) {
      const royalty = Math.round(useRoyalty * 0.7);
      if (royalty > 0) await creditService.addPoints(royaltyCreatorId, royalty, { // 크리에이터 포인트(현금성)
        type: 'royalty', description: '템플릿 사용 로열티', refId: templateId,
      }).catch(() => {});
    }

    res.json({
      success: true,
      promptIdx: savedPrompt.idx,
      model: modelId,
      style: styled.styleName,
      referenceSource,
      characterId: characterId || null,
      prompt: finalPrompt,
      results,
      credits: charge
        ? { charged: okCount === 0 ? 0 : charge.amount, balance: await teamCredit.contextBalance(req.user.id) }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── 캡션 + 해시태그 생성 (Claude, 다국어) ───
const CAPTION_LANGS = { en: 'English', ko: 'Korean', ja: 'Japanese', es: 'Spanish', pt: 'Portuguese', zh: 'Chinese' };

router.post('/caption', async (req, res, next) => {
  const creditService = require('../credits/credit.service');
  let charge = null;
  try {
    const { context, language = 'en', characterId, mediaType = 'image' } = req.body || {};
    if (!context || !String(context).trim()) {
      return res.status(400).json({ success: false, error: 'context is required' });
    }
    const lang = CAPTION_LANGS[language] ? language : 'en';

    // 캐릭터가 있으면 그 persona를, 없으면 일반 크리에이터 persona를 사용
    let persona = {
      name: 'Creator',
      personality: ['natural', 'friendly', 'authentic'],
      voiceGuidelines: { tone: 'casual', emojiStyle: 'moderate', captionLength: 'short' },
      brandSafety: { targetAudience: '18-35' },
      instagramProfile: {},
    };
    if (characterId) {
      await assertCharacterOwned(characterId, req.user.id);
      const character = await characterRepo.findById(characterId);
      if (character?.persona) persona = character.persona;
    }

    // 크레딧 차감 (컨텍스트별: 개인=admin면제 / 팀=풀, viewer 403)
    const teamCredit = require('../teams/team.credit');
    charge = await teamCredit.chargeGeneration(
      req.user,
      creditService.COSTS.caption,
      `캡션 생성 (${CAPTION_LANGS[lang]})`
    );

    const { generateCaption } = require('../publishing/caption.service');
    const result = await generateCaption({
      persona,
      mediaType,
      mediaContext: String(context).slice(0, 1000),
      language: CAPTION_LANGS[lang],
    });

    res.json({
      success: true,
      data: { caption: result.caption, hashtags: result.hashtags, callToAction: result.callToAction },
      credits: charge ? { charged: charge.amount, balance: await creditService.getBalance(req.user.id) } : null,
    });
  } catch (err) {
    if (charge) await charge.refund();
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
});

// ─── 프롬프트 Enhance (Claude 확장, Custom 애드온) ───
router.post('/enhance', async (req, res, next) => {
  const creditService = require('../credits/credit.service');
  let charge = null;
  try {
    const { prompt, mode } = req.body || {};
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    // 크레딧 차감 (컨텍스트별: 개인=admin면제 / 팀=풀, viewer 403)
    const teamCredit = require('../teams/team.credit');
    charge = await teamCredit.chargeGeneration(req.user, creditService.COSTS.enhance, '프롬프트 Enhance');

    const { enhancePrompt } = require('./enhance.service');
    const result = await enhancePrompt({ prompt, mode });

    res.json({
      success: true,
      data: { prompt: result.prompt },
      credits: charge ? { charged: charge.amount, balance: await teamCredit.contextBalance(req.user.id) } : null,
    });
  } catch (err) {
    if (charge) await charge.refund();
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
});

// ─── 툴 카탈로그 (툴별 폼 스키마 정본 — 스튜디오가 폼을 동적 렌더) ───
// 노출 = 레지스트리 enabled 큐레이션(단일 정본). 이미지·비디오 동일 규칙.
//   비디오 = enabled 툴만(현재 kling). 프론트는 카탈로그에 비디오가 있으면 Image/Video 타입 선택 노출.
router.get('/tools', (_req, res) => {
  const pub = (t) => ({ id: t.id, label: t.label, type: t.type, model: t.costKey || t.id, controls: t.controls || {}, imageSlots: t.imageSlots || [] });
  res.json({
    success: true,
    data: {
      image: listTools({ type: 'image', enabledOnly: true }).map(pub),
      video: listTools({ type: 'video', enabledOnly: true }).map(pub),
    },
  });
});

// ─── 스타일 프리셋 목록 ───
router.get('/styles', async (_req, res, next) => {
  try {
    const data = await styleRepo.findAll();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─── 프롬프트 목록 ───
router.get('/prompts', async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const teamId = await teamCredit.activeTeamId(req.user.id);
    const data = await promptRepo.findAll({
      userId: teamId ? undefined : req.user.id,
      teamId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─── 프롬프트 상세 + 결과물 ───
router.get('/prompts/:idx', async (req, res, next) => {
  try {
    const prompt = await promptRepo.findByIdx(req.params.idx);
    if (!prompt) return res.status(404).json({ success: false, error: 'Prompt not found' });
    await assertPromptOwned(prompt.idx, req.user.id);
    const results = await resultRepo.findByPromptIdx(prompt.idx);
    res.json({ success: true, data: { prompt, results } });
  } catch (err) { next(err); }
});

// ─── 결과물 목록 ───
router.get('/results', async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const teamId = await teamCredit.activeTeamId(req.user.id);
    const data = await resultRepo.findAll({
      userId: teamId ? undefined : req.user.id,
      teamId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─── 커뮤니티 피드(Explore): 모든 유저의 공개 결과물 (자동공개) ───
router.get('/community', async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const data = await resultRepo.findCommunity({
      limit: limit ? parseInt(limit, 10) : 60,
      offset: offset ? parseInt(offset, 10) : 0,
      viewerId: req.user.id,
    });
    const items = data.map((r) => ({
      idx: r.idx,
      url: r.file_path ? `/${r.file_path.replace(/^tmp\//, '')}` : null,
      type: (r.metadata && r.metadata.type === 'video') ? 'video' : 'image',
      model: r.model,
      creatorHandle: r.creator_handle ? '@' + r.creator_handle : null,
      templateId: r.template_id,
      templateSource: r.template_source,
      templateName: r.template_name,
      likes: r.likes_count || 0,
      liked: !!r.liked,
      isOwn: !!r.is_own,
      createdAt: r.created_at,
    }));
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

// ─── 내 결과물 공개/비공개 토글 (My creations에서 항목별 공개·재공개) ───
router.patch('/results/:idx/visibility', async (req, res, next) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    if (!idx) return res.status(400).json({ success: false, error: 'invalid result id' });
    // 비공개 전환은 구독자 전용 — 생성 경로와 동일 게이트(비구독자가 사후 비공개로 우회하는 것을 차단).
    const reqVis = (req.body && req.body.visibility) === 'private' ? 'private' : 'public';
    const visibility = (reqVis === 'private' && await canUsePrivate(req.user)) ? 'private' : 'public';
    const teamId = await teamCredit.activeTeamId(req.user.id);
    const updated = await resultRepo.setVisibility(idx, { userId: teamId ? undefined : req.user.id, teamId }, visibility);
    if (!updated) return res.status(404).json({ success: false, error: '내 결과물이 아니거나 공개할 수 없는 항목입니다.' });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ─── 공개 결과물 신고 → 누적 시 자동 테이크다운 ───
router.post('/results/:idx/report', async (req, res, next) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    if (!idx) return res.status(400).json({ success: false, error: 'invalid result id' });
    const out = await resultRepo.report(idx, req.user.id, (req.body && req.body.reason) || 'other');
    res.json({ success: true, data: out });
  } catch (err) { next(err); }
});

// ─── creation 좋아요 토글 (Explore 피드) — POST=좋아요 / DELETE=취소, 멱등 ───
router.post('/results/:idx/like', async (req, res, next) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    if (!idx) return res.status(400).json({ success: false, error: 'invalid result id' });
    const out = await resultRepo.toggleLike(idx, req.user.id, true);
    if (!out.found) return res.status(404).json({ success: false, error: 'creation not available' });
    res.json({ success: true, data: { liked: out.liked, likes: out.likes } });
  } catch (err) { next(err); }
});
router.delete('/results/:idx/like', async (req, res, next) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    if (!idx) return res.status(400).json({ success: false, error: 'invalid result id' });
    const out = await resultRepo.toggleLike(idx, req.user.id, false); // 취소는 멱등 no-op 허용
    res.json({ success: true, data: { liked: out.liked, likes: out.likes } });
  } catch (err) { next(err); }
});

// ─── 단일 creation 상세 (공개 또는 본인) — creation.html ───
router.get('/creations/:idx', async (req, res, next) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    if (!idx) return res.status(400).json({ success: false, error: 'invalid result id' });
    const r = await resultRepo.findDetailForViewer(idx, req.user.id);
    if (!r) return res.status(404).json({ success: false, error: 'creation not found' });
    res.json({ success: true, data: {
      idx: r.idx,
      url: r.file_path ? `/${r.file_path.replace(/^tmp\//, '')}` : null,
      type: (r.metadata && r.metadata.type === 'video') ? 'video' : 'image',
      creatorHandle: r.creator_handle ? '@' + r.creator_handle : null,
      likes: r.likes_count || 0,
      liked: !!r.liked,
      followers: r.followers || 0,
      following: !!r.following,
      isOwn: !!r.is_own,
      visibility: r.visibility,
      templateId: r.template_id,
      templateSource: r.template_source,
      templateName: r.template_name,
      createdAt: r.created_at,
    } });
  } catch (err) { next(err); }
});

// ─── 크리에이터 Overview(γ 넛지): 총 좋아요 + 미등록 인기 creation Top ───
router.get('/creator-overview', async (req, res, next) => {
  try {
    const d = await resultRepo.creatorLikeOverview(req.user.id);
    res.json({ success: true, data: {
      totalLikes: d.totalLikes,
      topLikable: d.topLikable.map((r) => ({
        idx: r.idx,
        url: r.file_path ? `/${r.file_path.replace(/^tmp\//, '')}` : null,
        likes: r.likes_count || 0,
      })),
    } });
  } catch (err) { next(err); }
});

// ─── 리뷰 목록 ───
router.get('/reviews', async (req, res, next) => {
  try {
    const { posted, status, type, reviewed, sort, limit, offset } = req.query;
    const data = await reviewRepo.findAll({
      userId: req.user.id,
      posted: posted !== undefined ? posted === 'true' : undefined,
      status: status || undefined,
      type: type || undefined,
      reviewed: reviewed || undefined,
      sort: sort || 'newest',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─── 리뷰 수정 ───
router.patch('/reviews/:idx', async (req, res, next) => {
  try {
    await assertReviewOwned(parseInt(req.params.idx), req.user.id);
    const { naturalScore, sexualScore, postRate, posted, hookLevel, memo } = req.body;
    const review = await reviewRepo.update(parseInt(req.params.idx), {
      naturalScore, sexualScore, postRate, posted, hookLevel, memo,
    });
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    res.json({ success: true, data: review });
  } catch (err) { next(err); }
});

// ─── 리뷰 삭제 (soft delete) ───
router.delete('/reviews/:idx', async (req, res, next) => {
  try {
    await assertReviewOwned(parseInt(req.params.idx), req.user.id);
    const review = await reviewRepo.deactivate(parseInt(req.params.idx));
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    res.json({ success: true, data: review });
  } catch (err) { next(err); }
});

// ─── 비동기 릴스 생성 (제출 → jobId, 백그라운드 폴링) ───
// Cloudflare 100초 타임아웃 회피용. 스튜디오/갤러리가 이 경로를 사용.
const videoJobService = require('./videoJob.service');

router.post('/video/async', upload.fields([{ name: 'sourceImage', maxCount: 1 }, { name: 'endFrame', maxCount: 1 }]), async (req, res, next) => {
  try {
    const { prompt, duration = '5', mode = 'std', aspectRatio, audio } = req.body;
    // 자동공개(P2): 이미지 경로와 동일 — Private Mode 끄면(기본) 공개 + 출처 템플릿 attribution.
    // Private Mode는 구독자 전용 → 비구독자가 요청해도 공개로 강제(서버 게이트).
    const visibility = (wantsPrivate(req.body) && await canUsePrivate(req.user)) ? 'private' : 'public';
    const sourceFile = req.files?.sourceImage?.[0];
    const endFrameFile = req.files?.endFrame?.[0];
    const result = await videoJobService.submit({
      user: req.user, prompt, duration, mode, aspectRatio, audio,
      visibility, templateId: req.body.templateId || null,
      templateSource: req.body.templateSource || null, templateName: req.body.templateName || null,
      sourceImagePath: sourceFile ? sourceFile.path : null,
      endFramePath: endFrameFile ? endFrameFile.path : null,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
});

router.get('/video/jobs/:id', async (req, res, next) => {
  try {
    const job = await videoJobService.getJob(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({
      success: true,
      data: { status: job.status, url: job.result_url, error: job.error, duration: job.duration },
    });
  } catch (err) { next(err); }
});

// ─── 비디오 생성 (Kling V3) — 동기 (운영툴/오디오용, 기존 유지) ───
router.post('/video', upload.fields([{ name: 'sourceImage', maxCount: 1 }, { name: 'endFrameImage', maxCount: 1 }]), async (req, res, next) => {
  const vlog = logger('Video');
  const alog = logger('Audio');
  const creditService = require('../credits/credit.service');
  const teamCredit = require('../teams/team.credit');
  let charge = null; // 크레딧 차감 내역 (실패 시 환불용)
  try {
    const jwt = require('jsonwebtoken');
    const { prompt, duration = '5', mode = 'std', withAudio = 'false' } = req.body;
    const enableAudio = withAudio === 'true';
    const sourceFile = req.files?.sourceImage?.[0];
    const endFrameFile = req.files?.endFrameImage?.[0];

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const { env } = require('../config');
    if (!env.KLING_ACCESS_KEY || !env.KLING_SECRET_KEY) {
      return res.status(400).json({ success: false, error: 'Kling API keys not configured' });
    }

    // ─── 크레딧 차감 (개인=admin면제, 팀=풀차감/viewer 403, 부족 시 402) ───
    try {
      charge = await teamCredit.chargeGeneration(
        req.user,
        creditService.videoCost(duration, mode),
        `릴스 생성 (${duration}s, ${mode})`
      );
    } catch (e) {
      if (e.statusCode) return res.status(e.statusCode).json({ success: false, error: e.message });
      throw e;
    }

    function generateToken() {
      const now = Math.floor(Date.now() / 1000);
      return jwt.sign({
        iss: env.KLING_ACCESS_KEY,
        exp: now + 1800, nbf: now - 5, iat: now,
      }, env.KLING_SECRET_KEY, { algorithm: 'HS256' });
    }

    const token = generateToken();
    let endpoint, body;

    if (sourceFile) {
      // Image-to-Video
      const imageBase64 = fs.readFileSync(sourceFile.path).toString('base64');
      endpoint = 'https://api.klingai.com/v1/videos/image2video';
      body = {
        model_name: 'kling-v3',
        image: imageBase64,
        prompt,
        negative_prompt: 'ugly, deformed, blurry, static',
        duration,
        mode,
        aspect_ratio: '9:16',
      };
      // End Frame
      if (endFrameFile) {
        body.image_tail = fs.readFileSync(endFrameFile.path).toString('base64');
        vlog.info('End frame attached');
      }
    } else {
      // Text-to-Video
      endpoint = 'https://api.klingai.com/v1/videos/text2video';
      body = {
        model_name: 'kling-v3',
        prompt,
        negative_prompt: 'ugly, deformed, blurry, static',
        duration,
        mode,
        aspect_ratio: '9:16',
      };
    }

    // 제출
    vlog.info('Submitting to Kling:', endpoint, 'mode:', mode, 'duration:', duration, 'audio:', enableAudio);
    const submitRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const submitData = await submitRes.json();
    vlog.info('Submit response:', submitRes.status, JSON.stringify(submitData).slice(0, 300));

    if (!submitData.data?.task_id) {
      const errorDetail = `Kling submit failed (${submitRes.status}): ${submitData.message || submitData.code || 'Unknown'}`;
      vlog.error(errorDetail);
      if (charge) await charge.refund();
      return res.status(400).json({ success: false, error: errorDetail, source: 'kling_submit' });
    }

    const taskId = submitData.data.task_id;
    vlog.info('Task ID:', taskId);
    const pollEndpoint = sourceFile
      ? `https://api.klingai.com/v1/videos/image2video/${taskId}`
      : `https://api.klingai.com/v1/videos/text2video/${taskId}`;

    // 폴링 (최대 5분)
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 10000));
      const pollToken = generateToken();
      const pollRes = await fetch(pollEndpoint, {
        headers: { 'Authorization': 'Bearer ' + pollToken },
      });
      const pollData = await pollRes.json();
      const status = pollData.data?.task_status;
      const statusMsg = pollData.data?.task_status_msg || '';
      vlog.info(`Poll ${i+1}: ${status} ${statusMsg}`);

      if (status === 'succeed') {
        let videoUrl = pollData.data.task_result?.videos?.[0]?.url;
        const videoIdFromKling = pollData.data.task_result?.videos?.[0]?.id;
        const videoDuration = pollData.data.task_result?.videos?.[0]?.duration;
        const unitsUsed = pollData.data.final_unit_deduction;

        // ─── 오디오 생성 (별도 API: POST /v1/audio/video-to-audio) ───
        // Kling API는 비디오와 오디오를 별도 파일로 반환 → ffmpeg로 합침
        let audioMp3Url = null;
        let audioDebugInfo = { step: 'skip', reason: 'audio off' };
        if (enableAudio && videoUrl) {
          audioDebugInfo = { step: 'submit' };
          alog.info('Starting for video:', videoIdFromKling, 'url:', videoUrl?.slice(0, 80));
          try {
            const audioToken = generateToken();
            const audioBody = {
              ...(videoIdFromKling ? { video_id: videoIdFromKling } : { video_url: videoUrl }),
              sound_effect_prompt: prompt.slice(0, 200),
              bgm_prompt: '',
              asmr_mode: false,
            };
            alog.info('Request body:', JSON.stringify(audioBody).slice(0, 500));

            const audioSubmitRes = await fetch('https://api.klingai.com/v1/audio/video-to-audio', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + audioToken, 'Content-Type': 'application/json' },
              body: JSON.stringify(audioBody),
            });
            const audioSubmitRaw = await audioSubmitRes.text();
            alog.info('Submit raw response:', audioSubmitRes.status, audioSubmitRaw.slice(0, 500));

            let audioSubmitData;
            try { audioSubmitData = JSON.parse(audioSubmitRaw); } catch { audioSubmitData = {}; }

            const audioTaskId = audioSubmitData.data?.task_id;
            if (audioTaskId) {
              audioDebugInfo = { step: 'polling', audioTaskId };
              alog.info('Task ID:', audioTaskId);

              // 오디오 폴링 (최대 3분)
              for (let j = 0; j < 18; j++) {
                await new Promise(r => setTimeout(r, 10000));
                const aPollToken = generateToken();
                const aPollRes = await fetch(`https://api.klingai.com/v1/audio/video-to-audio/${audioTaskId}`, {
                  headers: { 'Authorization': 'Bearer ' + aPollToken },
                });
                const aPollRaw = await aPollRes.text();
                alog.info(`Poll ${j+1} raw:`, aPollRaw.slice(0, 500));

                let aPollData;
                try { aPollData = JSON.parse(aPollRaw); } catch { continue; }
                const aStatus = aPollData.data?.task_status;

                if (aStatus === 'succeed') {
                  // 전체 결과 구조 로깅
                  const taskResult = aPollData.data?.task_result;
                  alog.info('Full task_result keys:', taskResult ? Object.keys(taskResult) : 'null');
                  alog.info('Full task_result:', JSON.stringify(taskResult).slice(0, 1000));

                  const audioResult = taskResult?.audios?.[0];
                  if (audioResult) {
                    alog.info('audioResult keys:', Object.keys(audioResult));
                    alog.info('audioResult:', JSON.stringify(audioResult).slice(0, 500));
                  }

                  // 가능한 모든 필드명 시도
                  audioMp3Url = audioResult?.url_mp3
                    || audioResult?.audio_url
                    || audioResult?.url_wav
                    || audioResult?.mp3_url
                    || audioResult?.audio_url_mp3
                    || null;

                  audioDebugInfo = { step: 'done', audioMp3Url: audioMp3Url?.slice(0, 80), audioResultKeys: audioResult ? Object.keys(audioResult) : [] };
                  alog.info('✅ Resolved URL:', audioMp3Url ? audioMp3Url.slice(0, 80) : 'NONE');
                  break;
                }
                if (aStatus === 'failed') {
                  const failMsg = aPollData.data?.task_status_msg || 'unknown';
                  audioDebugInfo = { step: 'failed', reason: failMsg };
                  alog.warn('❌ Failed:', failMsg);
                  break;
                }
              }
            } else {
              audioDebugInfo = { step: 'submit_failed', response: audioSubmitRaw.slice(0, 200) };
              alog.warn('⚠️ No task_id in submit response');
            }
          } catch (audioErr) {
            audioDebugInfo = { step: 'error', message: audioErr.message };
            alog.warn('⚠️ Error:', audioErr.message);
          }
        }
        alog.info('Final debug:', JSON.stringify(audioDebugInfo));

        // 비디오 다운로드
        const videoResFetch = await fetch(videoUrl);
        const videoBuf = Buffer.from(await videoResFetch.arrayBuffer());
        const videoId = crypto.randomUUID();
        const outputDir = path.join(process.cwd(), 'tmp', 'images');
        fs.mkdirSync(outputDir, { recursive: true });
        const filename = `${videoId}.mp4`;
        const videoFilePath = path.join(outputDir, filename);

        if (audioMp3Url) {
          // 오디오 다운로드 후 ffmpeg로 합치기
          const { execSync } = require('child_process');
          const tempVideoPath = path.join(outputDir, `_tmp_v_${videoId}.mp4`);
          const tempAudioPath = path.join(outputDir, `_tmp_a_${videoId}.mp3`);

          fs.writeFileSync(tempVideoPath, videoBuf);
          alog.info('Downloading audio from:', audioMp3Url.slice(0, 80));
          const audioResFetch = await fetch(audioMp3Url);
          const audioBuf = Buffer.from(await audioResFetch.arrayBuffer());
          fs.writeFileSync(tempAudioPath, audioBuf);
          alog.info('Audio file size:', audioBuf.length, 'bytes');

          try {
            const ffResult = execSync(`ffmpeg -i "${tempVideoPath}" -i "${tempAudioPath}" -c:v copy -c:a aac -shortest -y "${videoFilePath}" 2>&1`, { timeout: 30000 });
            alog.info('✅ ffmpeg merge done, output:', ffResult.toString().slice(-200));
            const mergedSize = fs.statSync(videoFilePath).size;
            const videoOnlySize = videoBuf.length;
            alog.info('Size check - video only:', videoOnlySize, 'merged:', mergedSize, 'diff:', mergedSize - videoOnlySize);
          } catch (ffErr) {
            alog.warn('⚠️ ffmpeg failed:', ffErr.stderr?.toString().slice(-300) || ffErr.message);
            fs.writeFileSync(videoFilePath, videoBuf);
          }

          // 오디오 파일도 별도 보관 (디버깅용)
          const audioKeepPath = path.join(outputDir, `${videoId}_audio.mp3`);
          try { fs.copyFileSync(tempAudioPath, audioKeepPath); } catch {}

          // 임시 파일 정리
          try { fs.unlinkSync(tempVideoPath); } catch {}
          try { fs.unlinkSync(tempAudioPath); } catch {}
        } else {
          alog.info('No audio URL - saving video without audio');
          fs.writeFileSync(videoFilePath, videoBuf);
        }

        // DB 저장 (활성 팀 컨텍스트면 팀 소유)
        const savedPrompt = await promptRepo.insert({
          userId: req.user.id,
          promptText: prompt,
          model: 'kling-v3',
          tags: ['video', mode, duration + 's', ...(enableAudio ? ['audio'] : [])],
          teamId: await teamCredit.activeTeamId(req.user.id),
        });
        const savedResult = await resultRepo.insert({
          promptIdx: savedPrompt.idx,
          filePath: `tmp/images/${filename}`,
          fileSizeKb: Math.round(videoBuf.length / 1024),
          model: 'kling-v3',
          metadata: { type: 'video', duration: videoDuration, mode, taskId, unitsUsed, audio: enableAudio },
        });
        await reviewRepo.insert({ resultIdx: savedResult.idx, promptIdx: savedPrompt.idx });

        const finalSize = fs.existsSync(videoFilePath) ? fs.statSync(videoFilePath).size : videoBuf.length;
        vlog.info(`Complete: ${filename} (${videoDuration}s, ${unitsUsed} units, audio: ${!!audioMp3Url})`);
        return res.json({
          success: true,
          url: `/images/${filename}`,
          duration: videoDuration,
          size: Math.round(finalSize / 1024) + 'KB',
          units: unitsUsed,
          audioDebug: enableAudio ? audioDebugInfo : undefined,
        });
      }

      if (status === 'failed') {
        const errorDetail = `Kling generation failed: ${statusMsg || 'Unknown reason'} (task: ${taskId})`;
        vlog.error(errorDetail);

        // 실패도 DB에 기록
        const savedPrompt = await promptRepo.insert({
          userId: req.user.id,
          promptText: prompt, model: 'kling-v3', tags: ['video', 'failed', mode, ...(enableAudio ? ['audio'] : [])],
          teamId: await teamCredit.activeTeamId(req.user.id),
        }).catch(() => null);
        if (savedPrompt) {
          const savedResult = await resultRepo.insertFailed({
            promptIdx: savedPrompt.idx, model: 'kling-v3',
            errorMessage: errorDetail, metadata: { taskId, statusMsg },
          }).catch(() => null);
          if (savedResult) {
            await reviewRepo.insert({ resultIdx: savedResult.idx, promptIdx: savedPrompt.idx, memo: errorDetail }).catch(() => {});
          }
        }

        if (charge) await charge.refund();
        return res.json({
          success: false,
          error: errorDetail,
          source: 'kling_generation',
          taskId,
          reason: statusMsg,
        });
      }
    }

    vlog.error('Timeout after 10min, task:', taskId);
    if (charge) await charge.refund();
    res.json({ success: false, error: 'Video generation timed out (5min)', source: 'timeout', taskId });
  } catch (err) {
    vlog.error('Server error:', err.message);
    if (charge) await charge.refund();
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      source: 'server',
    });
  }
});

// ─── BGM 관리 ───
const bgmDir = path.join(process.cwd(), 'tmp', 'bgm');
fs.mkdirSync(bgmDir, { recursive: true });

const bgmUpload = multer({
  storage: multer.diskStorage({
    destination: bgmDir,
    filename: (_req, file, cb) => cb(null, file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/bgm/upload', bgmUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'File required' });
  res.json({ success: true, data: { filename: req.file.filename, url: `/bgm/${req.file.filename}` } });
});

router.get('/bgm/list', (_req, res) => {
  if (!fs.existsSync(bgmDir)) return res.json({ success: true, data: [] });
  const files = fs.readdirSync(bgmDir)
    .filter(f => /\.(mp3|wav|m4a|ogg|aac)$/i.test(f))
    .map(f => {
      const stat = fs.statSync(path.join(bgmDir, f));
      return { filename: f, url: `/bgm/${f}`, size: Math.round(stat.size / 1024) + 'KB', createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, data: files });
});

router.delete('/bgm/:filename', (req, res) => {
  const filePath = path.join(bgmDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Not found' });
  fs.unlinkSync(filePath);
  res.json({ success: true });
});

router.patch('/bgm/:filename', (req, res) => {
  const oldName = req.params.filename;
  const rawNew = (req.body && req.body.newName) || '';
  if (!rawNew) return res.status(400).json({ success: false, error: 'newName required' });

  const srcPath = path.join(bgmDir, oldName);
  if (!fs.existsSync(srcPath)) return res.status(404).json({ success: false, error: 'Not found' });

  // 원본 확장자 유지, 입력값에 동일/다른 확장자가 들어와도 무시
  const oldExt = path.extname(oldName);
  const requestedBase = rawNew.replace(/\.(mp3|wav|m4a|ogg|aac)$/i, '');
  const safeBase = requestedBase.replace(/[^a-zA-Z0-9._\-가-힣\s]/g, '_').trim().slice(0, 80);
  if (!safeBase) return res.status(400).json({ success: false, error: 'invalid name' });
  const newName = safeBase + oldExt;

  if (newName === oldName) return res.json({ success: true, data: { filename: newName, url: `/bgm/${newName}` } });

  const destPath = path.join(bgmDir, newName);
  if (fs.existsSync(destPath)) return res.status(409).json({ success: false, error: 'name already in use' });

  try {
    fs.renameSync(srcPath, destPath);
    res.json({ success: true, data: { filename: newName, url: `/bgm/${newName}` } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── 생성된 이미지 목록 (파일 기반) ───
router.get('/images', (_req, res) => {
  const outputDir = path.join(process.cwd(), 'tmp', 'images');
  if (!fs.existsSync(outputDir)) return res.json({ success: true, data: [] });

  const files = fs.readdirSync(outputDir)
    .filter((f) => /\.(png|jpg|jpeg|mp4)$/i.test(f))
    .map((f) => {
      const stat = fs.statSync(path.join(outputDir, f));
      return {
        filename: f,
        url: `/images/${f}`,
        size: Math.round(stat.size / 1024) + 'KB',
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, data: files });
});

// ─── 로그 조회 API ───
router.get('/logs', (req, res) => {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) return res.json({ success: true, data: [] });

  const { date, tag, level, lines = '200' } = req.query;
  const logDate = date || new Date().toISOString().slice(0, 10);
  const logFile = path.join(logDir, `${logDate}.log`);

  if (!fs.existsSync(logFile)) {
    // 사용 가능한 로그 파일 목록
    const available = fs.readdirSync(logDir).filter(f => f.endsWith('.log')).sort().reverse();
    return res.json({ success: true, data: [], available });
  }

  let content = fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);

  // 태그 필터
  if (tag) {
    content = content.filter(line => line.includes(`[${tag}]`));
  }

  // 레벨 필터
  if (level) {
    content = content.filter(line => line.includes(` ${level.toUpperCase()} `));
  }

  // 최근 N줄
  const limit = parseInt(lines, 10) || 200;
  content = content.slice(-limit);

  res.json({ success: true, date: logDate, count: content.length, data: content });
});

// ─── 로그 파일 목록 ───
router.get('/logs/files', (_req, res) => {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) return res.json({ success: true, data: [] });

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.log'))
    .map(f => {
      const stat = fs.statSync(path.join(logDir, f));
      return { name: f, size: Math.round(stat.size / 1024) + 'KB', modified: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.name.localeCompare(a.name));

  res.json({ success: true, data: files });
});

module.exports = router;
