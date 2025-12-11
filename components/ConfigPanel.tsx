import React, { useRef, useState } from 'react';
import { BrandingConfig, GuidelinesConfig, UploadedAsset, AssetTag } from '../types';
import { Button } from './ui/Button';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface ConfigPanelProps {
  rawContent: string;
  setRawContent: (val: string) => void;
  branding: BrandingConfig;
  setBranding: (val: BrandingConfig) => void;
  guidelines: GuidelinesConfig;
  setGuidelines: (val: GuidelinesConfig) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  uploadedImages: UploadedAsset[];
  setUploadedImages: React.Dispatch<React.SetStateAction<UploadedAsset[]>>;
  onNavigateToExtractor: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  rawContent,
  setRawContent,
  branding,
  setBranding,
  guidelines,
  setGuidelines,
  onGenerate,
  isGenerating,
  uploadedImages,
  setUploadedImages,
  onNavigateToExtractor
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [view, setView] = useState<'generator' | 'settings'>('generator');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'brand' | 'web' | 'email' | 'logic'>('brand');
  
  const handleBrandingChange = <K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) => {
    setBranding({ ...branding, [key]: value });
  };

  const handleGuidelinesChange = <K extends keyof GuidelinesConfig>(key: K, value: GuidelinesConfig[K]) => {
    setGuidelines({ ...guidelines, [key]: value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        const extractedImages: UploadedAsset[] = [];
        const imageHashes = new Set<string>(); // Deduplication
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          
          // 1. Extract Text
          const textContent = await page.getTextContent();
          // @ts-ignore - pdfjs types alignment
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += `*** CONTENT FROM PDF PAGE ${i} ***\n${pageText}\n\n`;

          // 2. Deep Image Extraction (Native Interception Method)
          try {
            const viewport = page.getViewport({ scale: 1.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            if (ctx) {
                const originalDrawImage = ctx.drawImage;
                
                // Intercept drawImage calls
                // @ts-ignore
                ctx.drawImage = (image: CanvasImageSource, ...args: any[]) => {
                    try {
                        const width = 'width' in image ? (image.width as number) : 0;
                        const height = 'height' in image ? (image.height as number) : 0;

                        // Filter noise
                        if (width > 64 && height > 64) {
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = width;
                            tempCanvas.height = height;
                            const tempCtx = tempCanvas.getContext('2d');
                            if (tempCtx) {
                                tempCtx.drawImage(image, 0, 0);
                                const base64 = tempCanvas.toDataURL('image/png');
                                const key = `${width}x${height}-${base64.length}`;

                                if (!imageHashes.has(key)) {
                                    imageHashes.add(key);
                                    extractedImages.push({
                                        id: Math.random().toString(36).substr(2, 9),
                                        data: base64,
                                        name: `Pg${i}-Img${extractedImages.length + 1}`,
                                        tag: 'product',
                                        width,
                                        height
                                    });
                                }
                            }
                        }
                    } catch (err) {
                        // Silent fail for individual image
                    }
                    // Continue rendering
                    // @ts-ignore
                    originalDrawImage.apply(ctx, [image, ...args]);
                };

                // Render page to trigger interception
                // @ts-ignore
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            }
          } catch (renderErr) {
             console.warn(`Error rendering page ${i} for image extraction`, renderErr);
          }
        }
        
        setRawContent(fullText);
        
        if (extractedImages.length > 0) {
          setUploadedImages((prev) => [...prev, ...extractedImages]);
          handleBrandingChange('imageStyle', 'upload');
        } else {
           // Fallback: If no images extracted, grab page screenshots (legacy mode)
           // This is useful for scanned PDFs where everything is one big image anyway
           console.log("No individual images found. Falling back to page screenshots.");
           const fallbackImages: UploadedAsset[] = [];
           for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 1.5 });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              if (context) {
                // @ts-ignore - fix for render type mismatch requiring canvas property
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                fallbackImages.push({
                  id: Math.random().toString(36).substr(2, 9),
                  data: canvas.toDataURL('image/jpeg', 0.8),
                  name: `Page ${i} (Full)`,
                  tag: 'other',
                  width: viewport.width,
                  height: viewport.height
                });
              }
           }
           setUploadedImages((prev) => [...prev, ...fallbackImages]);
           handleBrandingChange('imageStyle', 'upload');
        }

      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setRawContent(content);
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Failed to read file. Please ensure it is a valid text or PDF file.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            // Create a temp image to get dimensions
            const img = new Image();
            img.onload = () => {
                const newAsset: UploadedAsset = {
                  id: Math.random().toString(36).substr(2, 9),
                  data: reader.result as string,
                  name: file.name,
                  tag: 'product', // Default tag
                  width: img.width,
                  height: img.height
                };
                setUploadedImages(prev => [...prev, newAsset]);
                handleBrandingChange('imageStyle', 'upload');
            };
            img.src = reader.result as string;
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const updateImageTag = (index: number, newTag: AssetTag) => {
    const updated = [...uploadedImages];
    updated[index].tag = newTag;
    setUploadedImages(updated);
  };

  const handleProfileChange = (profile: 'custom' | 'rapsodo') => {
    if (profile === 'rapsodo') {
      setBranding({
        ...branding,
        brandProfile: 'rapsodo',
        primaryColor: '#C8102E', // Rapsodo Red
        secondaryColor: '#000000', // Jet Black
        fontStyle: 'athletic',
        toneOfVoice: 'Measure to Master (Precision, Grind, Confidence)'
      });
    } else {
      setBranding({
        ...branding,
        brandProfile: 'custom',
        fontStyle: 'modern',
        toneOfVoice: 'Professional & Trustworthy'
      });
    }
  };

  const isRapsodo = branding.brandProfile === 'rapsodo';
  const assetTags: { val: AssetTag, label: string }[] = [
    { val: 'hero', label: 'Hero / Header' },
    { val: 'product', label: 'Product Shot' },
    { val: 'lifestyle', label: 'Lifestyle / Action' },
    { val: 'logo', label: 'Brand Logo' },
    { val: 'chart', label: 'Data / Chart' },
    { val: 'icon', label: 'Iconography' },
    { val: 'other', label: 'Other' },
    { val: 'do_not_use', label: 'DO NOT USE' },
  ];

  return (
    <div className="bg-zinc-950 border-r border-zinc-800 h-full flex flex-col w-full md:w-[420px] shrink-0 text-zinc-300">
      
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed tracking-wide text-white">
            BRANDALIGN <span className="text-[#C8102E]">POLISH</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">
              Marketing Asset Engine
            </p>
            <button 
              onClick={onNavigateToExtractor}
              className="text-[10px] font-bold text-[#C8102E] hover:text-white uppercase tracking-wider underline decoration-zinc-800 hover:decoration-white transition-all"
            >
              Get Images
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView(view === 'generator' ? 'settings' : 'generator')}
            className={`p-2 rounded-lg transition-colors ${view === 'settings' ? 'bg-[#C8102E] text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
            title="Global Configuration"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        
        {/* GENERATOR VIEW */}
        {view === 'generator' && (
          <div className="p-6 space-y-8 animate-fade-in">
            {/* Step 1: Input */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                 <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                   <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-800 text-zinc-400 text-[10px] border border-zinc-700">1</span>
                   Input Content
                 </label>
                 
                 <div className="flex items-center gap-3">
                   <input 
                     type="file" 
                     ref={fileInputRef}
                     onChange={handleFileUpload}
                     className="hidden" 
                     accept=".txt,.md,.json,.csv,.html,.pdf"
                   />
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     disabled={isUploading}
                     className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${isUploading ? 'text-zinc-600 cursor-wait' : 'text-zinc-500 hover:text-[#C8102E]'}`}
                     title="Import text or PDF file"
                   >
                      {isUploading ? (
                        <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      )}
                      <span>{isUploading ? 'Extracting...' : 'Upload PDF'}</span>
                   </button>
                   <div className="w-px h-3 bg-zinc-800"></div>
                   <span className="text-[10px] text-zinc-600 font-mono">{rawContent.length} chars</span>
                 </div>
              </div>
              <div className="relative group">
                <textarea
                  className="w-full h-40 p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:ring-2 focus:ring-[#C8102E] focus:border-transparent resize-none text-sm leading-relaxed transition-all group-hover:border-zinc-700"
                  placeholder="Paste text or upload a PDF (we'll extract copy & visuals automatically)..."
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                />
              </div>
            </section>

             {/* Step 2: Assets & Media */}
             <section className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                     <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-800 text-zinc-400 text-[10px] border border-zinc-700">2</span>
                     Assets & Media
                </label>
                {uploadedImages.length > 0 && (
                  <button onClick={() => setUploadedImages([])} className="text-[10px] text-zinc-600 hover:text-red-500 uppercase font-bold">Clear All</button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                 {[
                   { id: 'none', label: 'No Images' },
                   { id: 'placeholder', label: 'Placeholders' },
                   { id: 'upload', label: `Uploads (${uploadedImages.length})` },
                   { id: 'ai_generated', label: 'AI Generation' }
                 ].map(opt => (
                   <button
                    key={opt.id}
                    onClick={() => handleBrandingChange('imageStyle', opt.id as any)}
                    className={`p-2 text-[10px] font-bold uppercase border rounded-md transition-all ${
                      branding.imageStyle === opt.id 
                      ? 'bg-[#C8102E] text-white border-[#C8102E]' 
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                    }`}
                   >
                     {opt.label}
                   </button>
                 ))}
              </div>

              {branding.imageStyle === 'ai_generated' && (
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-md">
                   <div className="flex items-start gap-2">
                     <svg className="w-4 h-4 text-[#C8102E] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                     </svg>
                     <div>
                       <p className="text-[10px] font-bold text-zinc-300 uppercase">Nano Banana Pro</p>
                       <p className="text-[10px] text-zinc-500 mt-1">Generates high-fidelity imagery using Gemini 3 Pro Vision logic.</p>
                     </div>
                   </div>
                </div>
              )}

              {branding.imageStyle === 'upload' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {uploadedImages.map((img, idx) => {
                       // Smart layout: images wider than 400px take full width
                       const isWide = (img.width || 0) > 400;
                       const isExcluded = img.tag === 'do_not_use';
                       
                       return (
                        <div 
                          key={img.id} 
                          className={`
                            relative flex flex-col bg-zinc-900 border rounded-lg overflow-hidden group transition-all
                            ${isWide ? 'col-span-2' : 'col-span-1'} 
                            ${isExcluded ? 'border-zinc-800 opacity-50 grayscale' : 'border-zinc-800 hover:border-zinc-600'}
                          `}
                        >
                          {/* Image Preview */}
                          <div className={`
                            relative bg-black w-full overflow-hidden shrink-0
                            ${isWide ? 'h-32' : 'h-24'}
                          `}>
                             <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>
                             <img src={img.data} className="w-full h-full object-contain relative z-10" alt="upload" />
                             
                             {/* Size badge */}
                             {(img.width && img.height) && (
                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur rounded text-[8px] font-mono text-zinc-400 z-20">
                                  {img.width}x{img.height}
                                </div>
                             )}

                             {/* Remove Button */}
                             <button 
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity z-20"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                          </div>

                          {/* Controls */}
                          <div className="p-2 border-t border-zinc-800 bg-zinc-900">
                             <div className="flex justify-between items-center mb-1.5">
                               <p className="text-[10px] text-zinc-400 truncate font-mono max-w-[80px]">{img.name}</p>
                             </div>
                             <select
                                value={img.tag}
                                onChange={(e) => updateImageTag(idx, e.target.value as AssetTag)}
                                className={`
                                  w-full text-[9px] uppercase font-bold py-1 px-1.5 rounded border outline-none cursor-pointer
                                  ${isExcluded 
                                    ? 'bg-red-900/20 text-red-500 border-red-900/50' 
                                    : 'bg-zinc-950 text-white border-zinc-700 focus:border-[#C8102E]'
                                  }
                                `}
                              >
                                {assetTags.map(tag => (
                                  <option key={tag.val} value={tag.val}>{tag.label}</option>
                                ))}
                              </select>
                          </div>
                        </div>
                      );
                    })}
                    
                    <button 
                      onClick={() => imageInputRef.current?.click()}
                      className="col-span-2 py-3 rounded-md bg-zinc-900 border border-zinc-800 border-dashed hover:border-zinc-600 flex items-center justify-center gap-2 text-zinc-600 transition-colors group"
                    >
                      <svg className="w-4 h-4 group-hover:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      <span className="text-[10px] uppercase font-bold group-hover:text-zinc-400">Add More Images</span>
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={imageInputRef}
                    onChange={handleImageUpload}
                    className="hidden" 
                    accept="image/*"
                    multiple
                  />
                  <p className="text-[10px] text-zinc-600 text-center">AI uses these to build your asset. Set to "DO NOT USE" to ignore.</p>
                </div>
              )}
             </section>

            {/* Step 3: Branding */}
            <section className="space-y-5">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                   <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-800 text-zinc-400 text-[10px] border border-zinc-700">3</span>
                   Brand Identity
              </label>

              {/* Profile Selector Cards */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleProfileChange('custom')}
                  className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                    !isRapsodo 
                      ? 'border-white bg-zinc-800' 
                      : 'border-zinc-800 bg-transparent hover:border-zinc-700 text-zinc-500'
                  }`}
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-1">Custom</div>
                  <div className="text-[10px] opacity-70">Flexible parameters</div>
                </button>

                <button
                  onClick={() => handleProfileChange('rapsodo')}
                  className={`relative p-3 rounded-lg border-2 text-left transition-all overflow-hidden ${
                    isRapsodo 
                      ? 'border-[#C8102E] bg-zinc-900' 
                      : 'border-zinc-800 bg-transparent hover:border-zinc-700 text-zinc-500'
                  }`}
                >
                   {isRapsodo && (
                     <div className="absolute top-0 right-0 w-8 h-8 bg-[#C8102E] -mr-4 -mt-4 transform rotate-45"></div>
                   )}
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isRapsodo ? 'text-white' : ''}`}>Rapsodo</div>
                  <div className="text-[10px] opacity-70">Official Kit 2025</div>
                </button>
              </div>
              
              {/* Color Pickers */}
              <div className={`transition-all duration-300 ${isRapsodo ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                     <span className="text-xs font-medium text-zinc-400">Primary</span>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-500">{branding.primaryColor}</span>
                        <div className="relative overflow-hidden w-6 h-6 rounded-full border border-zinc-600 shadow-sm">
                          <input 
                            type="color" 
                            value={branding.primaryColor}
                            onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                            className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer p-0 border-0 opacity-0"
                          />
                          <div className="w-full h-full" style={{ backgroundColor: branding.primaryColor }} />
                        </div>
                     </div>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                     <span className="text-xs font-medium text-zinc-400">Accent</span>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-500">{branding.secondaryColor}</span>
                         <div className="relative overflow-hidden w-6 h-6 rounded-full border border-zinc-600 shadow-sm">
                          <input 
                            type="color" 
                            value={branding.secondaryColor}
                            onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                            className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer p-0 border-0 opacity-0"
                          />
                          <div className="w-full h-full" style={{ backgroundColor: branding.secondaryColor }} />
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              {/* Tone Selector */}
               <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 ml-1">Tone & Voice</label>
                {isRapsodo ? (
                  <div className="w-full p-3 rounded-md bg-zinc-900 border-l-2 border-[#C8102E] text-xs text-zinc-300 italic">
                    "{branding.toneOfVoice}"
                  </div>
                ) : (
                  <div className="relative">
                     <select 
                      className="w-full p-2.5 bg-zinc-900 rounded-md border border-zinc-800 text-sm text-white appearance-none focus:ring-1 focus:ring-white"
                      value={branding.toneOfVoice}
                      onChange={(e) => handleBrandingChange('toneOfVoice', e.target.value)}
                    >
                      <option value="Professional & Trustworthy">Professional & Trustworthy</option>
                      <option value="Exciting & Energetic">Exciting & Energetic</option>
                      <option value="Friendly & Approachable">Friendly & Approachable</option>
                      <option value="Minimalist & Direct">Minimalist & Direct</option>
                    </select>
                     <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Type */}
               <div>
                 <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 ml-1">Asset Output</label>
                 <div className="grid grid-cols-3 gap-2">
                  {['email', 'landing_page', 'social_post'].map((type) => (
                    <button
                      key={type}
                      onClick={() => handleBrandingChange('contentType', type as any)}
                      className={`px-2 py-2 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all border ${
                        branding.contentType === type 
                          ? 'bg-zinc-100 text-black border-white' 
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                 </div>
                 {branding.contentType === 'email' && (
                   <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500 bg-zinc-900/50 p-2 rounded">
                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     <span>Uses Ghost Tables (Outlook Safe)</span>
                   </div>
                 )}
              </div>
            </section>
          </div>
        )}

        {/* SETTINGS VIEW */}
        {view === 'settings' && (
          <div className="p-6 space-y-6 animate-fade-in">
             <div className="mb-4">
               <h2 className="text-sm font-bold text-white uppercase tracking-wider">Global Configuration</h2>
               <p className="text-xs text-zinc-500 mt-1">Directly edit the AI's instructional logic.</p>
             </div>

             {/* Settings Tabs */}
             <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                {['brand', 'web', 'email', 'logic'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSettingsTab(tab as any)}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                      activeSettingsTab === tab 
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
             </div>

             {/* Editors */}
             <div className="space-y-2">
                {activeSettingsTab === 'brand' && (
                  <>
                    <label className="text-xs font-bold text-[#C8102E] uppercase">Rapsodo Brand System</label>
                    <textarea 
                      className="w-full h-96 bg-zinc-950 border border-zinc-800 p-4 rounded-md text-xs font-mono text-zinc-400 focus:text-zinc-200 focus:border-zinc-700 focus:ring-0 leading-relaxed"
                      value={guidelines.rapsodoGuidelines}
                      onChange={(e) => handleGuidelinesChange('rapsodoGuidelines', e.target.value)}
                    />
                  </>
                )}
                {activeSettingsTab === 'web' && (
                  <>
                    <label className="text-xs font-bold text-blue-500 uppercase">Web Engineering Directives</label>
                    <textarea 
                      className="w-full h-96 bg-zinc-950 border border-zinc-800 p-4 rounded-md text-xs font-mono text-zinc-400 focus:text-zinc-200 focus:border-zinc-700 focus:ring-0 leading-relaxed"
                      value={guidelines.webEngineering}
                      onChange={(e) => handleGuidelinesChange('webEngineering', e.target.value)}
                    />
                  </>
                )}
                {activeSettingsTab === 'email' && (
                   <>
                    <label className="text-xs font-bold text-yellow-500 uppercase">Email Engineering Directives</label>
                    <textarea 
                      className="w-full h-96 bg-zinc-950 border border-zinc-800 p-4 rounded-md text-xs font-mono text-zinc-400 focus:text-zinc-200 focus:border-zinc-700 focus:ring-0 leading-relaxed"
                      value={guidelines.emailEngineering}
                      onChange={(e) => handleGuidelinesChange('emailEngineering', e.target.value)}
                    />
                  </>
                )}
                {activeSettingsTab === 'logic' && (
                   <>
                    <label className="text-xs font-bold text-green-500 uppercase">AI Agent Logic</label>
                    <textarea 
                      className="w-full h-96 bg-zinc-950 border border-zinc-800 p-4 rounded-md text-xs font-mono text-zinc-400 focus:text-zinc-200 focus:border-zinc-700 focus:ring-0 leading-relaxed"
                      value={guidelines.agentLogic}
                      onChange={(e) => handleGuidelinesChange('agentLogic', e.target.value)}
                    />
                  </>
                )}
             </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
        {view === 'generator' ? (
          <Button 
            variant={isRapsodo ? 'rapsodo' : 'primary'}
            onClick={onGenerate} 
            isLoading={isGenerating} 
            disabled={!rawContent.trim()}
            className="w-full text-sm"
          >
            {isGenerating ? 'PROCESSING...' : 'GENERATE ASSET'}
          </Button>
        ) : (
           <Button 
            variant="secondary"
            onClick={() => setView('generator')} 
            className="w-full text-sm"
          >
            DONE & RETURN
          </Button>
        )}
      </div>
    </div>
  );
};