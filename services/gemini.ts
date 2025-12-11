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
  if (branding.contentType === 'landing_page') {
    layoutInstructions = `
    **STRICT LAYOUT RULE: SINGLE PAGE SCROLLING APPLICATION**
    - This must be a "One Page" landing page experience.
    - **CRITICAL: COMPREHENSIVE CONTENT PRESERVATION.** You MUST include ALL instructional text, technical steps, and details provided in the input. 
    - Do NOT summarize or remove technical instructions. If the user provides a 20-step setup guide, the landing page MUST contain all 20 steps.
    - Length is NOT a constraint. A very long, scrolling page is expected and acceptable to ensure the user has all necessary information.
    - All content must be contained within this single HTML response.
    - DO NOT create navigation links to external pages or other routes (e.g. NO <a href="/about">).
    - If a navigation bar is present, links MUST be anchor links (e.g. href="#setup") pointing to IDs within this page.
    - Organize the content into distinct vertically stacked sections (e.g., Hero -> Benefits -> Detailed Instructions -> Troubleshooting -> CTA).
    - Ensure smooth scrolling behavior (html { scroll-behavior: smooth; }).
    `;
  }

  let imageInstructions = "";
  if (imageStrategy === 'none') {
    imageInstructions = "DO NOT include any <img> tags or images in the layout. Text only.";
  } else if (imageStrategy === 'placeholder') {
    imageInstructions = "Use placeholder images: 'https://placehold.co/800x600/333/FFF?text=Visual'.";
  } else if (imageStrategy === 'upload') {
    // Construct a semantic manifest of the uploaded assets
    const assetManifest = uploadedImages.map((img, i) => 
      `- TOKEN: {{UPLOADED_IMAGE_${i}}} | TYPE: ${img.tag.toUpperCase()} | NAME: ${img.name}`
    ).join('\n');

    imageInstructions = `
      **ASSET UTILIZATION (DRAG & DROP READY):**
      The user has extracted specific assets from their documents. 
      
      **AVAILABLE ASSET TOKENS:**
      ${assetManifest}

      **INSTRUCTIONS:**
      1. Analyze the context of each section.
      2. If you see an extracted asset that perfectly matches the section (e.g., a "Product" extracted image for the "Product" section), use its token: {{UPLOADED_IMAGE_X}}.
      3. **IF UNSURE OR NO MATCH:** Use a Placeholder Token: {{UPLOADED_IMAGE_PLACEHOLDER}}.
      4. **CRITICAL:** Add the class "droppable-image" to EVERY <img> tag in your HTML. This enables the user to drag and drop their extracted assets onto the layout to fix any mistakes.
      5. Do not use generic placeholders if you can find a matching token in the list above.
      6. Try to distribute the images logically.
    `;
  } else if (imageStrategy === 'ai_generated') {
    imageInstructions = `
      You are designing a high-fidelity layout.
      For every image spot in the HTML, use a specific token: {{IMAGE_0}}, {{IMAGE_1}}, etc.
      Also, in the JSON response, provide an array 'imagePrompts' where index 0 corresponds to {{IMAGE_0}}.
      The prompts should be detailed, photographic descriptions suitable for a generative AI model (e.g. "A high intensity close up of a baseball pitcher releasing the ball, cinematic lighting, dark background, red rim light").
    `;
  }

  let brandInstructions = "";
  if (isRapsodo) {
    brandInstructions = `
    **RAPSODO SPECIFIC GUIDELINES (STRICT):**
    ${guidelines.rapsodoGuidelines}

    **Rapsodo Web Notes:**
    - Use 'bg-neutral-900' or 'bg-black' for hero sections.
    - Use 'text-white' for text on dark backgrounds.
    - Button Color: #C8102E.
    - Font: Condensed (Bebas/Futura).
    `;
  } else {
    brandInstructions = `
    **Generic Branding Guidelines:**
    - Primary: ${branding.primaryColor}
    - Secondary: ${branding.secondaryColor}
    - Tone: ${branding.toneOfVoice}
    `;
  }

  const prompt = `
    You are a specialized AI User Interface Engineer and Marketing Copywriter (2025 Standards).
    
    **TASK:** 
    Transform the raw input into a professional ${branding.contentType} asset.
    
    **INPUT CONTENT:**
    "${rawContent}"

    ---------------------------------------------------
    **PART I: BRAND & COPY STRATEGY**
    ${brandInstructions}

    **Copywriting Directive:**
    - Rewrite content to match brand voice.
    - ${isRapsodo ? 'Use specific Rapsodo phrases. Outcome first.' : 'Match requested tone.'}
    - Structure with Headlines, Subheads, and CTAs.
    ${branding.contentType === 'landing_page' ? '- **MANDATORY:** For Landing Pages, do NOT condense instructional text. Present it fully and clearly (e.g. using distinct sections, numbered lists, or cards) so the user can successfully complete the task.' : ''}

    ---------------------------------------------------
    **PART II: VISUAL STRATEGY**
    ${imageInstructions}

    ---------------------------------------------------
    **PART III: ENGINEERING SPECIFICATIONS**
    ${engineeringGuidelines}

    ${guidelines.agentLogic}

    **Specific Logic:**
    - Content Type: ${branding.contentType}
    ${!isEmail ? '- Use Tailwind CSS.' : '- DO NOT use Tailwind. Use inline CSS and Tables.'}
    ${layoutInstructions}

    ---------------------------------------------------
    **OUTPUT FORMAT:**
    Return JSON with:
    1. 'rewrittenCopy': Plain text copy.
    2. 'htmlLayout': Full HTML string.
    3. 'explanation': Rationale.
    4. 'imagePrompts': Array of strings (only if AI Generation is requested).
  `;

  try {
    onStatusUpdate("Generating Layout & Copy...");
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
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
    if (!jsonText) throw new Error("No content generated.");
    
    const result = JSON.parse(jsonText) as GeneratedAsset;
    let finalHtml = result.htmlLayout;

    // POST-PROCESSING: IMAGE INJECTION

    // 1. Handle Uploads
    if (imageStrategy === 'upload' && uploadedImages.length > 0) {
      onStatusUpdate("Injecting Uploaded Assets...");
      
      // Replace specific tokens first
      uploadedImages.forEach((img, index) => {
        finalHtml = finalHtml.replace(new RegExp(`{{UPLOADED_IMAGE_${index}}}`, 'g'), img.data);
      });
      
      // Cleanup unused tokens or placeholders with a generic placeholder that user can drag onto
      finalHtml = finalHtml.replace(/{{UPLOADED_IMAGE_PLACEHOLDER}}/g, 'https://placehold.co/800x600/333/FFF?text=Drag+Image+Here');
      finalHtml = finalHtml.replace(/{{UPLOADED_IMAGE_\d+}}/g, 'https://placehold.co/800x600/333/FFF?text=Drag+Image+Here');
    }

    // 2. Handle AI Generation
    if (imageStrategy === 'ai_generated' && result.imagePrompts && result.imagePrompts.length > 0) {
      onStatusUpdate(`Generating ${result.imagePrompts.length} AI Assets (Nano Banana Pro)...`);
      
      // Generate images in parallel
      const imagePromises = result.imagePrompts.map((p) => generateImage(p));
      const generatedImages = await Promise.all(imagePromises);

      generatedImages.forEach((base64Img, index) => {
        finalHtml = finalHtml.replace(new RegExp(`{{IMAGE_${index}}}`, 'g'), base64Img);
      });
      
      // Fallback cleanup
      finalHtml = finalHtml.replace(/{{IMAGE_\d+}}/g, 'https://placehold.co/800x600/333/FFF?text=Gen+Failed');
    }

    return { ...result, htmlLayout: finalHtml };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate asset. Please try again.");
  }
};