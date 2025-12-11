import { GoogleGenAI, Type } from "@google/genai";
import { BrandingConfig, GeneratedAsset, GuidelinesConfig, UploadedAsset } from "../types";

// Helper to generate a single image using Nano Banana Pro (gemini-3-pro-image-preview)
const generateImage = async (prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return 'https://placehold.co/800x450/1a1a1a/FFF?text=Image+Generation+Failed';
  } catch (error) {
    console.error("Image gen error:", error);
    return 'https://placehold.co/800x450/1a1a1a/FFF?text=Image+Service+Unavailable';
  }
};

export const generateMarketingAsset = async (
  rawContent: string,
  branding: BrandingConfig,
  guidelines: GuidelinesConfig,
  uploadedImages: UploadedAsset[],
  onStatusUpdate: (status: string) => void
): Promise<GeneratedAsset> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use Flash for the text/code generation intelligence
  const modelId = "gemini-2.5-flash";

  const isEmail = branding.contentType === 'email';
  const isRapsodo = branding.brandProfile === 'rapsodo';
  const imageStrategy = branding.imageStyle;

  const engineeringGuidelines = isEmail ? guidelines.emailEngineering : guidelines.webEngineering;

  let layoutInstructions = "";
  
  // RAPSODO BRAND SYSTEM LOGIC
  if (isRapsodo) {
      layoutInstructions = `
      **RAPSODO DESIGN SYSTEM (STRICT COMPLIANCE)**
      You are not just making a dark page. You are building a Rapsodo Brand Asset.
      
      1. **Typography (Non-Negotiable):**
         - **HEADLINES:** Must use 'font-condensed' (Bebas Neue). MUST be 'uppercase'. MUST include 'tracking-widest'.
         - **SIZE:** Headlines should be HUGE (text-6xl or text-7xl for Hero, text-4xl for section headers).
         - **BODY:** Clean sans-serif ('font-sans'), readable text-gray-300.

      2. **Color Palette (Official Hexes):**
         - **Backgrounds:** PURE BLACK (#000000) or OFF-BLACK (#0f0f0f). Do not use blue-tinted grays.
         - **Accents:** Rapsodo Red (#C8102E). Use this for buttons, borders, and horizontal rule lines.
         - **Text:** White (#FFFFFF) for headers. Light Gray (#D4D4D4) for body. NEVER use black text on these backgrounds.

      3. **Visual Language (Aggressive & Technical):**
         - **Borders:** Use thin, sharp borders (border-neutral-800).
         - **Corners:** Use 'rounded-sm' or 'rounded-none'. Avoid soft 'rounded-xl' or 'rounded-2xl'. This is sports tech, not a lifestyle blog.
         - **Separators:** Use a red accent line (w-24 h-1 bg-[#C8102E]) under every main section headline.

      4. **Layout Structure (Editorial/Instructional):**
         - **Hero Section:** Full height, immersive. Text bottom-left or centered.
         - **Steps:** Alternating full-width sections. 
            - Odd Steps: bg-black.
            - Even Steps: bg-[#111111].
         - **Images:** "Cinema Mode". Full width container, image centered within it. Add a subtle 'border border-neutral-800' around images.

      5. **Footer / Support (Crucial):**
         - Background: #000000.
         - Grid: 4 Columns (Email Support, Call Us, Resources, Socials).
         - Text: White headers, Gray links.
         - **NO BLACK TEXT IN FOOTER.**
      `;
  } else if (branding.contentType === 'landing_page') {
    // GENERIC LANDING PAGE LOGIC
    layoutInstructions = `
    **STRICT LAYOUT RULE: DARK MODE EDITORIAL FLOW**
    - **Global Theme:** DARK MODE ONLY. Backgrounds must be #000000 or #18181b (zinc-900). Text must be White.
    - **Structure:** Full-Width Alternating Sections.
      - Step 1: Pure Black Background (bg-black).
      - Step 2: Dark Zinc Background (bg-zinc-900/50).
    - **Typography:** Headlines text-white. Body text-zinc-400.
    - **Spacing:** 'py-24' or 'py-32' for sections.
    - **Footer:** Background Black. Text Light Gray.
    `;
  }

  let imageInstructions = "";
  if (imageStrategy === 'none') {
    imageInstructions = "DO NOT include any <img> tags or images in the layout. Text only.";
  } else if (imageStrategy === 'placeholder') {
    imageInstructions = "Use placeholder images: 'https://placehold.co/800x600/333/FFF?text=Visual'.";
  } else if (imageStrategy === 'upload') {
    imageInstructions = `
      **INTELLIGENT VISUAL MAPPING (MULTIMODAL ANALYSIS):**
      I have attached the actual images available for this project to this prompt.
      
      **YOUR TASK:**
      1. **VISUAL ANALYSIS:** LOOK at each image. Identify forms, charts, logos, screenshots.
      2. **CONTEXT MATCHING:** Place the image NEXT TO the text that describes it.
         - If text says "Click Plans", find the image showing the "Plans" tab.
         - If text says "Enter Credit Card", find the image showing the form.
      
      **TOKENS & RULES:**
      - Use token: {{UPLOADED_IMAGE_X}} (where X is the index provided below).
      - **Image Styling:** <img src="{{UPLOADED_IMAGE_X}}" class="droppable-image w-full max-w-5xl mx-auto shadow-2xl border border-neutral-800" />
      
      **CRITICAL - MISSING IMAGES:**
      - If a step (e.g. Step 6) has NO matching image in the assets:
      - **DO NOT** use a placeholder.
      - **DO NOT** invent an image.
      - **USE TOKEN:** {{REMOVE_IMAGE}} inside the src.
      - Example: <img src="{{REMOVE_IMAGE}}" />.
    `;
  } else if (imageStrategy === 'ai_generated') {
    imageInstructions = `
      Use specific tokens: {{IMAGE_0}}, {{IMAGE_1}}, etc.
      Provide 'imagePrompts' array in JSON.
      Prompts should be photographic, high-contrast, moody, suitable for sports tech.
    `;
  }

  let brandInstructions = "";
  if (isRapsodo) {
    brandInstructions = `
    **RAPSODO COPYWRITING GUIDELINES:**
    - **Tone:** "Measure to Master". Confident, Instructional, Precision-focused.
    - **Keywords:** Grind, Data, Metrics, Pro-Level, Unlock.
    - **Headlines:** Short, Punchy, Imperative. (e.g., "DIAL IT IN", "OWN YOUR NUMBERS").
    - **Formatting:** Use **Bold** for key metrics or instructions.
    `;
  } else {
    brandInstructions = `
    **Branding Guidelines (DARK MODE):**
    - **THEME:** ALWAYS DARK MODE.
    - Tone: ${branding.toneOfVoice}
    `;
  }

  const promptText = `
    You are a specialized AI User Interface Engineer and Marketing Copywriter (2025 Standards).
    
    **TASK:** 
    Transform the raw input into a professional ${branding.contentType} asset.
    
    **INPUT CONTENT:**
    "${rawContent}"

    ---------------------------------------------------
    **PART I: BRAND & COPY STRATEGY**
    ${brandInstructions}

    **Copywriting Directive:**
    1. Rewrite the input content to match the brand tone.
    2. Structure it for high-conversion.
    3. **Content Preservation:** Include ALL instructional steps from the input. Do not summarize technical steps.

    ---------------------------------------------------
    **PART II: ENGINEERING SPECIFICATIONS**
    ${engineeringGuidelines}
    
    **Layout & Visuals:**
    ${layoutInstructions}
    ${imageInstructions}

    **Agent Logic:**
    ${guidelines.agentLogic}

    ---------------------------------------------------
    **PART III: OUTPUT SCHEMA (JSON ONLY)**
    Return a valid JSON object with:
    - rewrittenCopy: The optimized marketing text (markdown format).
    - htmlLayout: The complete, single-file HTML code (including Tailwind CDN or inline styles).
    - explanation: Brief design rationale.
    - imagePrompts: Array of strings (optional).
  `;

  onStatusUpdate("Analyzing visual context & brand guidelines...");

  const parts: any[] = [{ text: promptText }];

  if (branding.imageStyle === 'upload' && uploadedImages.length > 0) {
    uploadedImages.forEach((img, index) => {
      // Skip images marked as do_not_use
      if (img.tag === 'do_not_use') return;

      const matches = img.data.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
          parts.push({
              text: `[IMAGE_TOKEN_ID: {{UPLOADED_IMAGE_${index}}} - Size: ${img.width}x${img.height}]` 
          });
      }
    });
  }

  try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    rewrittenCopy: { type: Type.STRING },
                    htmlLayout: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    imagePrompts: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["rewrittenCopy", "htmlLayout", "explanation"]
            }
        }
      });

      const jsonText = response.text;
      if (!jsonText) throw new Error("No response from AI");

      let parsed: GeneratedAsset;
      parsed = JSON.parse(jsonText);

      // Post-Processing: Replace Image Tokens
      if (branding.imageStyle === 'upload') {
         uploadedImages.forEach((img, index) => {
             const token = `{{UPLOADED_IMAGE_${index}}}`;
             parsed.htmlLayout = parsed.htmlLayout.split(token).join(img.data);
         });
         
         // CLEANUP: Remove images that were designated to be removed
         // This regex removes the container if it only contains the image, or just the image tag
         parsed.htmlLayout = parsed.htmlLayout.replace(/<div[^>]*>\s*<img[^>]*src=["']{{REMOVE_IMAGE}}["'][^>]*>\s*<\/div>/g, '');
         parsed.htmlLayout = parsed.htmlLayout.replace(/<img[^>]*src=["']{{REMOVE_IMAGE}}["'][^>]*>/g, '');
         
         // Fallback cleanup
         parsed.htmlLayout = parsed.htmlLayout.replace(/{{UPLOADED_IMAGE_\d+}}/g, '');
      }

      // AI Image Generation Pipeline
      if (branding.imageStyle === 'ai_generated' && parsed.imagePrompts && parsed.imagePrompts.length > 0) {
         onStatusUpdate(`Generating ${parsed.imagePrompts.length} custom AI images...`);
         
         const imagePromises = parsed.imagePrompts.map(async (prompt, idx) => {
            const imageUrl = await generateImage(prompt);
            return { token: `{{IMAGE_${idx}}}`, url: imageUrl };
         });

         const generatedImages = await Promise.all(imagePromises);

         generatedImages.forEach(img => {
             parsed.htmlLayout = parsed.htmlLayout.split(img.token).join(img.url);
         });
      }

      return parsed;
  } catch (err) {
      console.error("Gemini API Error:", err);
      throw err;
  }
};