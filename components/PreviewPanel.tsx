import React, { useState, useEffect } from 'react';
import { GeneratedAsset, UploadedAsset } from '../types';

interface PreviewPanelProps {
  data: GeneratedAsset | null;
  isLoading: boolean;
  uploadedImages?: UploadedAsset[];
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ data, isLoading, uploadedImages = [] }) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'raw'>('preview');

  // Technical dot grid pattern for that "Drafting" look
  const bgPattern = {
    backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
    backgroundSize: '24px 24px'
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 p-8 min-h-0" style={bgPattern}>
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="relative mx-auto w-24 h-24">
             <div className="absolute inset-0 border-4 border-zinc-200 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-[#C8102E] rounded-full border-t-transparent animate-spin"></div>
          </div>
          <div>
            <h3 className="text-xl font-condensed tracking-wide text-zinc-900">ENGINEERING ASSET</h3>
            <p className="text-sm text-zinc-500 mt-2 font-mono">Synthesizing design guidelines...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 p-8 min-h-0" style={bgPattern}>
        <div className="max-w-lg text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg border border-zinc-100 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
          </div>
          <h2 className="text-4xl font-condensed tracking-wide text-zinc-900">READY TO BUILD</h2>
          <p className="text-zinc-500 text-lg leading-relaxed">
            Enter your raw copy on the left to generate high-fidelity, on-brand marketing assets instantly.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4 opacity-50">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#C8102E] rounded-full"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">Brand Safe</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-zinc-400 rounded-full"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">Responsive</span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Inject Tailwind + DnD Script
  // This script enables dropping extracted images onto the generated layout
  const processedHtml = data.htmlLayout.includes('<html') 
    ? data.htmlLayout.replace('</body>', `
      <script>
        document.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.stopPropagation();
        });
        document.addEventListener('drop', function(e) {
          e.preventDefault();
          e.stopPropagation();
          // Get the image source dragged from the parent window
          const draggedSrc = e.dataTransfer.getData('text/plain');
          
          if (draggedSrc && (e.target.tagName === 'IMG' || e.target.classList.contains('droppable-image'))) {
             e.target.src = draggedSrc;
             e.target.style.border = '2px solid #C8102E'; // Visual feedback
             setTimeout(() => { e.target.style.border = ''; }, 500);
          }
        });
      </script>
      </body>
    `) 
    : `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-transparent">${data.htmlLayout}
      <script>
        document.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.stopPropagation();
        });
        document.addEventListener('drop', function(e) {
          e.preventDefault();
          e.stopPropagation();
          const draggedSrc = e.dataTransfer.getData('text/plain');
          if (draggedSrc && e.target.tagName === 'IMG') {
             e.target.src = draggedSrc;
             e.target.style.border = '2px solid #C8102E';
             setTimeout(() => { e.target.style.border = ''; }, 500);
          }
        });
      </script>
    </body></html>`;

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-hidden relative min-h-0" style={bgPattern}>
      
      {/* Floating Toolbar */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-white/90 backdrop-blur-sm border border-zinc-200 px-2 py-1.5 rounded-xl shadow-xl flex items-center gap-1">
          <button
            onClick={() => setViewMode('preview')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${
              viewMode === 'preview' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            Visual
          </button>
          <div className="w-px h-4 bg-zinc-300 mx-1"></div>
          <button
            onClick={() => setViewMode('code')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${
              viewMode === 'code' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            HTML
          </button>
           <button
            onClick={() => setViewMode('raw')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${
              viewMode === 'raw' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            Copy
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        
        {/* VISUAL MODE: Iframe for perfect isolation and internal scrolling */}
        {viewMode === 'preview' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 w-full p-4 md:p-8 md:pt-24 overflow-hidden relative">
               <div className="w-full max-w-[1400px] h-full mx-auto bg-white shadow-2xl rounded-lg overflow-hidden border border-zinc-200 flex flex-col animate-fade-in">
                   {/* Browser Chrome */}
                   <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-2 flex items-center gap-2 shrink-0">
                      <div className="flex gap-1.5">
                         <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                         <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                         <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                      </div>
                      <div className="flex-1 mx-4 bg-white rounded-md border border-zinc-200 h-6 flex items-center px-3 text-[10px] text-zinc-400 font-mono truncate">
                         preview://brand-align/asset-v1.html
                      </div>
                   </div>
                   <iframe 
                     srcDoc={processedHtml}
                     className="w-full flex-1 border-0 bg-white"
                     title="Preview"
                     sandbox="allow-scripts allow-same-origin"
                   />
               </div>
            </div>

            {/* ASSET TRAY (Drag Source) */}
            {uploadedImages.length > 0 && (
              <div className="bg-zinc-900 border-t border-zinc-800 p-3 shrink-0 z-30 flex flex-col animate-slide-up h-32">
                <div className="flex items-center justify-between mb-2 px-1">
                   <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Extracted Assets ({uploadedImages.length})</h4>
                   <span className="text-[10px] text-zinc-600">Drag to replace images above</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar items-center">
                   {uploadedImages.map((img) => (
                      <div 
                        key={img.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', img.data);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        className="group relative w-20 h-20 rounded bg-black border border-zinc-800 hover:border-[#C8102E] shrink-0 cursor-grab active:cursor-grabbing overflow-hidden transition-all"
                        title={img.name}
                      >
                         <img src={img.data} className="w-full h-full object-contain opacity-80 group-hover:opacity-100" />
                         <div className="absolute inset-0 bg-black/50 group-hover:bg-transparent transition-colors"></div>
                      </div>
                   ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CODE & RAW MODES: Scrollable Container */}
        {viewMode !== 'preview' && (
          <div className="flex-1 overflow-y-auto preview-scroll p-8 pt-24 pb-20 min-h-0">
             
             {viewMode === 'code' && (
                <div className="w-full max-w-4xl mx-auto bg-[#1e1e1e] shadow-2xl rounded-lg overflow-hidden text-zinc-300 font-mono text-sm border border-zinc-800 flex flex-col h-fit">
                  <div className="bg-[#2d2d2d] px-4 py-2 text-xs text-zinc-400 flex justify-between items-center border-b border-black shrink-0">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      </span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(data.htmlLayout)}
                        className="hover:text-white uppercase font-bold tracking-wider text-[10px]"
                      >
                          Copy to Clipboard
                      </button>
                  </div>
                  <pre className="p-6 overflow-auto custom-scrollbar">
                    <code>{data.htmlLayout}</code>
                  </pre>
                </div>
             )}

             {viewMode === 'raw' && (
                <div className="w-full max-w-3xl mx-auto bg-white shadow-xl rounded-sm overflow-hidden p-10 text-zinc-800 leading-relaxed border border-zinc-200 h-fit">
                   <h3 className="font-condensed text-3xl mb-6 text-zinc-900 border-b-4 border-[#C8102E] pb-2 inline-block">REWRITTEN CONTENT</h3>
                   <div className="prose prose-zinc max-w-none">
                      <p className="whitespace-pre-wrap font-serif text-lg">{data.rewrittenCopy}</p>
                   </div>
                   
                   <div className="mt-12 pt-6 border-t border-zinc-100">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-zinc-400 mb-2">Design Rationale</h4>
                      <p className="text-sm text-zinc-600 italic bg-zinc-50 p-4 rounded-lg border border-zinc-100">{data.explanation}</p>
                   </div>
                </div>
             )}
          </div>
        )}
      </div>
      
      {/* Explanation Banner (Only show in non-visual modes or if no assets) */}
      {(viewMode !== 'preview' || uploadedImages.length === 0) && (
        <div className="absolute bottom-0 w-full bg-white border-t border-zinc-200 p-3 z-20 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-zinc-600">
              <svg className="w-4 h-4 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="font-mono">{data.explanation.substring(0, 120)}...</span>
            </div>
            <div className="text-zinc-400 font-mono">
              GENERATED_ASSET_V1.HTML
            </div>
        </div>
      )}
    </div>
  );
};