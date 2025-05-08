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
  title: string;
  pages: BookPage[];
  currentPage: number;
  totalPages: number;
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