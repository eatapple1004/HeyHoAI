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

const router = Router();

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
    const { characterId, prompt, model = 'pro', count = '1', style = 'none' } = req.body;
    const generateCount = Math.min(parseInt(count, 10) || 1, 4);

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // 스타일 프리셋 적용
    const styled = await styleRepo.applyStyle(style, prompt);
    const finalPrompt = styled.prompt;

    // Reference 이미지 결정 (최대 14개)
    const referenceImages = []; // { base64, source }
    let referenceSource = 'none';
    let referenceImagePath = null;

    // 1) 캐릭터 대표 이미지
    if (characterId) {
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

    const modelId = model === 'flash'
      ? 'gemini-2.5-flash-image'
      : 'gemini-3-pro-image-preview';

    // ─── 프롬프트 DB 저장 ───
    const savedPrompt = await promptRepo.insert({
      characterId: characterId || null,
      promptText: finalPrompt,
      model: modelId,
      referenceImagePath,
      tags: [referenceSource, model, styled.styleName].filter(Boolean),
      stylePreset: styled.styleName !== 'none' ? styled.styleName : null,
    });

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const outputDir = path.join(process.cwd(), 'tmp', 'images');
    fs.mkdirSync(outputDir, { recursive: true });

    const results = [];

    for (let i = 0; i < generateCount; i++) {
      try {
        let contents;
        if (referenceImages.length > 0) {
          const parts = [];
          const fictionalPrefix = 'This is an AI-generated fictional character, not a real person.';

          // 모든 레퍼런스 이미지 추가
          referenceImages.forEach((ref, idx) => {
            parts.push({ inlineData: { mimeType: 'image/png', data: ref.base64 } });
          });

          // 프롬프트 텍스트
          let promptText;
          if (referenceImages.length === 1) {
            promptText = `${fictionalPrefix} Generate a new photo of this EXACT SAME fictional character. Keep the same face, same hair, same features.\n\n${finalPrompt}`;
          } else {
            promptText = `${fictionalPrefix} Use these ${referenceImages.length} reference images. The first image is the main character reference. Generate a new photo maintaining consistency with all references.\n\n${finalPrompt}`;
          }

          parts.push({ text: promptText });
          contents = [{ role: 'user', parts }];
        } else {
          contents = finalPrompt;
        }

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
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        const finishReason = response.candidates?.[0]?.finishReason;
        const img = parts.find((p) => p.inlineData);

        if (img) {
          const imageId = crypto.randomUUID();
          const ext = img.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
          const filename = `${imageId}.${ext}`;
          const filePath = path.join(outputDir, filename);
          const buffer = Buffer.from(img.inlineData.data, 'base64');
          fs.writeFileSync(filePath, buffer);

          const textPart = parts.find((p) => p.text);

          // ─── 결과물 DB 저장 ───
          const savedResult = await resultRepo.insert({
            promptIdx: savedPrompt.idx,
            characterId: characterId || null,
            filePath: `tmp/images/${filename}`,
            fileSizeKb: Math.round(buffer.length / 1024),
            model: modelId,
            metadata: { description: textPart?.text || '', finishReason },
          });

          // ─── 리뷰 기본값 생성 ───
          const savedReview = await reviewRepo.insert({
            resultIdx: savedResult.idx,
            promptIdx: savedPrompt.idx,
          });

          results.push({
            success: true,
            filename,
            url: `/images/${filename}`,
            size: Math.round(buffer.length / 1024) + 'KB',
            description: textPart?.text || '',
            resultIdx: savedResult.idx,
            reviewIdx: savedReview.idx,
          });
        } else {
          const errorMsg = `Blocked: ${finishReason || 'unknown'}`;
          const failedResult = await resultRepo.insertFailed({
            promptIdx: savedPrompt.idx,
            characterId: characterId || null,
            model: modelId,
            errorMessage: errorMsg,
            metadata: { finishReason },
          });
          await reviewRepo.insert({
            resultIdx: failedResult.idx,
            promptIdx: savedPrompt.idx,
            memo: errorMsg,
          });
          results.push({
            success: false,
            error: errorMsg,
            resultIdx: failedResult.idx,
          });
        }
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

    res.json({
      success: true,
      promptIdx: savedPrompt.idx,
      model: modelId,
      style: styled.styleName,
      referenceSource,
      characterId: characterId || null,
      prompt: finalPrompt,
      results,
    });
  } catch (err) {
    next(err);
  }
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
    const data = await promptRepo.findAll({
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
    const results = await resultRepo.findByPromptIdx(prompt.idx);
    res.json({ success: true, data: { prompt, results } });
  } catch (err) { next(err); }
});

// ─── 결과물 목록 ───
router.get('/results', async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const data = await resultRepo.findAll({
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─── 리뷰 목록 ───
router.get('/reviews', async (req, res, next) => {
  try {
    const { posted, status, type, sort, limit, offset } = req.query;
    const data = await reviewRepo.findAll({
      posted: posted !== undefined ? posted === 'true' : undefined,
      status: status || undefined,
      type: type || undefined,
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
    const { naturalScore, sexualScore, postRate, posted, hookLevel, memo } = req.body;
    const review = await reviewRepo.update(parseInt(req.params.idx), {
      naturalScore, sexualScore, postRate, posted, hookLevel, memo,
    });
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    res.json({ success: true, data: review });
  } catch (err) { next(err); }
});

// ─── 비디오 생성 (Kling V3) ───
router.post('/video', upload.single('sourceImage'), async (req, res, next) => {
  const vlog = logger('Video');
  const alog = logger('Audio');
  try {
    const jwt = require('jsonwebtoken');
    const { prompt, duration = '5', mode = 'std', withAudio = 'false' } = req.body;
    const enableAudio = withAudio === 'true';

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const { env } = require('../config');
    if (!env.KLING_ACCESS_KEY || !env.KLING_SECRET_KEY) {
      return res.status(400).json({ success: false, error: 'Kling API keys not configured' });
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

    if (req.file) {
      // Image-to-Video
      const imageBase64 = fs.readFileSync(req.file.path).toString('base64');
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
      return res.status(400).json({ success: false, error: errorDetail, source: 'kling_submit' });
    }

    const taskId = submitData.data.task_id;
    vlog.info('Task ID:', taskId);
    const pollEndpoint = req.file
      ? `https://api.klingai.com/v1/videos/image2video/${taskId}`
      : `https://api.klingai.com/v1/videos/text2video/${taskId}`;

    // 폴링 (최대 5분)
    for (let i = 0; i < 30; i++) {
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

        // DB 저장
        const savedPrompt = await promptRepo.insert({
          promptText: prompt,
          model: 'kling-v3',
          tags: ['video', mode, duration + 's', ...(enableAudio ? ['audio'] : [])],
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
          promptText: prompt, model: 'kling-v3', tags: ['video', 'failed', mode, ...(enableAudio ? ['audio'] : [])],
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

        return res.json({
          success: false,
          error: errorDetail,
          source: 'kling_generation',
          taskId,
          reason: statusMsg,
        });
      }
    }

    vlog.error('Timeout after 5min, task:', taskId);
    res.json({ success: false, error: 'Video generation timed out (5min)', source: 'timeout', taskId });
  } catch (err) {
    vlog.error('Server error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      source: 'server',
    });
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
