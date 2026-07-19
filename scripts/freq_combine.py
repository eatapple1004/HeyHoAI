#!/usr/bin/env python
# 주파수 분리 합성 — B(어우러진 톤)의 저주파 + D(인핸스 디테일)의 고주파.
#   목적: gpen의 디테일(고주파)만 취하고 밝기·톤이동(저주파)은 버려, 최대 선명 + 몸과 어우러진 톤 둘 다.
#   전제: B/D는 같은 target에 같은 source 스왑이라 '몸'이 픽셀 동일(스왑은 얼굴만 수정) → 마스크 없이도 얼굴만 바뀜.
#   사용: freq_combine.py <B.jpg> <D.jpg> <out.jpg> [radius=12] [quality=100] [gain=1.0]
#   gain>1 이면 D의 고주파(디테일)를 증폭 → 더 선명(뭉개짐↓). 과하면 노이즈·과샤프.
import sys
from PIL import Image, ImageFilter
import numpy as np


def main():
    b_path, d_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    radius = float(sys.argv[4]) if len(sys.argv) > 4 else 12.0
    quality = int(sys.argv[5]) if len(sys.argv) > 5 else 100
    gain = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
    B = Image.open(b_path).convert('RGB')
    D = Image.open(d_path).convert('RGB')
    if B.size != D.size:
        D = D.resize(B.size, Image.LANCZOS)
    D_arr = np.float32(np.asarray(D))

    def blur(im):
        return np.float32(np.asarray(im.filter(ImageFilter.GaussianBlur(radius))))

    combined = np.clip(blur(B) + gain * (D_arr - blur(D)), 0, 255).astype(np.uint8)
    out = Image.fromarray(combined)
    if out_path.lower().endswith(('.jpg', '.jpeg')):
        out.save(out_path, quality=quality, subsampling=0)
    else:
        out.save(out_path)


if __name__ == '__main__':
    main()
