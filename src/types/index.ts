export interface Word {
  text: string;
  index: number;
}

export interface TranslationResult {
  original: string;
  translated: string;
  timestamp: number;
}

export interface BookPage {
  pageNumber: number;
  content: string;
}

export interface Book {
  id?: string;
  title: string;
  pages: BookPage[];
  currentPage: number;
  totalPages: number;
  coverUrl?: string;
  lastRead?: string;
  bookmarked?: boolean;
  bookmark_page?: number;
  bookmark_position?: number;
  bookmark_updated_at?: string;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface WordTooltipProps {
  word: string;
  isOpen: boolean;
  onClose: () => void;
  referenceElement: HTMLElement | null;
  showBothLanguages?: boolean;
}