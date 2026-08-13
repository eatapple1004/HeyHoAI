import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { CaptionDraftVo } from './vo/business.vo';

// 설정·해시태그 정책은 레거시 단일소스를 그대로 쓴다.
//   sanitizeCaptionHashtags에 IG 위생 규칙(스팸태그·30자·30개 제한)이 이미 들어있고,
//   그 규칙을 여기서 다시 쓰면 두 벌이 갈라진다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { env } = require(path.join(__dirname, '..', '..', 'src', 'config'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sanitizeCaptionHashtags } = require(path.join(__dirname, '..', '..', 'src', 'publishing', 'caption.service.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mediaStore = require(path.join(__dirname, '..', '..', 'src', 'storage', 'mediaStore.js'));

/** 이미지를 프롬프트에 실을 때의 상한 — 이걸 넘으면 첨부를 포기하고 텍스트만으로 쓴다 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const MEDIA_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp',
};

const SYSTEM_PROMPT = `당신은 소상공인·중소 브랜드의 인스타그램 마케팅을 대행하는 카피라이터입니다.
사업체의 실제 사진을 보고, 그 사업체 계정에 그대로 올릴 수 있는 캡션을 씁니다.

규칙:
1. 사진에 실제로 보이는 것만 쓴다. 없는 메뉴·가격·이벤트를 지어내지 않는다.
2. 광고 같지 않게, 사장님이 직접 쓴 듯한 말투로 쓴다.
3. 과장 표현("최고", "1위", "유일한")과 의학적·효능 주장은 쓰지 않는다.
4. 해시태그는 지역·업종·상황이 섞이게 고른다. 팔로우 구걸 태그는 절대 금지.
5. 캡션은 짧게. 인스타 사용자는 두 줄 넘어가면 접힌 걸 안 편다.
6. 설명 없이 JSON만 반환한다.`;

@Injectable()
export class BusinessCaptionService {
  private client: Anthropic | null = null;

  private anthropic(): Anthropic {
    if (!this.client) {
      if (!env.ANTHROPIC_API_KEY) throw new InternalServerErrorException('ANTHROPIC_API_KEY not configured');
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  /**
   * 선택한 미디어를 **직접 보고** 캡션·해시태그를 쓴다(vision).
   *
   * 이미지를 못 읽으면(영상이거나 파일이 로컬에 없을 때) 첨부 없이 텍스트 컨텍스트만으로 쓴다 —
   * 캡션이 조금 일반적이 될 뿐, 관리자 작업이 막히는 것보다 낫다.
   */
  async draft(input: {
    businessName: string;
    industry?: string | null;
    memo?: string | null;
    filePath?: string | null;
    mediaType?: string;
    postType?: 'feed' | 'reel';
    tone?: string;
    language?: string;
    highlight?: string;
  }): Promise<CaptionDraftVo> {
    const postType = input.postType === 'reel' ? '릴스(짧은 세로 영상)' : '피드 게시물';
    const image = input.mediaType === 'image' ? await this.loadImage(input.filePath) : null;

    const user = `아래 사업체의 인스타그램 ${postType}에 올릴 캡션을 써주세요.

사업체: ${input.businessName}
${input.industry ? `업종: ${input.industry}` : ''}
${input.memo ? `참고사항: ${input.memo}` : ''}
${input.tone ? `말투: ${input.tone}` : ''}
${input.highlight ? `이번 게시물에서 강조할 것: ${input.highlight}` : ''}
언어: ${input.language || 'ko'}
${image ? '첨부된 사진이 이번에 올릴 이미지입니다. 사진 속 내용을 근거로 쓰세요.' : '(이미지 첨부 없음 — 업종과 참고사항만으로 무난하게 쓰세요.)'}

아래 JSON만 반환:
{
  "caption": "본문. 1~3줄. 해시태그는 여기 넣지 말 것",
  "hashtags": ["# 없이", "10~20개"],
  "callToAction": "짧은 행동 유도 문구(예약·방문·저장 등). 없으면 빈 문자열",
  "altText": "시각장애인용 이미지 대체 텍스트"
}`;

    const content: Anthropic.ContentBlockParam[] = [];
    if (image) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: image.mediaType as any, data: image.data },
      });
    }
    content.push({ type: 'text', text: user });

    const response = await this.anthropic().messages.create({
      model: env.CLAUDE_MODEL, // 캡션용 모델 단일소스(src/config) — 기존 캡션 생성과 같은 모델을 쓴다
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (!match) throw new InternalServerErrorException('캡션 생성 실패 — 모델이 JSON을 반환하지 않았습니다');

    const raw = JSON.parse(match[1]);
    const { sanitizedHashtags } = sanitizeCaptionHashtags({ hashtags: raw.hashtags || [] });

    return {
      caption: raw.caption || '',
      hashtags: sanitizedHashtags,
      callToAction: raw.callToAction || '',
      altText: raw.altText || '',
    };
  }

  /** 로컬 tmp → 오브젝트 스토리지 순으로 찾는다. 못 찾거나 너무 크면 null(= 첨부 없이 진행). */
  private async loadImage(filePath?: string | null): Promise<{ data: string; mediaType: string } | null> {
    if (!filePath) return null;
    const filename = filePath.split('/').pop() as string;
    const mediaType = MEDIA_TYPES[path.extname(filename).toLowerCase()];
    if (!mediaType) return null;

    try {
      const local = path.join(process.cwd(), 'tmp', 'images', filename);
      if (fs.existsSync(local)) {
        const stat = fs.statSync(local);
        if (stat.size > MAX_IMAGE_BYTES) return null;
        return { data: fs.readFileSync(local).toString('base64'), mediaType };
      }
      if (!mediaStore.isRemote()) return null;

      const obj = await mediaStore.getObject(filename); // S3 GetObjectCommandOutput — Body는 Readable
      if (!obj || !obj.Body) return null;
      const chunks: Buffer[] = [];
      let total = 0;
      for await (const chunk of obj.Body) {
        total += chunk.length;
        if (total > MAX_IMAGE_BYTES) return null;
        chunks.push(Buffer.from(chunk));
      }
      return { data: Buffer.concat(chunks).toString('base64'), mediaType };
    } catch {
      return null; // 첨부 실패는 캡션 생성 자체를 막을 이유가 아니다
    }
  }
}
