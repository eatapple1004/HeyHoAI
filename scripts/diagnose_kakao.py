#!/usr/bin/env python3
"""카카오맵 장소 실측 — Doppia Works 진단 2단계(채널 상태) 보조 스크립트.

Nest(diagnose.service)가 child_process로 호출한다. Node에서 직접 부르면 카카오가 TLS 지문으로
"Restricted User Agent"(403)를 내므로 curl_cffi(impersonate=chrome)가 있는 파이썬으로 우회한다.
(인천 F&B 3.2만 곳 수집 때 검증된 경로 — ~/Downloads/인천_FNB/enrich.py 와 동일)

사용:  python3 scripts/diagnose_kakao.py <place_id | "가게 이름">
환경:  KAKAO_REST_KEY (이름 검색에만 필요 — 공식 로컬 API)
출력:  JSON 한 줄. 실패 시 {"ok": false, "reason": "..."} (종료코드 0 — 호출자가 reason으로 분기)
"""
import json
import os
import re
import sys


def out(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.exit(0)


try:
    from curl_cffi import requests as crequests
except Exception:
    out({"ok": False, "reason": "curl_cffi_missing"})

import urllib.parse
import urllib.request


def search_place(name):
    key = os.environ.get("KAKAO_REST_KEY", "")
    if not key:
        return None, "no_kakao_key"
    url = "https://dapi.kakao.com/v2/local/search/keyword.json?" + urllib.parse.urlencode({"query": name, "size": 3})
    req = urllib.request.Request(url, headers={"Authorization": "KakaoAK " + key})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            docs = json.loads(r.read().decode()).get("documents", [])
    except Exception as e:
        return None, "search_failed:" + type(e).__name__
    if not docs:
        return None, "not_found"
    d = docs[0]
    return {"id": d["id"], "name": d.get("place_name"), "address": d.get("address_name"), "candidates": len(docs)}, None


def panel3(pid):
    for _ in range(3):
        try:
            r = crequests.get(
                "https://place.map.kakao.com/places/panel3/%s" % pid,
                impersonate="chrome", timeout=20,
                headers={"Referer": "https://place.map.kakao.com/%s" % pid},
            )
            if r.status_code == 200:
                return r.json(), None
            if r.status_code in (429, 500, 502, 503):
                continue
            return None, "panel3_http_%s" % r.status_code
        except Exception as e:
            last = type(e).__name__
    return None, "panel3_failed:" + last


def parse(j):
    s = j.get("summary") or {}
    kr = ((j.get("kakaomap_review") or {}).get("score_set")) or {}
    br = j.get("blog_review") or {}
    homes = s.get("homepages") or []
    insta = next((h for h in homes if "instagram.com" in str(h).lower()), "")
    cat = s.get("category") or {}
    return {
        "name": s.get("name") or "",
        "status": s.get("status") or "",
        "address": (s.get("address") or {}).get("disp") or "",
        "category": cat.get("name2") or "",
        "review_count": kr.get("review_count", 0) or 0,
        # 별점은 리뷰 3개 이상일 때만 신뢰(리뷰 적으면 별점이 자동으로 높다 — 실측)
        "rating": kr.get("average_score", 0) if (kr.get("review_count", 0) or 0) >= 3 else None,
        "photo_count": kr.get("photo_count", 0) or 0,
        "blog_review_count": br.get("review_count", 0) or 0,
        "blog_last_at": br.get("last_registered_at") or "",
        "instagram": insta,
        "homepage_count": len(homes),
    }


def main():
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        out({"ok": False, "reason": "no_query"})
    q = sys.argv[1].strip()
    m = re.search(r"place\.map\.kakao\.com/(\d+)", q) or re.search(r"kko\.to/|map\.kakao\.com", q)
    found = None
    if m and m.groups():
        pid = m.group(1)
    elif re.fullmatch(r"\d{5,}", q):
        pid = q
    else:
        found, err = search_place(q)
        if err:
            out({"ok": False, "reason": err})
        pid = found["id"]
    j, err = panel3(pid)
    if err:
        out({"ok": False, "reason": err, "place_id": pid})
    data = parse(j)
    data.update({"ok": True, "source": "kakao", "place_id": pid})
    if found:
        data["matched_from_search"] = found
    out(data)


if __name__ == "__main__":
    main()
