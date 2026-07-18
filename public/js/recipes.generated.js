/* ⚠️ AUTO-GENERATED — DO NOT EDIT BY HAND.
 * 생성: node scripts/export_recipe_cards.js
 * 소스: docs/섹션명령서/_card_contract.proposed.json (카드 계약 · 시드 credit_cost 단일원)
 * 카드 cost=시드 credit_cost (pricing.js 아님). emoji/grad=FE 결정론 파생(A2c). guards=PREVIEW 전용(resolver L148 미착지 → '보장' 카피 금지).
 * 템플릿이 172→~93 재export하면 이 파일만 재생성하면 studio가 자동 반영.
 */
(function(){
  var R = {
  "generatedFrom": "_card_contract.proposed.json",
  "total": 172,
  "new_count": 139,
  "overlay_count": 7,
  "guarded_count": 118,
  "provisional_count": 17,
  "provisional_verticals": [
    "beauty",
    "home",
    "pet"
  ],
  "drift_guard": {
    "fe_total": 172,
    "contract_total": 172,
    "catalog_total": 172,
    "status_total": 172,
    "ok": true
  },
  "cards": {
    "influencer": [
      {
        "id": "candid-photo-dump",
        "cat": "Feed",
        "name": "Candid Photo Dump",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "📸",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "fit-check-on-model",
        "cat": "Fashion",
        "name": "Fit Check On-Model",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "golden-hour-anywhere",
        "cat": "Travel",
        "name": "Golden Hour Anywhere",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🌅",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "grwm-aurora-reel",
        "cat": "Reel",
        "name": "GRWM Aurora Reel",
        "type": "reel",
        "cost": 6,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "💄",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "day-in-life-reel",
        "cat": "Reel",
        "name": "Day-in-Life Reel",
        "type": "reel",
        "cost": 4,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "product-haul-reel",
        "cat": "Reel",
        "name": "Product Haul Reel",
        "type": "reel",
        "cost": 6,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "summer-beach-coconut",
        "cat": "Feed",
        "name": "Summer Beach Coconut",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": false,
        "emoji": "📸",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      }
    ],
    "fashion": [
      {
        "id": "on-model-studio",
        "cat": "OnModel",
        "name": "On-Model Studio",
        "type": "image",
        "cost": 5,
        "new": false,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "fit-and-size-on-body",
        "cat": "OnModel",
        "name": "Fit & Size On-Body",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "lifestyle-scene-pack",
        "cat": "Lifestyle",
        "name": "Lifestyle Scene Pack",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock"
        ],
        "held": false,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "macro-texture-shots",
        "cat": "Detail",
        "name": "Macro Texture Shots",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock"
        ],
        "held": true,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "quick-drop-teaser-reel",
        "cat": "Reel",
        "name": "Quick-Drop Teaser Reel",
        "type": "reel",
        "cost": 4,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock"
        ],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "outfit-transition-reel",
        "cat": "Reel",
        "name": "Outfit Transition Reel",
        "type": "reel",
        "cost": 4,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "grwm-drop-reel",
        "cat": "Reel",
        "name": "GRWM Drop Reel",
        "type": "reel",
        "cost": 6,
        "new": false,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock"
        ],
        "held": true,
        "emoji": "💄",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "360-product-spin",
        "cat": "Reel",
        "name": "360 Product Spin",
        "type": "reel",
        "cost": 6,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock"
        ],
        "held": true,
        "emoji": "🔄",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      }
    ],
    "beauty": [
      {
        "id": "macro-swatch-lab",
        "cat": "Texture",
        "name": "Macro Swatch Lab",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "💄",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "on-model-glow-drop",
        "cat": "OnModel",
        "name": "On-Model Glow Drop",
        "type": "image",
        "cost": 5,
        "new": false,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "💄",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "before-after-result-reel",
        "cat": "Reel",
        "name": "Before/After Result Reel",
        "type": "reel",
        "cost": 4,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": true,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "grwm-routine-reel",
        "cat": "Reel",
        "name": "GRWM Routine Reel",
        "type": "reel",
        "cost": 8,
        "new": false,
        "provisional": false,
        "flags": [
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "💄",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "quick-glow-snap",
        "cat": "Reel",
        "name": "Quick Glow Snap",
        "type": "reel",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "💄",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "aesthetic-shelfie",
        "cat": "Lifestyle",
        "name": "Aesthetic Shelfie",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "ingredient-claim-card",
        "cat": "InfoCard",
        "name": "Ingredient Claim Card",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": true,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "🔖",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "shade-range-grid",
        "cat": "Shade",
        "name": "Shade Range Grid",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": true,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "🖼️",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "region-result-reel",
        "cat": "Reel",
        "name": "Region Result Reel",
        "type": "reel",
        "cost": 4,
        "new": true,
        "provisional": true,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "glide-stick-swipe",
        "cat": "Texture",
        "name": "Glide Stick Swipe",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": true,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "compact-powder-pop",
        "cat": "Texture",
        "name": "Compact Powder Pop",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": true,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "mist-burst-reel",
        "cat": "Reel",
        "name": "Mist Burst Reel",
        "type": "reel",
        "cost": 2,
        "new": true,
        "provisional": true,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "on-skin-patch-hero",
        "cat": "OnModel",
        "name": "On-Skin Patch Hero",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": true,
        "flags": [
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "✨",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "teeth-shade-card",
        "cat": "Shade",
        "name": "Teeth Shade Card",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": true,
        "flags": [
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock"
        ],
        "held": true,
        "emoji": "🖼️",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      }
    ],
    "jewelry": [
      {
        "id": "surface-macro",
        "cat": "Macro",
        "name": "Surface Macro",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": false,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "studio-and-editorial",
        "cat": "Studio",
        "name": "Studio & Editorial",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "📸",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "scale-and-spec-overlay",
        "cat": "Sizing",
        "name": "Scale & Spec Overlay",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": true,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🔖",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "ring-on-finger",
        "cat": "OnModel",
        "name": "Ring on Finger",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "wrist-wear",
        "cat": "OnModel",
        "name": "Wrist Wear",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "necklace-on-neck",
        "cat": "OnModel",
        "name": "Necklace on Neck",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "earring-on-ear",
        "cat": "OnModel",
        "name": "Earring on Ear",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "set-and-stack-stylist",
        "cat": "Styling",
        "name": "Set & Stack Stylist",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "📸",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "lumen-reel",
        "cat": "Reel",
        "name": "Lumen Reel",
        "type": "reel",
        "cost": 4,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "jewelry-unbox-asmr",
        "cat": "Reel",
        "name": "Jewelry Unbox ASMR",
        "type": "reel",
        "cost": 6,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🎁",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "ring-editorial-campaign",
        "cat": "OnModelEditorial",
        "name": "Ring Editorial Campaign",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": false,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "bracelet-editorial-campaign",
        "cat": "OnModelEditorial",
        "name": "Bracelet Editorial Campaign",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": false,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "ring-golden-hour",
        "cat": "OnModelEditorial",
        "name": "Ring Golden Hour",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "bracelet-golden-hour",
        "cat": "OnModelEditorial",
        "name": "Bracelet Golden Hour",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "ring-monochrome-noir",
        "cat": "OnModelEditorial",
        "name": "Ring Monochrome Noir",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": false,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "bracelet-monochrome-noir",
        "cat": "OnModelEditorial",
        "name": "Bracelet Monochrome Noir",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": false,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "ring-caf-candid",
        "cat": "OnModelEditorial",
        "name": "Ring Café Candid",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "bracelet-caf-candid",
        "cat": "OnModelEditorial",
        "name": "Bracelet Café Candid",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "ring-in-bloom",
        "cat": "OnModelEditorial",
        "name": "Ring In Bloom",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": false,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "bracelet-in-bloom",
        "cat": "OnModelEditorial",
        "name": "Bracelet In Bloom",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": false,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "ring-colorblock",
        "cat": "OnModelEditorial",
        "name": "Ring Colorblock",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "bracelet-colorblock",
        "cat": "OnModelEditorial",
        "name": "Bracelet Colorblock",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": false,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "ring-color-pop",
        "cat": "OnModelEditorial",
        "name": "Ring Color Pop",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": false,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "bracelet-color-pop",
        "cat": "OnModelEditorial",
        "name": "Bracelet Color Pop",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": false,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "ring-scarf-portrait",
        "cat": "OnModelEditorial",
        "name": "Ring Scarf Portrait",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "bracelet-scarf-portrait",
        "cat": "OnModelEditorial",
        "name": "Bracelet Scarf Portrait",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "ring-intimate",
        "cat": "OnModelEditorial",
        "name": "Ring Intimate",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": false,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "bracelet-intimate",
        "cat": "OnModelEditorial",
        "name": "Bracelet Intimate",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": false,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "earring-campaign",
        "cat": "OnModelEditorial",
        "name": "Earring Campaign",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "earring-golden-hour",
        "cat": "OnModelEditorial",
        "name": "Earring Golden Hour",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "earring-monochrome",
        "cat": "OnModelEditorial",
        "name": "Earring Monochrome",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "earring-scarf-portrait",
        "cat": "OnModelEditorial",
        "name": "Earring Scarf Portrait",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "earring-color-pop",
        "cat": "OnModelEditorial",
        "name": "Earring Color Pop",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "earring-intimate",
        "cat": "OnModelEditorial",
        "name": "Earring Intimate",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      }
    ],
    "food": [
      {
        "id": "top-down-hero",
        "cat": "Studio",
        "name": "Top-Down Hero",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "count_lock",
          "scale_cue"
        ],
        "held": false,
        "emoji": "✨",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "drip-and-steam-macro",
        "cat": "Macro",
        "name": "Drip & Steam Macro",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "count_lock",
          "scale_cue"
        ],
        "held": true,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "golden-hour-cafe-mood",
        "cat": "Lifestyle",
        "name": "Golden-Hour Cafe Mood",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "count_lock",
          "scale_cue"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "serving-and-table-lifestyle",
        "cat": "Lifestyle",
        "name": "Serving & Table Lifestyle",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "count_lock",
          "scale_cue"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "menu-price-card",
        "cat": "Menu",
        "name": "Menu / Price Card",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": true,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "count_lock",
          "scale_cue"
        ],
        "held": true,
        "emoji": "🔖",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "single-dish-sizzle",
        "cat": "Reel",
        "name": "Single-Dish Sizzle",
        "type": "reel",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "count_lock",
          "scale_cue"
        ],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "sizzle-and-steam-asmr",
        "cat": "Reel",
        "name": "Sizzle & Steam ASMR",
        "type": "reel",
        "cost": 6,
        "new": false,
        "provisional": false,
        "flags": [
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "count_lock",
          "scale_cue"
        ],
        "held": true,
        "emoji": "🎁",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "ingredient-callout",
        "cat": "Callout",
        "name": "Ingredient Callout",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "count_lock",
          "scale_cue"
        ],
        "held": false,
        "emoji": "🔖",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      }
    ],
    "coffee": [
      {
        "id": "latte-art-top-down",
        "cat": "Studio",
        "name": "Latte Art Top-Down",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "📸",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "cozy-cafe-moment",
        "cat": "Lifestyle",
        "name": "Cozy Cafe Moment",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "iced-coffee-condensation-hero",
        "cat": "Macro",
        "name": "Iced Coffee Condensation Hero",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "signature-drink-menu-card",
        "cat": "Menu",
        "name": "Signature Drink Menu Card",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": true,
        "guards": [],
        "held": true,
        "emoji": "🔖",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "single-cup-pour-reel",
        "cat": "Reel",
        "name": "Single-Cup Pour Reel",
        "type": "reel",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "latte-pour-and-crema-reel",
        "cat": "Reel",
        "name": "Latte Pour & Crema Reel",
        "type": "reel",
        "cost": 4,
        "new": true,
        "provisional": false,
        "flags": [
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "cafe-steam-and-crema-asmr",
        "cat": "Reel",
        "name": "Cafe Steam & Crema ASMR",
        "type": "reel",
        "cost": 6,
        "new": true,
        "provisional": false,
        "flags": [
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🎁",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "noir-marble-coffee",
        "cat": "Editorial",
        "name": "Noir Marble Coffee",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "📸",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "slow-morning-coffee",
        "cat": "Lifestyle",
        "name": "Slow Morning Coffee",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "golden-hour-window",
        "cat": "Lifestyle",
        "name": "Golden Hour Window",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "analog-film-cafe",
        "cat": "Lifestyle",
        "name": "Analog Film Cafe",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "roastery-counter",
        "cat": "Lifestyle",
        "name": "Roastery Counter",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "daylight-brunch-flatlay",
        "cat": "Lifestyle",
        "name": "Daylight Brunch Flatlay",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🧩",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "sunlit-terrace",
        "cat": "Lifestyle",
        "name": "Sunlit Terrace",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "minimalist-negative-space",
        "cat": "Studio",
        "name": "Minimalist Negative Space",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": false,
        "emoji": "📸",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "rainy-window-mood",
        "cat": "Lifestyle",
        "name": "Rainy Window Mood",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "monochrome-fine-art",
        "cat": "Editorial",
        "name": "Monochrome Fine Art",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "📸",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "marble-linen-still-life",
        "cat": "Editorial",
        "name": "Marble Linen Still Life",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": false,
        "emoji": "📸",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "shadow-play-sunlight",
        "cat": "Lifestyle",
        "name": "Shadow Play Sunlight",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "botanical-coffee-beans",
        "cat": "Macro",
        "name": "Botanical Coffee Beans",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": false,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "pastel-dream",
        "cat": "Studio",
        "name": "Pastel Dream",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": false,
        "emoji": "📸",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "vintage-heirloom",
        "cat": "Editorial",
        "name": "Vintage Heirloom",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "📸",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "reflective-glass-surface",
        "cat": "Studio",
        "name": "Reflective Glass Surface",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": false,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "steam-and-light-macro",
        "cat": "Macro",
        "name": "Steam and Light Macro",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": false,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      }
    ],
    "home": [
      {
        "id": "room-and-warmth-styled",
        "cat": "Scene",
        "name": "Room & Warmth Styled",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "material-detail-suite",
        "cat": "Detail",
        "name": "Material Detail Suite",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "scale-and-dimensions-frame",
        "cat": "Info",
        "name": "Scale & Dimensions Frame",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": true,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🔖",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "day-to-night-lighting-reveal",
        "cat": "Reel",
        "name": "Day-to-Night Lighting Reveal",
        "type": "reel",
        "cost": 4,
        "new": true,
        "provisional": true,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "empty-to-styled-reveal",
        "cat": "Reel",
        "name": "Empty-to-Styled Reveal",
        "type": "reel",
        "cost": 6,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "slow-asmr-detail",
        "cat": "Reel",
        "name": "Slow ASMR Detail",
        "type": "reel",
        "cost": 6,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🎁",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "variant-showcase-grid",
        "cat": "Detail",
        "name": "Variant Showcase Grid",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": true,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "minimalist-warmth-study",
        "cat": "Scene",
        "name": "Minimalist Warmth Study",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "japandi-warmth-nook",
        "cat": "Scene",
        "name": "Japandi Warmth Nook",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "mid-century-modern-warmth-studio",
        "cat": "Scene",
        "name": "Mid-Century Modern Warmth Studio",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "bohemian-warmth-alcove",
        "cat": "Scene",
        "name": "Bohemian Warmth Alcove",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "bedroom-sanctuary-styled",
        "cat": "Scene",
        "name": "Bedroom Sanctuary Styled",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "kitchen-and-dining-styled",
        "cat": "Scene",
        "name": "Kitchen & Dining Styled",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "study-nook-focus",
        "cat": "Scene",
        "name": "Study Nook Focus",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "dappled-shadows-studio",
        "cat": "Scene",
        "name": "Dappled Shadows Studio",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "industrial-warmth-loft",
        "cat": "Scene",
        "name": "Industrial Warmth Loft",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "seasonal-palette-studio",
        "cat": "Scene",
        "name": "Seasonal Palette Studio",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "entryway-welcome-styled",
        "cat": "Scene",
        "name": "Entryway Welcome Styled",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": false,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "holiday-warmth-styled",
        "cat": "Scene",
        "name": "Holiday Warmth Styled",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "morning-light-study",
        "cat": "Scene",
        "name": "Morning Light Study",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": false,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "blue-hour-serenity",
        "cat": "Scene",
        "name": "Blue Hour Serenity",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "rainy-window-styled",
        "cat": "Scene",
        "name": "Rainy Window Styled",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "patio-season-styled",
        "cat": "Scene",
        "name": "Patio Season Styled",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": false,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "styled-shelf-discovery",
        "cat": "Scene",
        "name": "Styled Shelf Discovery",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "textiles-raked-light",
        "cat": "Detail",
        "name": "Textiles Raked Light",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "housewarming-move-in-ready",
        "cat": "Scene",
        "name": "Housewarming Move-In Ready",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "twilight-corner-glow",
        "cat": "Lighting",
        "name": "Twilight Corner Glow",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "count_lock",
          "reflection_control",
          "emissive_render"
        ],
        "held": true,
        "emoji": "💄",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      }
    ],
    "tech": [
      {
        "id": "void-hero-cut",
        "cat": "Hero",
        "name": "Void Hero Cut",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock",
          "scale_cue",
          "emissive_render"
        ],
        "held": false,
        "emoji": "✨",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "spec-callout-grid",
        "cat": "Feature",
        "name": "Spec Callout Grid",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": true,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock",
          "scale_cue",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🔖",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "macro-tactile-zoom",
        "cat": "Macro",
        "name": "Macro Tactile Zoom",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock",
          "scale_cue",
          "emissive_render"
        ],
        "held": false,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "desk-setup-flatlay",
        "cat": "Lifestyle",
        "name": "Desk Setup Flatlay",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock",
          "scale_cue",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🧩",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "in-hand-quick-demo",
        "cat": "Reel",
        "name": "In-hand Quick Demo",
        "type": "reel",
        "cost": 4,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock",
          "scale_cue",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "tech-unbox-asmr",
        "cat": "Reel",
        "name": "Tech Unbox ASMR",
        "type": "reel",
        "cost": 6,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock",
          "scale_cue",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🎁",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "360-glow-spin",
        "cat": "Reel",
        "name": "360 Glow Spin",
        "type": "reel",
        "cost": 6,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "count_lock",
          "scale_cue",
          "emissive_render"
        ],
        "held": true,
        "emoji": "💄",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      }
    ],
    "pet": [
      {
        "id": "pet-product-hero",
        "cat": "Hero",
        "name": "Pet Product Hero",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "emissive_render",
          "count_lock"
        ],
        "held": false,
        "emoji": "✨",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "cuddle-hour",
        "cat": "Lifestyle",
        "name": "Cuddle Hour",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "emissive_render",
          "count_lock"
        ],
        "held": false,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "macro-crunch",
        "cat": "Detail",
        "name": "Macro Crunch",
        "type": "image",
        "cost": 2,
        "new": false,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "emissive_render",
          "count_lock"
        ],
        "held": true,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "on-pet-fit",
        "cat": "OnPet",
        "name": "On-Pet Fit",
        "type": "image",
        "cost": 5,
        "new": false,
        "provisional": true,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "emissive_render",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "wait-for-the-zoomies",
        "cat": "Reel",
        "name": "Wait For The Zoomies",
        "type": "reel",
        "cost": 4,
        "new": false,
        "provisional": true,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "emissive_render",
          "count_lock"
        ],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "talking-pet-skit",
        "cat": "UGC",
        "name": "Talking Pet Skit",
        "type": "reel",
        "cost": 4,
        "new": false,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "emissive_render",
          "count_lock"
        ],
        "held": true,
        "emoji": "🗣️",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "single-hero-sizzle-reel",
        "cat": "Reel",
        "name": "Single-Hero Sizzle Reel",
        "type": "reel",
        "cost": 2,
        "new": true,
        "provisional": true,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "emissive_render",
          "count_lock"
        ],
        "held": true,
        "emoji": "✨",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "hands-on-pour-and-unbox-reel",
        "cat": "Reel",
        "name": "Hands-On Pour & Unbox Reel",
        "type": "reel",
        "cost": 4,
        "new": true,
        "provisional": true,
        "flags": [
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "emissive_render",
          "count_lock"
        ],
        "held": true,
        "emoji": "🎁",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "device-ui-mockup-set",
        "cat": "Tech",
        "name": "Device UI Mockup Set",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": true,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "emissive_render",
          "count_lock"
        ],
        "held": true,
        "emoji": "🖼️",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "in-room-scale-set",
        "cat": "Scale",
        "name": "In-Room Scale Set",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": true,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "emissive_render",
          "count_lock"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "habitat-scene-set",
        "cat": "Lifestyle",
        "name": "Habitat Scene Set",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": true,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "emissive_render",
          "count_lock"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "pet-wearable-spec-sheet",
        "cat": "Spec",
        "name": "Pet Wearable Spec Sheet",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": true,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "scale_cue",
          "emissive_render",
          "count_lock"
        ],
        "held": true,
        "emoji": "🔖",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      }
    ],
    "ugc": [
      {
        "id": "static-ugc-photo-ad",
        "cat": "Static",
        "name": "Static UGC Photo Ad",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🖼️",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "tiktok-discovery-pov",
        "cat": "Discovery",
        "name": "TikTok Discovery POV",
        "type": "reel",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "hook-cta-ad",
        "cat": "Demo",
        "name": "Hook + CTA Ad",
        "type": "reel",
        "cost": 4,
        "new": false,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "unboxing-reaction",
        "cat": "Reaction",
        "name": "Unboxing Reaction",
        "type": "reel",
        "cost": 4,
        "new": false,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🎁",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "problem-solution",
        "cat": "Talking",
        "name": "Problem → Solution",
        "type": "reel",
        "cost": 6,
        "new": false,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "talking-head-testimonial",
        "cat": "Talking",
        "name": "Talking-Head Testimonial",
        "type": "reel",
        "cost": 6,
        "new": false,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🗣️",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "product-demo",
        "cat": "Demo",
        "name": "Product Demo",
        "type": "reel",
        "cost": 8,
        "new": false,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      }
    ],
    "general": [
      {
        "id": "clean-hero-pack",
        "cat": "Hero",
        "name": "Clean Hero Pack",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock",
          "emissive_render"
        ],
        "held": true,
        "emoji": "✨",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "lifestyle-in-context",
        "cat": "Lifestyle",
        "name": "Lifestyle-in-Context",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🛋️",
        "grad": "linear-gradient(150deg,#ffce7a,#ff5f8f)"
      },
      {
        "id": "packaging-and-unboxing",
        "cat": "Packaging",
        "name": "Packaging & Unboxing",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [
          "text_overlay"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🎁",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      },
      {
        "id": "macro-detail",
        "cat": "Detail",
        "name": "Macro Detail",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🔬",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)"
      },
      {
        "id": "flat-lay-grid",
        "cat": "FlatLay",
        "name": "Flat-Lay Grid",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [
          "text_overlay"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🧩",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "any-product-drop-reel",
        "cat": "Reel",
        "name": "Any-Product Drop Reel",
        "type": "reel",
        "cost": 4,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🎬",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "universal-360-spin",
        "cat": "Reel",
        "name": "Universal 360 Spin",
        "type": "reel",
        "cost": 6,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock",
          "emissive_render"
        ],
        "held": true,
        "emoji": "🔄",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "large-format-hero",
        "cat": "Hero",
        "name": "Large-Format Hero",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review",
          "oversize"
        ],
        "text_overlay": false,
        "guards": [
          "form_lock",
          "single_sku",
          "label_lock",
          "reflection_control",
          "scale_cue",
          "count_lock",
          "emissive_render"
        ],
        "held": true,
        "emoji": "✨",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)"
      }
    ],
    "headshot": [
      {
        "id": "linkedin-classic",
        "cat": "Headshot",
        "name": "LinkedIn Classic",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": false,
        "emoji": "💼",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "executive-authority",
        "cat": "Headshot",
        "name": "Executive Authority",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "💼",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
      },
      {
        "id": "background-and-wardrobe-swap",
        "cat": "Headshot",
        "name": "Background & Wardrobe Swap",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "💼",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
      {
        "id": "team-page-consistent",
        "cat": "Headshot",
        "name": "Team Page Consistent",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "💼",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "approachable-brand",
        "cat": "Headshot",
        "name": "Approachable Brand",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "💼",
        "grad": "linear-gradient(150deg,#5ee0d6,#7c6cff)"
      },
      {
        "id": "speaking-profile-reel",
        "cat": "Reel",
        "name": "Speaking Profile Reel",
        "type": "reel",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "💼",
        "grad": "linear-gradient(150deg,#5ee0d6,#9b7bff)"
      },
      {
        "id": "about-page-intro-reel",
        "cat": "Reel",
        "name": "About-Page Intro Reel",
        "type": "reel",
        "cost": 4,
        "new": true,
        "provisional": false,
        "flags": [
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "💼",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      }
    ],
    "productcut": [
      {
        "id": "product-cut",
        "cat": "ProductCut",
        "name": "Product Cut",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🖼️",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)",
        "cuts": [
          {
            "id": "flat-lay-cut",
            "name": "Flat Lay Cut",
            "preview": null
          },
          {
            "id": "ghost-mannequin-cut",
            "name": "Ghost Mannequin Cut",
            "preview": null
          }
        ]
      }
    ],
    "studiomodel": [
      {
        "id": "model-cut",
        "cat": "OnModel",
        "name": "Model Cut",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)",
        "picker": "model"
      }
    ],
    "producthero": [
      {
        "id": "product-hero",
        "cat": "Hero",
        "name": "Product Hero",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "✨",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)",
        "cuts": [
          {
            "id": "dewy-glass",
            "name": "Dewy Glass",
            "preview": null,
            "fit": []
          },
          {
            "id": "liquid-splash",
            "name": "Liquid Splash",
            "preview": null,
            "fit": [
              "skincare"
            ]
          },
          {
            "id": "botanical-dew",
            "name": "Botanical Dew",
            "preview": null,
            "fit": [
              "skincare"
            ]
          },
          {
            "id": "aqua-float",
            "name": "Aqua Float",
            "preview": null,
            "fit": [
              "skincare"
            ]
          },
          {
            "id": "cryo-frost",
            "name": "Cryo Frost",
            "preview": null,
            "fit": [
              "skincare"
            ]
          },
          {
            "id": "noir-gold",
            "name": "Noir Gold",
            "preview": null,
            "fit": [
              "luxury",
              "fragrance"
            ]
          },
          {
            "id": "silk-drape",
            "name": "Silk Drape",
            "preview": null,
            "fit": [
              "luxury",
              "fragrance"
            ]
          },
          {
            "id": "stone-plinth-luxe",
            "name": "Stone Plinth Luxe",
            "preview": null,
            "fit": [
              "luxury",
              "skincare"
            ]
          },
          {
            "id": "sunlit-pop",
            "name": "Sunlit Pop",
            "preview": null,
            "fit": [
              "color"
            ]
          },
          {
            "id": "gift-set-group",
            "name": "Gift Set Group",
            "preview": null,
            "fit": [
              "set"
            ]
          },
          {
            "id": "bold-color-block",
            "name": "Bold Color Block",
            "preview": null,
            "fit": [
              "color"
            ]
          },
          {
            "id": "gloss-mirror",
            "name": "Gloss Mirror",
            "preview": null,
            "fit": [
              "color",
              "luxury"
            ]
          },
          {
            "id": "palette-flat-lay",
            "name": "Palette Flat-lay",
            "preview": null,
            "fit": [
              "color",
              "set"
            ]
          },
          {
            "id": "swatch-beside",
            "name": "Swatch Beside",
            "preview": null,
            "fit": [
              "color"
            ]
          },
          {
            "id": "light-caustics",
            "name": "Light Caustics",
            "preview": null,
            "fit": [
              "fragrance"
            ]
          },
          {
            "id": "mineral-crystal",
            "name": "Mineral Crystal",
            "preview": null,
            "fit": [
              "fragrance",
              "luxury"
            ]
          },
          {
            "id": "wet-tile-spa",
            "name": "Wet Tile Spa",
            "preview": null,
            "fit": [
              "body",
              "skincare"
            ]
          },
          {
            "id": "bath-ledge",
            "name": "Bath Ledge",
            "preview": null,
            "fit": [
              "body"
            ]
          },
          {
            "id": "foam-and-suds",
            "name": "Foam & Suds",
            "preview": null,
            "fit": [
              "body"
            ]
          }
        ]
      }
    ],
    "accessories": [
      {
        "id": "jewelry-product-cut",
        "cat": "Product Cut",
        "name": "Jewelry Product Cut",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🖼️",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)",
        "cuts": [
          {
            "id": "jewelry-flat-lay",
            "name": "Jewelry Flat Lay",
            "preview": null
          },
          {
            "id": "jewelry-floating",
            "name": "Jewelry Floating",
            "preview": null
          },
          {
            "id": "jewelry-pedestal",
            "name": "Jewelry Pedestal",
            "preview": null
          },
          {
            "id": "jewelry-macro-detail",
            "name": "Jewelry Macro Detail",
            "preview": null
          }
        ]
      },
      {
        "id": "jewelry-worn-cut",
        "cat": "Worn Cut",
        "name": "Jewelry Worn Cut",
        "type": "image",
        "cost": 3,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🖼️",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)",
        "cuts": [
          {
            "id": "jewelry-on-hand",
            "name": "Jewelry On Hand",
            "preview": null
          },
          {
            "id": "jewelry-on-neck",
            "name": "Jewelry On Neck",
            "preview": null
          },
          {
            "id": "jewelry-on-ears",
            "name": "Jewelry On Ears",
            "preview": null
          },
          {
            "id": "jewelry-on-wrist",
            "name": "Jewelry On Wrist",
            "preview": null
          }
        ],
        "axes": [
          "skin",
          "age",
          "concept"
        ]
      },
      {
        "id": "jewelry-on-model",
        "cat": "On Model",
        "name": "Jewelry On Model",
        "type": "image",
        "cost": 5,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🖼️",
        "grad": "linear-gradient(150deg,#ff9a6b,#ffce7a)",
        "cuts": [
          {
            "id": "jewelry-on-model-earrings",
            "name": "Jewelry On Model Earrings",
            "preview": null
          },
          {
            "id": "jewelry-on-model-necklace",
            "name": "Jewelry On Model Necklace",
            "preview": null
          },
          {
            "id": "jewelry-on-model-ring",
            "name": "Jewelry On Model Ring",
            "preview": null
          },
          {
            "id": "jewelry-on-model-bracelet",
            "name": "Jewelry On Model Bracelet",
            "preview": null
          }
        ],
        "picker": "model"
      },
      {
        "id": "jewelry-hero",
        "cat": "Hero",
        "name": "Jewelry Hero",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "✨",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)",
        "cuts": [
          {
            "id": "jewelry-noir-gold",
            "name": "Jewelry Noir Gold",
            "preview": null
          },
          {
            "id": "jewelry-marble-plinth",
            "name": "Jewelry Marble Plinth",
            "preview": null
          },
          {
            "id": "jewelry-silk-drape",
            "name": "Jewelry Silk Drape",
            "preview": null
          },
          {
            "id": "jewelry-spotlight",
            "name": "Jewelry Spotlight",
            "preview": null
          },
          {
            "id": "jewelry-floating-luxe",
            "name": "Jewelry Floating Luxe",
            "preview": null
          }
        ]
      }
    ],
    "underwear": [
      {
        "id": "underwear-product-cut",
        "cat": "Product Cut",
        "name": "Underwear Product Cut",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#7c6cff,#5ee0d6)",
        "cuts": [
          {
            "id": "underwear-flat-lay",
            "name": "Underwear Flat Lay",
            "preview": null
          },
          {
            "id": "underwear-ghost-mannequin",
            "name": "Underwear Ghost Mannequin",
            "preview": null
          },
          {
            "id": "underwear-packaging",
            "name": "Underwear Packaging",
            "preview": null
          },
          {
            "id": "underwear-fabric-macro",
            "name": "Underwear Fabric Macro",
            "preview": null
          }
        ]
      },
      {
        "id": "underwear-hero",
        "cat": "Hero",
        "name": "Underwear Hero",
        "type": "image",
        "cost": 2,
        "new": true,
        "provisional": false,
        "flags": [
          "experimental",
          "needs_human_review"
        ],
        "text_overlay": false,
        "guards": [],
        "held": true,
        "emoji": "✨",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)",
        "cuts": [
          {
            "id": "underwear-noir",
            "name": "Underwear Noir",
            "preview": null
          },
          {
            "id": "underwear-athletic",
            "name": "Underwear Athletic",
            "preview": null
          },
          {
            "id": "underwear-natural-linen",
            "name": "Underwear Natural Linen",
            "preview": null
          },
          {
            "id": "underwear-spotlight",
            "name": "Underwear Spotlight",
            "preview": null
          }
        ]
      }
    ]
  }
};
  if (typeof window !== 'undefined') window.RECIPES = R;
  if (typeof module !== 'undefined' && module.exports) module.exports = R;
})();
