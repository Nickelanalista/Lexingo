import React, { createContext, useContext, useState, ReactNode } from 'react';

interface OCRContextType {
  isProcessingOCR: boolean;
  ocrProgress: number;
  ocrTotal: number;
  ocrBookTitle: string;
  setOCRState: (processing: boolean, progress?: number, total?: number, title?: string) => void;
}

const OCRContext = createContext<OCRContextType | undefined>(undefined);

export const useOCR = () => {
  const context = useContext(OCRContext);
  if (context === undefined) {
    throw new Error('useOCR must be used within an OCRProvider');
  }
  return context;
};

interface OCRProviderProps {
  children: ReactNode;
}

export const OCRProvider: React.FC<OCRProviderProps> = ({ children }) => {
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrTotal, setOcrTotal] = useState(0);
  const [ocrBookTitle, setOcrBookTitle] = useState('');

  const setOCRState = (processing: boolean, progress = 0, total = 0, title = '') => {
    console.log(`🎯 [OCR CONTEXT] Setting state: processing=${processing}, progress=${progress}/${total}, title=${title}`);
    setIsProcessingOCR(processing);
    setOcrProgress(progress);
    setOcrTotal(total);
    setOcrBookTitle(title);
  };

  return (
    <OCRContext.Provider
      value={{
        isProcessingOCR,
        ocrProgress,
        ocrTotal,
        ocrBookTitle,
        setOCRState,
      }}
    >
      {children}
    </OCRContext.Provider>
  );
};