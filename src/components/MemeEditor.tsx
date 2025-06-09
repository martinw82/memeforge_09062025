import React, { useState, useRef, useEffect } from 'react';
import { useMeme } from '../context/MemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { supabaseHelpers } from '../utils/supabase';
import { trackingAPI, impressionThrottle, createEventKey } from '../utils/api';
import { trackEvent, measurePerformance } from '../utils/analytics';
import { SponsoredWatermarkWithSponsor, WatermarkPosition, WatermarkSize } from '../types/supabase';
import axios from 'axios';
import { 
  Settings, 
  Download, 
  Sparkles, 
  RefreshCw, 
  ArrowUp, 
  Zap, 
  Crown,
  ExternalLink,
  Layers,
  RotateCcw,
  Star,
  Lock
} from 'lucide-react';
import PremiumFeatures from './PremiumFeatures';

interface DraggableText {
  id: string;
  text: string;
  x: number;
  y: number;
  type: 'top' | 'bottom' | 'custom';
  font: string;
  fontSize: number;
  color: string;
  strokeWidth: number;
  strokeColor: string;
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
}

interface AppliedWatermark {
  id: string;
  imageUrl: string;
  position: WatermarkPosition;
  size: WatermarkSize;
  opacity: number;
  linkUrl?: string;
  sponsor: {
    id: string;
    name: string;
  };
}

const MAX_IMAGE_WIDTH = 800;
const MAX_IMAGE_HEIGHT = 800;

const AVAILABLE_FONTS = [
  { name: 'Impact', value: 'Impact' },
  { name: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { name: 'Arial Black', value: '"Arial Black", sans-serif' },
  { name: 'Verdana Bold', value: 'Verdana, sans-serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' }
];

const WATERMARK_POSITIONS: { label: string; value: WatermarkPosition }[] = [
  { label: 'Top Left', value: 'top-left' },
  { label: 'Top Right', value: 'top-right' },
  { label: 'Bottom Left', value: 'bottom-left' },
  { label: 'Bottom Right', value: 'bottom-right' },
];

const WATERMARK_SIZES: { label: string; value: WatermarkSize; pixels: number }[] = [
  { label: 'Small', value: 'small', pixels: 40 },
  { label: 'Medium', value: 'medium', pixels: 60 },
  { label: 'Large', value: 'large', pixels: 80 },
];

const uploadToImgBB = async (imageBase64: string): Promise<string | null> => {
  try {
    const base64Only = imageBase64.split(',')[1];
    const response = await axios.post(
      "https://mfimgshr.netlify.app/.netlify/functions/upload-meme",
      { imageBase64: base64Only },
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log("Upload successful. Image URL:", response.data?.url);
    return response.data.url;
  } catch (error: any) {
    console.error("Image upload failed:", error.response?.data || error.message);
    return null;
  }
};

const MemeEditor: React.FC = () => {
  const [tone, setTone] = useState("Default");
  const { isPremium, features } = useSubscription();
  const {
    memeState,
    setTopText,
    setBottomText,
    generateAiSuggestions,
    setGeneratedMeme
  } = useMeme();
  const {
    selectedTemplate,
    topText,
    bottomText,
    aiSuggestions,
    isLoading
  } = memeState;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState('#ffffff');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [selectedFont, setSelectedFont] = useState(AVAILABLE_FONTS[0].value);
  const [draggableTexts, setDraggableTexts] = useState<DraggableText[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sponsored watermark state
  const [sponsoredWatermarks, setSponsoredWatermarks] = useState<SponsoredWatermarkWithSponsor[]>([]);
  const [appliedWatermark, setAppliedWatermark] = useState<AppliedWatermark | null>(null);
  const [showWatermarkPanel, setShowWatermarkPanel] = useState(false);
  const [watermarkLoadError, setWatermarkLoadError] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    fetchSponsoredWatermarks();
  }, []);

  useEffect(() => {
    const newTexts: DraggableText[] = [];
    if (topText) {
      newTexts.push({
        id: 'top', text: topText, x: 50, y: 10, type: 'top',
        font: selectedFont, fontSize, color: textColor,
        strokeWidth, strokeColor
      });
    }
    if (bottomText) {
      newTexts.push({
        id: 'bottom', text: bottomText, x: 50, y: 90, type: 'bottom',
        font: selectedFont, fontSize, color: textColor,
        strokeWidth, strokeColor
      });
    }
    setDraggableTexts(newTexts);
  }, [topText, bottomText, selectedFont, fontSize, textColor, strokeWidth, strokeColor, selectedTemplate]);

  useEffect(() => {
    measurePerformance('meme_generation', async () => {
      generateMeme(draggableTexts);
    });
  }, [draggableTexts, appliedWatermark]);

  const fetchSponsoredWatermarks = async () => {
    try {
      const { data, error } = await supabaseHelpers.getSponsoredWatermarks();
      
      if (error) {
        console.error('Error fetching sponsored watermarks:', error);
        setWatermarkLoadError('Failed to load watermarks');
        return;
      }

      if (data) {
        setSponsoredWatermarks(data);
        setWatermarkLoadError(null);
      }
    } catch (error) {
      console.error('Error fetching sponsored watermarks:', error);
      setWatermarkLoadError('Failed to load watermarks');
    }
  };

  const generateMeme = (texts = draggableTexts) => {
    if (!selectedTemplate || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const { width, height } = calculateImageDimensions(img.width, img.height);
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      
      // Draw base image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Draw text
      texts.forEach(text => {
        const x = (text.x / 100) * width;
        const y = (text.y / 100) * height;
        ctx.font = `bold ${text.fontSize}px ${text.font}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = text.color;
        ctx.strokeStyle = text.strokeColor;
        ctx.lineWidth = text.strokeWidth;
        ctx.strokeText(text.text.toUpperCase(), x, y);
        ctx.fillText(text.text.toUpperCase(), x, y);
      });

      // Draw sponsored watermark if applied and user doesn't have ad-free
      if (appliedWatermark && !features.ad_free) {
        drawWatermark(ctx, width, height);
      }

      // Draw MemeForge watermark
      const padding = 10;
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 1;
      ctx.strokeText('Made with MemeFactory', width - padding, height - padding);
      ctx.fillText('Made with MemeFactory', width - padding, height - padding);
      
      const memeDataUrl = canvas.toDataURL('image/png', isPremium && features.high_res_download ? 1.0 : 0.8);
      setGeneratedMeme(memeDataUrl);

      // Track meme generation
      await trackEvent('meme_generated', {
        template_id: selectedTemplate.id,
        has_top_text: !!topText,
        has_bottom_text: !!bottomText,
        font_used: selectedFont,
        has_watermark: !!appliedWatermark && !features.ad_free,
        watermark_sponsor_id: appliedWatermark?.sponsor.id,
        is_premium: isPremium,
        high_res: isPremium && features.high_res_download,
      });
    };
    img.src = selectedTemplate.url;
  };

  const drawWatermark = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    if (!appliedWatermark) return;

    const watermarkImg = new Image();
    watermarkImg.crossOrigin = 'anonymous';
    watermarkImg.onload = () => {
      const size = WATERMARK_SIZES.find(s => s.value === appliedWatermark.size)?.pixels || 60;
      
      let x, y;
      const padding = 10;

      switch (appliedWatermark.position) {
        case 'top-left':
          x = padding;
          y = padding;
          break;
        case 'top-right':
          x = canvasWidth - size - padding;
          y = padding;
          break;
        case 'bottom-left':
          x = padding;
          y = canvasHeight - size - padding;
          break;
        case 'bottom-right':
        default:
          x = canvasWidth - size - padding;
          y = canvasHeight - size - padding;
          break;
      }

      ctx.save();
      ctx.globalAlpha = appliedWatermark.opacity;
      ctx.drawImage(watermarkImg, x, y, size, size);
      ctx.restore();

      // Regenerate the meme with watermark applied
      setGeneratedMeme(canvasRef.current!.toDataURL('image/png', isPremium && features.high_res_download ? 1.0 : 0.8));
    };
    watermarkImg.src = appliedWatermark.imageUrl;
  };

  const calculateImageDimensions = (width: number, height: number) => {
    let newWidth = width;
    let newHeight = height;
    if (width > MAX_IMAGE_WIDTH) {
      newWidth = MAX_IMAGE_WIDTH;
      newHeight = (height * MAX_IMAGE_WIDTH) / width;
    }
    if (newHeight > MAX_IMAGE_HEIGHT) {
      newHeight = MAX_IMAGE_HEIGHT;
      newWidth = (width * MAX_IMAGE_HEIGHT) / height;
    }
    return { width: newWidth, height: newHeight };
  };

  const handleApplyWatermark = async (watermark: SponsoredWatermarkWithSponsor) => {
    // Check if user has ad-free feature
    if (features.ad_free) {
      alert('You have Premium ad-free experience! Sponsored watermarks are automatically disabled.');
      return;
    }

    const appliedMark: AppliedWatermark = {
      id: watermark.id,
      imageUrl: watermark.image_url,
      position: watermark.position as WatermarkPosition,
      size: watermark.size as WatermarkSize,
      opacity: watermark.opacity,
      linkUrl: watermark.link_url || undefined,
      sponsor: {
        id: watermark.sponsor.id,
        name: watermark.sponsor.name,
      },
    };

    setAppliedWatermark(appliedMark);

    // Track watermark application
    const eventKey = createEventKey(watermark.sponsor.id, 'watermark', watermark.id);
    
    if (impressionThrottle.shouldTrack(eventKey)) {
      await trackingAPI.trackWatermarkApplication(watermark.id, watermark.sponsor.id);
    }
  };

  const handleWatermarkClick = async () => {
    if (appliedWatermark?.linkUrl) {
      // Track watermark click
      await trackingAPI.trackSponsorClick(
        appliedWatermark.sponsor.id,
        appliedWatermark.linkUrl,
        'watermark'
      );
      
      window.open(appliedWatermark.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const removeWatermark = () => {
    setAppliedWatermark(null);
  };

  const handleHighResDownload = async () => {
    if (!isPremium || !features.high_res_download) {
      setShowPremiumModal(true);
      await trackEvent('premium_feature_blocked', {
        feature: 'high_res_download',
      });
      return;
    }

    if (!canvasRef.current) return;
    
    try {
      // Generate high-resolution version
      const highResCanvas = document.createElement('canvas');
      const highResCtx = highResCanvas.getContext('2d');
      
      if (!highResCtx || !selectedTemplate) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Use full resolution for premium users
        highResCanvas.width = img.width;
        highResCanvas.height = img.height;
        
        // Draw everything at full resolution
        highResCtx.drawImage(img, 0, 0);
        
        // Draw text at higher resolution
        draggableTexts.forEach(text => {
          const x = (text.x / 100) * img.width;
          const y = (text.y / 100) * img.height;
          const scaledFontSize = (text.fontSize / MAX_IMAGE_WIDTH) * img.width;
          
          highResCtx.font = `bold ${scaledFontSize}px ${text.font}`;
          highResCtx.textAlign = 'center';
          highResCtx.fillStyle = text.color;
          highResCtx.strokeStyle = text.strokeColor;
          highResCtx.lineWidth = text.strokeWidth * (img.width / MAX_IMAGE_WIDTH);
          highResCtx.strokeText(text.text.toUpperCase(), x, y);
          highResCtx.fillText(text.text.toUpperCase(), x, y);
        });

        // Download high-res version
        const link = document.createElement('a');
        link.download = 'meme_4k.png';
        link.href = highResCanvas.toDataURL('image/png', 1.0);
        link.click();
        
        trackEvent('meme_downloaded', { 
          format: 'png', 
          quality: 'high_res',
          is_premium: true,
        });
      };
      
      img.src = selectedTemplate.url;
    } catch (error) {
      console.error('High-res download error:', error);
    }
  };

  // Mouse event handlers for text dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clicked = draggableTexts.find(text => {
      const dx = text.x - x;
      const dy = text.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 5;
    });
    if (clicked) {
      setDragState({
        id: clicked.id,
        startX: e.clientX,
        startY: e.clientY,
        initialX: clicked.x,
        initialY: clicked.y
      });
      setIsDragging(true);
    }
  };

  // Touch event handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current || e.touches.length === 0) return;
    
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    const clicked = draggableTexts.find(text => {
      const dx = text.x - x;
      const dy = text.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 8;
    });
    
    if (clicked) {
      setDragState({
        id: clicked.id,
        startX: touch.clientX,
        startY: touch.clientY,
        initialX: clicked.x,
        initialY: clicked.y
      });
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDragging || !dragState || !canvasRef.current || e.touches.length === 0) return;
    
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((touch.clientX - dragState.startX) / rect.width) * 100;
    const deltaY = ((touch.clientY - dragState.startY) / rect.height) * 100;
    
    setDraggableTexts(prev =>
      prev.map(text =>
        text.id === dragState.id
          ? {
              ...text,
              x: Math.min(100, Math.max(0, dragState.initialX + deltaX)),
              y: Math.min(100, Math.max(0, dragState.initialY + deltaY))
            }
          : text
      )
    );
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (isDragging) {
      setIsDragging(false);
      setDragState(null);
    }
  };

  // Mouse event handlers for desktop
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragState || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
      const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;
      setDraggableTexts(prev =>
        prev.map(text =>
          text.id === dragState.id
            ? {
                ...text,
                x: Math.min(100, Math.max(0, dragState.initialX + deltaX)),
                y: Math.min(100, Math.max(0, dragState.initialY + deltaY))
              }
            : text
        )
      );
    };
    
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragState(null);
      }
    };
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragState]);

  const shareMeme = async () => {
    if (!canvasRef.current) return;
    
    try {
      const quality = isPremium && features.high_res_download ? 1.0 : 0.8;
      const base64 = canvasRef.current.toDataURL('image/png', quality);
      const imageUrl = await measurePerformance('meme_upload', async () => {
        return await uploadToImgBB(base64);
      });
      
      if (!imageUrl) {
        await trackEvent('meme_shared', { share_method: 'upload_failed' });
        alert('❌ Upload failed. Please try again.');
        return;
      }
      
      await navigator.clipboard.writeText(imageUrl);
      await trackEvent('meme_shared', { 
        share_method: 'clipboard',
        is_premium: isPremium,
        quality: quality === 1.0 ? 'high' : 'standard',
      });
      alert('✅ URL copied to clipboard:\n' + imageUrl);
    } catch (error) {
      await trackEvent('meme_shared', { share_method: 'error' });
      console.error('Share error:', error);
    }
  };

  const downloadMeme = async () => {
    if (!canvasRef.current) return;
    
    try {
      const quality = isPremium && features.high_res_download ? 1.0 : 0.8;
      const link = document.createElement('a');
      link.download = 'meme.png';
      link.href = canvasRef.current.toDataURL('image/png', quality);
      link.click();
      
      await trackEvent('meme_downloaded', { 
        format: 'png',
        is_premium: isPremium,
        quality: quality === 1.0 ? 'high' : 'standard',
      });
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleAiSuggestion = async (suggestion: string) => {
    if (suggestion.includes('|')) {
      const [top, bottom] = suggestion.split('|').map(s => s.trim());
      setTopText(top);
      setBottomText(bottom);
    } else {
      setTopText(suggestion);
    }

    await trackEvent('ai_caption_generated', {
      tone,
      suggestion_selected: true,
    });
  };

  const handleGenerateAiSuggestions = async () => {
    await trackEvent('ai_caption_generated', {
      tone,
      suggestions_count: 0, // Will be updated after generation
      suggestion_selected: false,
    });
    
    await generateAiSuggestions(tone);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 md:p-6 text-white">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col items-center">
          <div ref={containerRef} className="relative mb-4 w-full max-w-md">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="max-w-full h-auto border border-gray-700 rounded-lg shadow-lg mx-auto cursor-move touch-none"
              style={{ touchAction: 'none' }}
            />
            
            {/* Watermark click overlay */}
            {appliedWatermark?.linkUrl && !features.ad_free && (
              <button
                onClick={handleWatermarkClick}
                className="absolute bottom-2 right-2 w-12 h-12 bg-transparent hover:bg-white hover:bg-opacity-10 transition-colors rounded-lg"
                title={`Visit ${appliedWatermark.sponsor.name}`}
              />
            )}

            {/* Premium Quality Badge */}
            {isPremium && features.high_res_download && (
              <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <Crown size={12} />
                4K Quality
              </div>
            )}
          </div>

          <div className="w-full max-w-md space-y-4">
            {/* Premium status banner */}
            {isPremium && (
              <div className="bg-gradient-to-r from-purple-900 to-blue-900 bg-opacity-30 border border-purple-500 rounded-md p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-purple-400 text-sm">
                  <Crown size={16} />
                  <span>Premium features active: High-res downloads & ad-free experience!</span>
                </div>
              </div>
            )}

            {/* AI Suggestions - Mobile first layout */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Tone:</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full sm:w-auto border rounded px-2 py-1 text-sm bg-gray-700 text-white"
              >
                <option value="Default">Default</option>
                <option value="Sarcastic">Sarcastic</option>
                <option value="Wholesome">Wholesome</option>
                <option value="Dank">Dank</option>
                <option value="Dark">Dark</option>
              </select>
              <button
                onClick={handleGenerateAiSuggestions}
                disabled={isLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm"
              >
                {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isLoading ? "Generating..." : "Get Captions"}
              </button>
            </div>

            {aiSuggestions.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {aiSuggestions.map((suggestion, i) => (
                  <div
                    key={i}
                    onClick={() => handleAiSuggestion(suggestion)}
                    className="cursor-pointer p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}

            {/* Text inputs - responsive */}
            <input
              type="text"
              value={topText}
              onChange={(e) => setTopText(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-4 py-2 text-base"
              placeholder="Top Text"
            />
            <input
              type="text"
              value={bottomText}
              onChange={(e) => setBottomText(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-4 py-2 text-base"
              placeholder="Bottom Text"
            />

            {/* Sponsored Watermarks Section - Only show if not premium with ad-free */}
            {!features.ad_free && (
              <div className="border-t border-gray-600 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-yellow-400" />
                    <span className="text-sm font-medium">Sponsored Watermarks</span>
                    <Crown size={14} className="text-yellow-400" />
                  </div>
                  <button
                    onClick={() => setShowWatermarkPanel(!showWatermarkPanel)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {showWatermarkPanel ? 'Hide' : 'Show'} ({sponsoredWatermarks.length})
                  </button>
                </div>

                {appliedWatermark && (
                  <div className="mb-3 p-2 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded text-xs">
                    <div className="flex items-center justify-between">
                      <span>Watermark by {appliedWatermark.sponsor.name}</span>
                      <button
                        onClick={removeWatermark}
                        className="text-red-400 hover:text-red-300"
                        title="Remove watermark"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                    {appliedWatermark.linkUrl && (
                      <button
                        onClick={handleWatermarkClick}
                        className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 mt-1"
                      >
                        <ExternalLink size={10} />
                        Visit sponsor
                      </button>
                    )}
                  </div>
                )}

                {showWatermarkPanel && (
                  <div className="space-y-2">
                    {watermarkLoadError ? (
                      <div className="text-red-400 text-xs p-2 bg-red-900 bg-opacity-30 rounded">
                        {watermarkLoadError}
                      </div>
                    ) : sponsoredWatermarks.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                        {sponsoredWatermarks.map((watermark) => (
                          <button
                            key={watermark.id}
                            onClick={() => handleApplyWatermark(watermark)}
                            className={`relative p-2 rounded border transition-colors text-xs ${
                              appliedWatermark?.id === watermark.id
                                ? 'border-yellow-400 bg-yellow-900 bg-opacity-30'
                                : 'border-gray-600 hover:border-gray-500 bg-gray-700 hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={watermark.image_url}
                                alt={watermark.name}
                                className="w-8 h-8 object-cover rounded"
                              />
                              <div className="text-left truncate">
                                <div className="font-medium truncate">{watermark.sponsor.name}</div>
                                <div className="text-gray-400 truncate">{watermark.name}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs text-center py-2">
                        No sponsored watermarks available
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 text-center mt-2">
                      <p>💡 Sponsored watermarks help support creators</p>
                      <button
                        onClick={() => setShowPremiumModal(true)}
                        className="text-purple-400 hover:text-purple-300 mt-1 inline-flex items-center gap-1"
                      >
                        <Crown size={10} />
                        Go ad-free with Premium
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Text settings - responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-600 pt-4">
              <div>
                <label className="block text-sm mb-1">Font</label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-2 py-1 text-sm"
                >
                  {AVAILABLE_FONTS.map(f => (
                    <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Font Size: {fontSize}</label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Text Color</label>
                <input 
                  type="color" 
                  value={textColor} 
                  onChange={e => setTextColor(e.target.value)} 
                  className="w-full h-10 rounded border border-gray-600" 
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Stroke Color</label>
                <input 
                  type="color" 
                  value={strokeColor} 
                  onChange={e => setStrokeColor(e.target.value)} 
                  className="w-full h-10 rounded border border-gray-600" 
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">Stroke Width: {strokeWidth}</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Action buttons - responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              <button 
                onClick={downloadMeme} 
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-md transition-colors"
              >
                <Download size={18} />
                <span>Download{isPremium && features.high_res_download ? ' (HD)' : ''}</span>
              </button>

              {/* High-res download button for premium users */}
              {isPremium && features.high_res_download ? (
                <button 
                  onClick={handleHighResDownload} 
                  className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded-md transition-colors"
                >
                  <Crown size={18} />
                  <span>4K Download</span>
                </button>
              ) : (
                <button 
                  onClick={() => setShowPremiumModal(true)} 
                  className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white py-3 px-4 rounded-md transition-colors"
                >
                  <Lock size={18} />
                  <span>4K Download</span>
                </button>
              )}
            </div>

            <button 
              onClick={shareMeme} 
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md transition-colors"
            >
              <Zap size={18} />
              <span>Share{isPremium ? ' (Premium Quality)' : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Premium Features Modal */}
      {showPremiumModal && (
        <PremiumFeatures
          isModal={true}
          onClose={() => setShowPremiumModal(false)}
        />
      )}
    </div>
  );
};

export default MemeEditor;