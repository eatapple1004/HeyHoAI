/* ⚠️ AUTO-GENERATED — DO NOT EDIT BY HAND.
 * 생성: node scripts/export_recipe_cards.js
 * 소스: docs/섹션명령서/_card_contract.proposed.json (카드 계약 · 시드 credit_cost 단일원)
 * 카드 cost=시드 credit_cost (pricing.js 아님). emoji/grad=FE 결정론 파생(A2c). guards=PREVIEW 전용(resolver L148 미착지 → '보장' 카피 금지).
 * 템플릿이 94→~93 재export하면 이 파일만 재생성하면 studio가 자동 반영.
 */
(function(){
  var R = {
  "generatedFrom": "_card_contract.proposed.json",
  "total": 94,
  "new_count": 59,
  "overlay_count": 6,
  "guarded_count": 73,
  "provisional_count": 18,
  "provisional_verticals": [
    "beauty",
    "home",
    "pet"
  ],
  "drift_guard": {
    "fe_total": 94,
    "contract_total": 94,
    "catalog_total": 94,
    "status_total": 94,
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
        "id": "dewy-glass-hero",
        "cat": "Hero",
        "name": "Dewy Glass Hero",
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
        "held": false,
        "emoji": "💄",
        "grad": "linear-gradient(150deg,#ffce7a,#ff7eb6)"
      },
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
        "id": "gift-set-group-hero",
        "cat": "Hero",
        "name": "Gift Set Group Hero",
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
        "emoji": "✨",
        "grad": "linear-gradient(150deg,#a99bff,#ff7eb6)"
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
        "id": "wrist-and-hand",
        "cat": "OnModel",
        "name": "Wrist & Hand",
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
          "scale_cue",
          "count_lock"
        ],
        "held": true,
        "emoji": "🧍",
        "grad": "linear-gradient(150deg,#ff7eb6,#7c6cff)"
      },
      {
        "id": "neck-and-ear-try-on",
        "cat": "OnModel",
        "name": "Neck & Ear Try-On",
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
        "held": true,
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
        "held": true,
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
        "held": true,
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
    ]
  }
};
  if (typeof window !== 'undefined') window.RECIPES = R;
  if (typeof module !== 'undefined' && module.exports) module.exports = R;
})();
