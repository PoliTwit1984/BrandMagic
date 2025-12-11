import React, { useState } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { ImageExtractor } from './components/ImageExtractor';
import { BrandingConfig, GeneratedAsset, GuidelinesConfig, UploadedAsset } from './types';
import { generateMarketingAsset } from './services/gemini';
import { RAPSODO_BRAND_GUIDELINES } from './services/brands';
import { WEB_UI_DIRECTIVES, EMAIL_ENGINEERING_DIRECTIVES, AI_AGENT_LOGIC } from './services/guidelines';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'generator' | 'extractor'>('generator');
  
  const [rawContent, setRawContent] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<UploadedAsset[]>([]);
  
  const [branding, setBranding] = useState<BrandingConfig>({
    brandProfile: 'custom',
    primaryColor: '#4F46E5', // Indigo 600
    secondaryColor: '#EC4899', // Pink 500
    fontStyle: 'modern',
    toneOfVoice: 'Professional & Trustworthy',
    contentType: 'email',
    imageStyle: 'placeholder'
  });

  const [guidelines, setGuidelines] = useState<GuidelinesConfig>({
    rapsodoGuidelines: RAPSODO_BRAND_GUIDELINES,
    webEngineering: WEB_UI_DIRECTIVES,
    emailEngineering: EMAIL_ENGINEERING_DIRECTIVES,
    agentLogic: AI_AGENT_LOGIC
  });

  const [generationState, setGenerationState] = useState<{
    isLoading: boolean;
    statusMessage?: string;
    data: GeneratedAsset | null;
    error: string | null;
  }>({
    isLoading: false,
    statusMessage: '',
    data: null,
    error: null
  });

  const handleGenerate = async () => {
    if (!rawContent.trim()) return;

    setGenerationState(prev => ({ ...prev, isLoading: true, statusMessage: 'Analyzing content strategy...', error: null }));

    try {
      // Pass dynamic guidelines state to the service
      const result = await generateMarketingAsset(
        rawContent, 
        branding, 
        guidelines, 
        uploadedImages,
        (status) => setGenerationState(prev => ({ ...prev, statusMessage: status }))
      );
      
      setGenerationState({
        isLoading: false,
        data: result,
        error: null
      });
    } catch (err: any) {
      setGenerationState(prev => ({
        ...prev,
        isLoading: false,
        statusMessage: '',
        error: err.message || "An unexpected error occurred."
      }));
    }
  };

  // If in Extractor mode, render the ImageExtractor component full screen
  if (currentView === 'extractor') {
    return <ImageExtractor onBack={() => setCurrentView('generator')} />;
  }

  return (
    <div className="flex h-screen w-screen bg-zinc-50 overflow-hidden font-sans">
      <ConfigPanel 
        rawContent={rawContent}
        setRawContent={setRawContent}
        branding={branding}
        setBranding={setBranding}
        guidelines={guidelines}
        setGuidelines={setGuidelines}
        onGenerate={handleGenerate}
        isGenerating={generationState.isLoading}
        uploadedImages={uploadedImages}
        setUploadedImages={setUploadedImages}
        onNavigateToExtractor={() => setCurrentView('extractor')}
      />
      <main className="flex-1 relative flex flex-col min-w-0 min-h-0">
         {generationState.isLoading && generationState.statusMessage && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-900 text-white px-6 py-2 rounded-full shadow-xl border border-zinc-700 flex items-center gap-3 animate-pulse">
                <div className="w-2 h-2 bg-[#C8102E] rounded-full animate-bounce"></div>
                <span className="text-xs font-mono tracking-widest uppercase">{generationState.statusMessage}</span>
            </div>
         )}

         {generationState.error && (
            <div className="absolute top-4 right-4 z-50 bg-red-50 text-red-900 px-4 py-3 rounded-md shadow-lg border-l-4 border-red-600 max-w-md animate-bounce-in">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-bold">Generation Error</p>
                        <p className="text-sm mt-1">{generationState.error}</p>
                    </div>
                    <button 
                        onClick={() => setGenerationState(prev => ({...prev, error: null}))}
                        className="ml-auto pl-3"
                    >
                        <svg className="h-5 w-5 text-red-500 hover:text-red-700" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
         )}
         <PreviewPanel 
            data={generationState.data}
            isLoading={generationState.isLoading}
            uploadedImages={uploadedImages}
         />
      </main>
    </div>
  );
};

export default App;