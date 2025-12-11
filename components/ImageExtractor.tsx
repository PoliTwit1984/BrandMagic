import React, { useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from './ui/Button';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface ExtractedImage {
  id: string;
  data: string; // Base64
  name: string;
  width: number;
  height: number;
  page: number;
}

interface ImageExtractorProps {
  onBack: () => void;
}

export const ImageExtractor: React.FC<ImageExtractorProps> = ({ onBack }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [status, setStatus] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setFileName(file.name);
    setIsProcessing(true);
    setExtractedImages([]);
    setStatus('Initializing PDF engine...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const imagesFound: ExtractedImage[] = [];
      const imageHashes = new Set<string>(); // Simple dedup based on data length + dims

      for (let i = 1; i <= pdf.numPages; i++) {
        setStatus(`Scanning Page ${i} of ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });

        // Create a mock canvas context to intercept draw calls
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) continue;

        // Hook into drawImage
        const originalDrawImage = ctx.drawImage;
        
        // We override the drawImage method. 
        // PDF.js calls this when it wants to paint a resolved image to the canvas.
        // @ts-ignore
        ctx.drawImage = (image: CanvasImageSource, ...args: any[]) => {
            try {
                // 'image' is typically an ImageBitmap, HTMLCanvasElement, or HTMLImageElement
                // We must check if it's valid and has dimensions
                const width = 'width' in image ? (image.width as number) : 0;
                const height = 'height' in image ? (image.height as number) : 0;

                // Filter out very small images (likely icons, text artifacts, or lines)
                if (width > 64 && height > 64) {
                    // Draw the source image to a temporary canvas to get the Base64 data
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = width;
                    tempCanvas.height = height;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    if (tempCtx) {
                        tempCtx.drawImage(image, 0, 0);
                        const base64 = tempCanvas.toDataURL('image/png');
                        
                        // Simple deduplication key
                        const key = `${width}x${height}-${base64.length}`;
                        
                        if (!imageHashes.has(key)) {
                            imageHashes.add(key);
                            imagesFound.push({
                                id: Math.random().toString(36).substr(2, 9),
                                data: base64,
                                name: `p${i}_img_${imagesFound.length + 1}.png`,
                                width,
                                height,
                                page: i
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn("Error capturing image during render:", err);
            }

            // Call the original method to ensure the render task completes successfully
            // @ts-ignore
            originalDrawImage.apply(ctx, [image, ...args]);
        };

        // Render the page. This triggers the internal PDF.js loops that resolve objects and call our patched drawImage
        try {
            // @ts-ignore - fix for render type mismatch requiring canvas property
            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;
        } catch (renderErr) {
            console.warn(`Error rendering page ${i}:`, renderErr);
        }

        // Update state progressively so user sees images coming in
        setExtractedImages([...imagesFound]);
      }

      setStatus(`Complete! Found ${imagesFound.length} unique images.`);

    } catch (error) {
      console.error("PDF Error:", error);
      setStatus("Error processing PDF. Please check the file.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadImage = (img: ExtractedImage) => {
    const link = document.createElement('a');
    link.href = img.data;
    link.download = `${fileName.replace('.pdf', '')}_${img.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    // Naive download all - triggering multiple downloads
    // In a real app, zip them. Here we just loop.
    if (confirm(`Download all ${extractedImages.length} images? This might open multiple popups.`)) {
      extractedImages.forEach((img, idx) => {
        setTimeout(() => downloadImage(img), idx * 300);
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-300 font-sans overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors group"
          >
            <svg className="w-5 h-5 text-zinc-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-condensed tracking-wide text-white uppercase">
              PDF Asset <span className="text-[#C8102E]">Extractor</span>
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">Native Image Interception</p>
          </div>
        </div>
        
        {extractedImages.length > 0 && (
           <div className="flex items-center gap-4">
             <div className="text-xs font-mono text-zinc-400">
               {extractedImages.length} ASSETS FOUND
             </div>
             <button 
               onClick={downloadAll}
               className="text-xs font-bold text-[#C8102E] hover:text-white uppercase tracking-wider hover:underline"
             >
               Download All
             </button>
           </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        {extractedImages.length === 0 && !isProcessing ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
             <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-xl">
               <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
             </div>
             <div>
               <h3 className="text-2xl font-bold text-white mb-2">Extract Images from PDF</h3>
               <p className="text-zinc-500 max-w-md mx-auto">
                 Upload a PDF document. We will render every page and capture high-resolution photos, logos, and graphics as they appear.
               </p>
             </div>
             
             <div className="relative">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="application/pdf"
                  className="hidden" 
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mx-auto"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Select PDF File
                </Button>
             </div>
          </div>
        ) : (
          <div className="space-y-6">
            {isProcessing && (
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-[#C8102E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-mono text-zinc-300">{status}</span>
                </div>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Please Wait</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {extractedImages.map((img) => (
                <div key={img.id} className="group relative bg-black border border-zinc-800 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
                  {/* Checkerboard for transparency */}
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>
                  
                  <img src={img.data} alt={img.name} className="relative z-10 max-w-full max-h-full object-contain p-2" />
                  
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex flex-col items-center justify-center gap-2 p-2 text-center backdrop-blur-sm">
                    <p className="text-[10px] text-zinc-400 font-mono truncate w-full">{img.width}x{img.height}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mb-2">Pg {img.page}</p>
                    <button 
                      onClick={() => downloadImage(img)}
                      className="px-3 py-1 bg-[#C8102E] hover:bg-red-700 text-white text-xs font-bold uppercase rounded transform hover:scale-105 transition-all"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {!isProcessing && (
              <div className="flex justify-center pt-8 pb-12 border-t border-zinc-900 mt-8">
                 <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
                    Process Another PDF
                 </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};