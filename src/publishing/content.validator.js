const { z } = require('zod');

const createContentRequestSchema = z.object({
  characterId: z.string().uuid(),
  mediaType: z.enum(['image', 'video', 'carousel']),
  mediaAssetIds: z.array(z.string().uuid()).min(1).max(10), // carousel은 최대 10장
  theme: z.string().max(100).optional(),
  mood: z.string().max(100).optional(),
  mediaContext: z.string().min(5).max(500),
  language: z.string().max(5).default('en'),
  // 캡션을 직접 입력하는 경우 (자동생성 건너뛰기)
  manualCaption: z.string().max(2200).optional(),       // IG 캡션 최대 2200자
  manualHashtags: z.array(z.string().max(30)).max(30).optional(),
});

const updateContentRequestSchema = z.object({
  caption: z.string().max(2200).optional(),
  hashtags: z.array(z.string().max(30)).max(30).optional(),
  callToAction: z.string().max(200).optional(),
  altText: z.string().max(1000).optional(),
});

const scheduleContentRequestSchema = z.object({
  scheduledAt: z.string().datetime(), // ISO 8601
});

module.exports = {
  createContentRequestSchema,
  updateContentRequestSchema,
  scheduleContentRequestSchema,
};
