import React, { createContext, useContext, useState, ReactNode } from 'react';
import axios from 'axios';

type MemeTemplate = {
  id: string;
  name: string;
  url: string;
  boxCount: number;
};

type MemeState = {
  templates: MemeTemplate[];
  selectedTemplate: MemeTemplate | null;
  topText: string;
  bottomText: string;
  customTexts: { id: string; text: string; x: number; y: number; fontSize: number; color: string }[];
  generatedMeme: string | null;
  isLoading: boolean;
  aiSuggestions: string[];
};

type MemeContextType = {
  memeState: MemeState;
  setTemplates: (templates: MemeTemplate[]) => void;
  selectTemplate: (template: MemeTemplate) => void;
  setTopText: (text: string) => void;
  setBottomText: (text: string) => void;
  addCustomText: () => void;
  updateCustomText: (id: string, updates: Partial<{ text: string; x: number; y: number; fontSize: number; color: string }>) => void;
  removeCustomText: (id: string) => void;
  setGeneratedMeme: (url: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  generateAiSuggestions: (tone?: string) => Promise<void>;
  clearMeme: () => void;
};

const initialState: MemeState = {
  templates: [],
  selectedTemplate: null,
  topText: '',
  bottomText: '',
  customTexts: [],
  generatedMeme: null,
  isLoading: false,
  aiSuggestions: [],
};

const MemeContext = createContext<MemeContextType | undefined>(undefined);

// Basic fallback generator
const generateVariations = (text: string): string[] => {
  if (!text) {
    return [
      "Me when | The code finally works",
      "Nobody: | Me debugging at 3am",
      "My code | The bug I can't find",
      "Before coffee | After coffee",
      "Junior devs | Senior devs"
    ];
  }

  return [
    `Nobody: | ${text}`,
    `Me: | ${text}`,
    `My brain: | ${text}`,
    `When ${text}`,
    `${text} | But it gets worse`
  ];
};

export const MemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [memeState, setMemeState] = useState<MemeState>(initialState);

  const setTemplates = (templates: MemeTemplate[]) => {
    setMemeState((prev) => ({ ...prev, templates }));
  };

  const selectTemplate = (template: MemeTemplate) => {
    setMemeState((prev) => ({ ...prev, selectedTemplate: template }));
  };

  const setTopText = (text: string) => {
    setMemeState((prev) => ({ ...prev, topText: text }));
  };

  const setBottomText = (text: string) => {
    setMemeState((prev) => ({ ...prev, bottomText: text }));
  };

  const addCustomText = () => {
    const newText = {
      id: `text-${Date.now()}`,
      text: 'Custom text',
      x: 50,
      y: 50,
      fontSize: 24,
      color: '#ffffff',
    };
    setMemeState((prev) => ({
      ...prev,
      customTexts: [...prev.customTexts, newText],
    }));
  };

  const updateCustomText = (
    id: string,
    updates: Partial<{ text: string; x: number; y: number; fontSize: number; color: string }>
  ) => {
    setMemeState((prev) => ({
      ...prev,
      customTexts: prev.customTexts.map((text) =>
        text.id === id ? { ...text, ...updates } : text
      ),
    }));
  };

  const removeCustomText = (id: string) => {
    setMemeState((prev) => ({
      ...prev,
      customTexts: prev.customTexts.filter((text) => text.id !== id),
    }));
  };

  const setGeneratedMeme = (url: string | null) => {
    setMemeState((prev) => ({ ...prev, generatedMeme: url }));
  };

  const setIsLoading = (isLoading: boolean) => {
    setMemeState((prev) => ({ ...prev, isLoading }));
  };

  const generateAiSuggestions = async (tone = "Default") => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        "https://netlify-ai-caption-backend.netlify.app/.netlify/functions/ai-captions",
        { tone }
      );

      const suggestions = response.data.captions;
      setMemeState(prev => ({ ...prev, aiSuggestions: suggestions }));
    } catch (error) {
      console.error("AI generation failed:", error);
      const fallback = generateVariations("");
      setMemeState(prev => ({ ...prev, aiSuggestions: fallback }));
    }
    setIsLoading(false);
  };

  const clearMeme = () => {
    setMemeState((prev) => ({
      ...prev,
      topText: '',
      bottomText: '',
      customTexts: [],
      generatedMeme: null,
    }));
  };

  const contextValue: MemeContextType = {
    memeState,
    setTemplates,
    selectTemplate,
    setTopText,
    setBottomText,
    addCustomText,
    updateCustomText,
    removeCustomText,
    setGeneratedMeme,
    setIsLoading,
    generateAiSuggestions,
    clearMeme,
  };

  return <MemeContext.Provider value={contextValue}>{children}</MemeContext.Provider>;
};

export const useMeme = () => {
  const context = useContext(MemeContext);
  if (context === undefined) {
    throw new Error('useMeme must be used within a MemeProvider');
  }
  return context;
};
