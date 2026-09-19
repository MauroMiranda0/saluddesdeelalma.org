---
name: Organic Soul & Vitality
colors:
  surface: '#fff8f3'
  surface-dim: '#e4d8cc'
  surface-bright: '#fff8f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fef2e5'
  surface-container: '#f8ece0'
  surface-container-high: '#f2e6da'
  surface-container-highest: '#ece1d5'
  on-surface: '#201b14'
  on-surface-variant: '#48473d'
  inverse-surface: '#362f27'
  inverse-on-surface: '#fbefe3'
  outline: '#79776c'
  outline-variant: '#c9c7ba'
  surface-tint: '#606042'
  primary: '#5e5d3f'
  on-primary: '#ffffff'
  primary-container: '#777656'
  on-primary-container: '#fffbff'
  inverse-primary: '#cac8a3'
  secondary: '#78583c'
  on-secondary: '#ffffff'
  secondary-container: '#fed2af'
  on-secondary-container: '#79583d'
  tertiary: '#715735'
  on-tertiary: '#ffffff'
  tertiary-container: '#8c704b'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e7e4be'
  primary-fixed-dim: '#cac8a3'
  on-primary-fixed: '#1d1d05'
  on-primary-fixed-variant: '#49482c'
  secondary-fixed: '#ffdcc1'
  secondary-fixed-dim: '#e9be9c'
  on-secondary-fixed: '#2c1602'
  on-secondary-fixed-variant: '#5e4027'
  tertiary-fixed: '#ffddb4'
  tertiary-fixed-dim: '#e4c196'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#5a4222'
  background: '#fff8f3'
  on-background: '#201b14'
  surface-variant: '#ece1d5'
typography:
  display-lg:
    fontFamily: EB Garamond
    fontSize: 56px
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 40px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-md:
    fontFamily: EB Garamond
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.3'
  title-lg:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.5'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  section-gap: 120px
---

## Brand & Style

The design system is centered on a "Holistic-Modern" aesthetic, bridging the gap between professional healthcare and spiritual wellness. It evokes a sense of tranquility, groundedness, and warmth, directly reflecting the nurturing relationship between mind, body, and spirit.

The style leverages **Minimalism** through generous whitespace and a restricted, nature-inspired palette, while incorporating **Tactile** elements like soft shadows and organic textures. The visual narrative is defined by:
- **Atmosphere:** Calm, maternal, and sophisticated.
- **Target Audience:** Individuals seeking mental health support, spiritual growth, and holistic wellness.
- **Visual Cues:** Botanical illustrations, circular framing (echoing the logo), and a soft, parchment-like background that feels more human than clinical.

## Colors

The palette is a sophisticated "Earthy Neutral" scheme that draws from natural landscapes—forests, sand, and stone.

- **Base (#f3e7db):** Used as the primary background color to reduce eye strain and provide a warm, inviting canvas compared to pure white.
- **Olive Green (#868564):** The primary action color, used for headers, primary buttons, and representing growth and stability.
- **Earthy Brown (#7e5d41):** Used for deep contrast, footers, and secondary text to provide a grounded, authoritative feel.
- **Warm Ochre (#e8c59a):** An accent for highlights, icons, and call-to-actions that require warmth without the aggression of traditional warning colors.
- **Light Green (#cfc7ab):** Ideal for secondary backgrounds, hover states, and subtle UI divisions.

## Typography

This design system utilizes a high-contrast typographic pairing to balance tradition with modernity.

- **Headlines:** Use **EB Garamond**. This elegant serif brings a literary, authoritative, and spiritual quality to the interface. It should be used for all major headings and "aspirational" copy.
- **Body & UI:** Use **Manrope**. This modern sans-serif provides excellent legibility for clinical data, forms, and administrative dashboards. Its geometric yet friendly curves complement the serif's organic nature.
- **Styling Note:** Large display text should use a slightly tighter letter-spacing to maintain a premium feel. Labels and small navigational elements should use uppercase with increased tracking for clarity.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** with generous padding to reinforce the "calm" brand pillar.

- **Grid:** A 12-column system for desktop and a 4-column system for mobile.
- **Rhythm:** An 8px linear scale drives all padding and margin decisions. 
- **Sectioning:** Large vertical gaps (120px+) between landing page sections are encouraged to allow the content to "breathe" and prevent the user from feeling overwhelmed.
- **Alignment:** Content is generally center-aligned for marketing sections to emphasize focus, while dashboard views are left-aligned for functional efficiency.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and soft, natural shadows rather than heavy borders.

- **Surface Levels:** 
    - Level 0: Base background (#f3e7db).
    - Level 1: Elevated cards or containers using White (#ffffff) with a very soft, diffused shadow (15% opacity of Earthy Brown).
    - Level 2: Interactive elements like popovers or active navigation items.
- **Shadows:** Use "Ambient Shadows"—wide blur radii (20px-40px) with very low opacity to mimic natural sunlight. Avoid pure black shadows; always tint shadows with the Earthy Brown hex to maintain warmth.
- **Glassmorphism:** Reserved for top navigation bars and mobile overlays to maintain context of the background illustrations. Use a 10px backdrop-blur.

## Shapes

The shape language is organic and soft. There are no sharp corners in the design system.

- **Corner Radius:** Standard components (buttons, inputs) use a **0.5rem (8px)** radius. Larger containers like cards use **1rem (16px)**.
- **Circular Motifs:** In honor of the logo, use circular containers for profile images, icon backgrounds, and decorative graphic elements. 
- **Buttons:** Use fully rounded (pill-shaped) ends for primary call-to-action buttons to maximize the "friendly" and "approachable" feel.

## Components

- **Buttons:** 
    - *Primary:* Solid Olive Green (#868564) with white text. Pill-shaped.
    - *Secondary:* Outlined Earthy Brown (#7e5d41) with 1px border.
- **Input Fields:** Soft beige backgrounds (#f3e7db at 50% opacity) with a 1px Light Green border. Focus state moves to an Olive Green border.
- **Cards:** White background, 16px corner radius, soft ambient shadow. Used for services and testimonials.
- **Chips/Badges:** Small, pill-shaped tags using the Light Green (#cfc7ab) or Warm Ochre (#e8c59a) with dark brown text for status indicators (e.g., "Active", "Pending").
- **Lists:** Clean, borderless rows with subtle dividers (1px Light Green).
- **Botanical Accents:** Small leaf or floral icons should be used as dividers or corner ornaments to reinforce the "Soul and Vitality" theme.