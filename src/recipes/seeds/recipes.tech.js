/**
 * Doppia recipe seed — tech (product mode), 6 templates.
 * 통합 스키마 v1 (docs/TEMPLATE_STRUCTURE.md: A2 layered + A5 shot-list). recipes 테이블에 INSERT.
 * 자동 생성(레시피 프롬프트 워크플로). config.look.extra_positive/negative + shots[].scene/pose/composition 사용.
 */
module.exports = [
  {
    "mode": "product",
    "vertical": "tech",
    "category": "Hero",
    "name": "Void Hero Cut",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 1,
    "rationale": "The default e-commerce hero — a clean, dramatic catalog cut that any gadget seller drops straight onto a PDP or ad as the lead image.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Studio",
        "attributes": [
          "lighting:single_key_softbox_with_rim",
          "color:near_black_void",
          "texture:matte_seamless_floor",
          "context:infinite_dark_background"
        ],
        "extra_positive": "premium tech product hero shot on seamless matte-black infinity cove, dramatic single softbox key from upper left, subtle cool rim light defining edges, controlled specular highlights on aluminum and glass, soft contact shadow grounding the device, 100mm macro lens, f8 deep focus, color-accurate, glossy gadget-launch advertising look, crisp product silhouette",
        "negative": "warped product geometry, melted edges, duplicated ports, extra buttons, fake logos, text artifacts, gibberish UI text, harsh blown highlights, dusty smudged surface, busy background, reflections of camera or photographer, plastic toy look, color shift on the device"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "infinite matte-black studio void, soft contact shadow beneath",
          "pose": "front-on hero angle, device perfectly upright and centered",
          "composition": "medium_shot"
        },
        {
          "scene": "dark seamless cove with cool rim light raking the edge",
          "pose": "three-quarter angle showing face and side profile, slight low camera for stature",
          "composition": "medium_shot"
        },
        {
          "scene": "black void with a single tight specular highlight band",
          "pose": "floating slightly above surface, dramatic levitation hero",
          "composition": "medium_shot"
        },
        {
          "scene": "dark backdrop with faint gradient glow behind the device",
          "pose": "back/side three-quarter showing ports and detailing",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "product",
    "vertical": "tech",
    "category": "Feature",
    "name": "Spec Callout Grid",
    "output_type": "image_set",
    "credit_cost": 2,
    "sort_order": 2,
    "rationale": "Sellers and Amazon/marketplace listers use this to turn one device into clean feature-callout panels (no real text baked in) that slot into infographic listings.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Studio",
        "attributes": [
          "lighting:bright_even_softbox_array",
          "color:cool_neutral_white",
          "texture:clean_seamless",
          "context:minimal_infographic_negative_space"
        ],
        "extra_positive": "clean feature-grid product photography, bright even diffused lighting with soft gradient backdrop, device isolated on a generous negative-space panel leaving room for spec callouts, crisp edge definition, subtle leader-line composition vibe, tech infographic listing aesthetic, 85mm lens, f9, true-to-spec colors, sharp focus across the device",
        "negative": "baked-in text, fake spec labels, gibberish lettering, numbers, arrows that touch the product, warped geometry, extra ports or buttons, cluttered background, harsh shadows, distorted proportions, plastic toy finish, watermarks, lens flare"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "bright soft-gradient backdrop, large empty area to the right for callouts",
          "pose": "device front-on, offset left in frame leaving negative space",
          "composition": "medium_shot"
        },
        {
          "scene": "clean light-grey panel with even fill light",
          "pose": "three-quarter angle highlighting the control surface and buttons",
          "composition": "medium_shot"
        },
        {
          "scene": "minimal white seamless, top area open for headline callout",
          "pose": "slight top-down tilt emphasizing the top face of the device",
          "composition": "medium_shot"
        },
        {
          "scene": "soft cool backdrop with directional separation light",
          "pose": "detail framing on the port/charging area for a feature panel",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "product",
    "vertical": "tech",
    "category": "Macro",
    "name": "Macro Tactile Zoom",
    "output_type": "image_set",
    "credit_cost": 4,
    "sort_order": 3,
    "rationale": "Premium-detail buyers (audio, wearables, accessories) use this to sell build quality — textures, machining, weave and finish at extreme close range.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Macro",
        "attributes": [
          "lighting:raking_grazing_light",
          "color:rich_contrast",
          "texture:micro_surface_detail",
          "context:dark_intimate_macro_set"
        ],
        "extra_positive": "extreme macro tactile detail of the device, raking grazing light revealing micro-texture, brushed aluminum grain, anodized finish, mesh weave, soft-touch coating, fine engraving and seams, 100mm macro lens at f4 with razor-thin focus and creamy bokeh falloff, focus-stacked sharpness on the hero detail, luxurious tech-craftsmanship mood",
        "negative": "soft mushy detail, out-of-focus subject, warped surface, fake textures, repeating pattern artifacts, dust and lint, fingerprints, text or logos invented, color noise, oversharpening halos, plastic toy look, duplicated seams"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "dark macro set, single grazing light across the surface",
          "pose": "extreme closeup on the brushed metal / finish texture",
          "composition": "closeup"
        },
        {
          "scene": "intimate low-key macro with soft falloff",
          "pose": "closeup on a physical button, dial or crown showing machining",
          "composition": "closeup"
        },
        {
          "scene": "macro set with cool rim accent",
          "pose": "closeup on speaker mesh / sensor / weave detail",
          "composition": "closeup"
        },
        {
          "scene": "dark backdrop, shallow-focus macro",
          "pose": "closeup on a logo-free engraved edge / chamfer / seam",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "product",
    "vertical": "tech",
    "category": "Lifestyle",
    "name": "Desk Setup Flatlay",
    "output_type": "image_set",
    "credit_cost": 3,
    "sort_order": 4,
    "rationale": "Lifestyle/UGC-style listing shots — places the gadget in an aspirational desk scene so creators and DTC brands sell the vibe, not just the spec sheet.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "image_set",
        "count": 4,
        "aspect_ratio": "4:5"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Lifestyle",
        "attributes": [
          "lighting:soft_window_daylight",
          "color:warm_neutral_tone",
          "texture:wood_and_linen",
          "context:minimal_creative_desk"
        ],
        "extra_positive": "aesthetic minimal desk setup flatlay, soft directional window daylight, warm neutral palette, walnut desk surface, linen, a small trailing plant, notebook and coffee as tasteful props, device as the clear hero in the composition, shallow depth with the product tack-sharp, 35mm lifestyle look, cozy productive work-from-home mood, tidy negative space",
        "negative": "warped product, duplicated devices, cluttered messy desk, distracting bright props competing with the product, fake brand logos, baked-in text, plastic toy finish, blown-out window, harsh shadows, extra cables tangled, color cast on the device, off-scale props"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "top-down walnut desk flatlay with plant, notebook and coffee",
          "pose": "product centered as hero among tidy props, top-down",
          "composition": "full_body"
        },
        {
          "scene": "desk corner near a bright window, soft daylight",
          "pose": "product placed in use-context at a 45-degree eye-level angle",
          "composition": "medium_shot"
        },
        {
          "scene": "minimal desk vignette with shallow background bokeh",
          "pose": "product in foreground, props softly blurred behind",
          "composition": "medium_shot"
        },
        {
          "scene": "styled desk surface with linen texture",
          "pose": "detail of product resting beside a single complementary prop",
          "composition": "closeup"
        }
      ],
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "product",
    "vertical": "tech",
    "category": "Reel",
    "name": "Unbox ASMR Reel",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 5,
    "rationale": "The scroll-stopping format for new-drop hype — a tactile unboxing reel that DTC tech brands run as the launch teaser on Reels/TikTok.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "reel",
        "count": 3,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Cinematic",
        "attributes": [
          "lighting:soft_directional_key_with_glow",
          "color:moody_premium_tone",
          "texture:premium_packaging_matte",
          "context:dark_tabletop_set"
        ],
        "extra_positive": "premium ASMR unboxing reel, dark moody tabletop set, soft directional key light with subtle glow, hands-free tasteful framing, matte premium packaging, satisfying reveal of the device, shallow cinematic depth, condensation-free clean surfaces, vertical 9:16, high-end gadget launch teaser mood",
        "negative": "warped product, duplicated devices, extra fingers, malformed hands, fake logos, baked-in text, gibberish, jittery shaky motion, blown highlights, plastic toy look, cluttered background, motion blur smearing the product, distorted geometry"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "closed matte premium box on a dark tabletop, single glow light",
          "pose": "sealed package front-on, anticipation framing",
          "composition": "closeup"
        },
        {
          "scene": "box lid lifting to reveal the device nested inside",
          "pose": "top-down lid-off reveal, device emerging from foam",
          "composition": "medium_shot"
        },
        {
          "scene": "device lifted out, hero glow on dark backdrop",
          "pose": "final device hero, slow turn into the light",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "slow push-in on the sealed box",
          "top-down lid lift with gentle parallax",
          "slow orbit reveal with light glint sweep"
        ],
        "duration_per_shot": 3,
        "transition": "cut",
        "music_mood": "satisfying ASMR ambient",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  },
  {
    "mode": "product",
    "vertical": "tech",
    "category": "Reel",
    "name": "360 Glow Spin",
    "output_type": "reel",
    "credit_cost": 6,
    "sort_order": 6,
    "rationale": "The all-angle proof shot — a glowing turntable spin that lets shoppers see every side, ideal as the PDP loop or paid-ad B-roll for any gadget.",
    "config": {
      "schema_version": 1,
      "mode": "product",
      "output": {
        "type": "reel",
        "count": 3,
        "aspect_ratio": "9:16"
      },
      "subject": {
        "type": "product",
        "reference_strategy": "product_composite",
        "min_refs": 1
      },
      "look": {
        "style_preset": "Studio",
        "attributes": [
          "lighting:rotating_rim_glow",
          "color:sleek_dark_gradient",
          "texture:glossy_reflective_finish",
          "context:reflective_turntable_void"
        ],
        "extra_positive": "360-degree turntable product spin reel, sleek dark gradient void, rotating rim glow tracing the edges, glossy reflective floor with a soft mirror reflection, controlled specular highlights sweeping the body as it rotates, color-accurate finish, vertical 9:16, premium gadget-launch turntable look, steady locked framing",
        "negative": "warped or morphing geometry, duplicated ports, the device changing shape between frames, fake logos, baked-in text, jittery wobble, blown highlights, plastic toy finish, cluttered background, motion blur smear, color shift, inconsistent reflection"
      },
      "shot_strategy": "list",
      "shots": [
        {
          "scene": "reflective turntable in a dark gradient void, rim glow on",
          "pose": "front face rotating into a three-quarter view",
          "composition": "medium_shot"
        },
        {
          "scene": "glossy floor with soft mirror reflection, sweeping highlight",
          "pose": "side profile continuing the smooth 360 rotation",
          "composition": "medium_shot"
        },
        {
          "scene": "dark void with rim light tracing the rear edge",
          "pose": "back and final return to front, completing the spin",
          "composition": "medium_shot"
        }
      ],
      "reel": {
        "per_shot_motion": [
          "smooth clockwise turntable rotation, locked camera",
          "continuous rotation with highlight glint sweeping across body",
          "completing rotation, slow push-in on the hero front face"
        ],
        "duration_per_shot": 3,
        "transition": "fade",
        "music_mood": "sleek minimal electronic",
        "captions": "auto"
      },
      "provider": {
        "image": "nano-banana",
        "video": "kling"
      }
    }
  }
];
