export const WEB_UI_DIRECTIVES = `
**ENGINEERING PARADIGM: WEB (MODULAR FLUIDITY)**

You are generating a Web UI. Adhere to the "Modular Fluidity" architecture (2025 Standard).

1. **Layout Engine: Bento Grid**
   - Use CSS Grid for the macro-layout.
   - Organize content into rectangular "cells" that span columns/rows based on importance.
   - **Corner Radius:** strictly 'rounded-3xl' (24px) or 'rounded-2xl' for all cards/cells.
   - **Gap:** Uniform spacing (gap-6 or gap-8).

2. **Visual Materiality**
   - If style is 'Modern': Use **Glassmorphism** (bg-opacity with backdrop-blur-md/lg, thin white borders).
   - If style is 'Bold'/'Athletic': Use **High Contrast / Neo-Brutalism** (Sharp borders, high contrast blacks, no blur).

3. **Typography: Variable & Fluid**
   - Use Tailwind's responsive text utilities (text-sm md:text-base lg:text-lg) to simulate fluid typography.
   - Pair a display font for headers with a utilitarian sans for data.

4. **Accessibility (WCAG 2.2)**
   - Ensure color contrast is > 4.5:1.
   - Interactive targets must have padding (min 44px height visual or touch target).
`;

export const EMAIL_ENGINEERING_DIRECTIVES = `
**ENGINEERING PARADIGM: EMAIL (DEFENSIVE ARCHAEOLOGY)**

You are generating an HTML Email. Adhere to "Defensive Archaeology" standards for 2025.

**CRITICAL: DO NOT USE TAILWIND CLASSES.** Outlook does not support them. You must output raw HTML with inline CSS.

1. **Layout Structure: Ghost Tables**
   - **NEVER** use Flexbox or CSS Grid for layout structure.
   - Use the **Ghost Table** pattern: Use HTML \`<table>\` for structure.
   - For Outlook compatibility, ensure robust table nesting (width="100%", cellspacing="0", cellpadding="0", border="0").

2. **CTA BUTTONS: THE 8 GOLDEN RULES (STRICT COMPLIANCE)**
   1. **Use a <table>-based button — never divs.** Outlook does not support border-radius reliably on divs.
   2. **The clickable area must be the <a> tag.** The link wraps the text inside the table cell, not the table itself.
   3. **Inline CSS ONLY.** Email clients strip external CSS.
   4. **Use VML for rounded corners in Outlook.** Without this, buttons are rectangles.
   5. **Buttons must have fixed padding applied directly to the <a> tag.** Padding on <td> is unreliable.
   6. **Colors must be solid.** No gradients, no opacity.
   7. **Avoid long CTA text.** 1–3 words max (e.g., "Shop Now", "Get Started").
   8. **Always include a fallback for dark mode.** Use a high-contrast border if needed.

   **REQUIRED VML BUTTON SNIPPET (ADAPT COLORS/SIZE):**
   \`\`\`html
   <!--[if mso]>
   <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="URL_HERE" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="#C8102E">
     <w:anchorlock/>
     <center>
   <![endif]-->
       <a href="URL_HERE" style="background-color:#C8102E;color:#ffffff;display:inline-block;font-family:sans-serif;font-size:16px;font-weight:bold;line-height:48px;text-align:center;text-decoration:none;width:200px;-webkit-text-size-adjust:none;border-radius:4px;">
         CTA TEXT HERE
       </a>
   <!--[if mso]>
     </center>
   </v:roundrect>
   <![endif]-->
   \`\`\`

3. **Typography & Images**
   - **Font Stack:** Declare robust font stacks: \`font-family: 'Inter', Helvetica, Arial, sans-serif;\`.
   - **Images:** Explicitly set \`width\` attributes on \`<img>\` tags (e.g. \`width="600"\`). CSS should be \`max-width: 100%; height: auto;\`.

4. **Dark Mode**
   - Include \`<meta name="color-scheme" content="light dark">\`.
   - Use media queries \`@media (prefers-color-scheme: dark)\` to invert colors where necessary.
`;

export const AI_AGENT_LOGIC = `
**DIRECTIVE LOGIC FOR AI AGENT:**

- **Input Analysis:** 
  - IF request implies "Dashboard" or "Data" -> Activate Bento Grid logic.
  - IF request is "Email" -> Activate Defensive Archaeology mode (Tables + VML Buttons).

- **Aesthetic Logic:**
  - **Glassmorphism:** Use \`backdrop-filter: blur(16px)\` + \`border-white/20\`.
  - **Neo-Brutalism:** Use \`border-black\` (2px-4px) + Hard Shadows + High Saturation colors.
`;