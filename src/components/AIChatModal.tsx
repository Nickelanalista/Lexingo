import React, { useState, useEffect, useRef } from 'react';
import { OpenAIService } from '../services/openai';
import { X, Send, Loader2, Sparkles, UserCircle2 } from 'lucide-react';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Helper function to parse markdown-like syntax into React nodes
const parseMarkdown = (text: string): React.ReactNode[] => {
  const outputNodes: React.ReactNode[] = [];
  if (typeof text !== 'string') {
    // If text is already a ReactNode or something else, return it as is in an array
    outputNodes.push(text);
    return outputNodes;
  }

  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (index > 0 && outputNodes.length > 0) { 
      // Add <br /> for newlines between processed lines, only if there's previous content.
      // This helps maintain multiline structure when mixed with block elements like <h2>
      const lastNode = outputNodes[outputNodes.length -1];
      // Avoid double <br/> or <br/> after h2 if h2 is the last thing.
      if(typeof lastNode !== 'string' || (typeof lastNode === 'string' && lastNode.trim() !== '')) {
         // Check if lastNode is an h2, h2 already has margin.
         // For simplicity, let's add <br/> and rely on CSS for spacing primarily.
         // It's better if h2 has its own line.
      }
      outputNodes.push(<br key={`br-${index}`} />);
    }

    if (line.startsWith('## ')) {
      outputNodes.push(<h2 key={`h2-${index}`} className="text-xl font-semibold mt-1 mb-0.5">{line.substring(3)}</h2>);
    } else {
      const segments = line.split(/(\*\*.*?\*\*)/g); // Split by **text** but keep delimiters for processing
      segments.forEach((segment, segIndex) => {
        if (segment.startsWith('**') && segment.endsWith('**')) {
          outputNodes.push(<strong key={`strong-${index}-${segIndex}`}>{segment.substring(2, segment.length - 2)}</strong>);
        } else if (segment) { // Only add if the segment is not an empty string
          outputNodes.push(segment);
        }
      });
    }
  });
  return outputNodes;
};

const AIChatModal: React.FC<AIChatModalProps> = ({ isOpen, onClose, initialText }) => {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const initialGreetingSentRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (!isLoading && inputRef.current) {
        inputRef.current.focus();
      }
      if (initialText && !initialGreetingSentRef.current) {
        initialGreetingSentRef.current = true;
        setIsLoading(true);

        const systemMessage: Message = {
          role: 'system',
          content: "Eres Lexi, un asistente de IA amigable y experto en idiomas integrado en la aplicación de lectura Lexingo. Tu objetivo es ayudar a los usuarios a comprender mejor los textos en inglés que están leyendo. El usuario te proporcionará un fragmento de texto. Debes iniciar la conversación saludando amablemente. Luego, PRESENTA CLARAMENTE el texto que el usuario compartió envolviéndolo EXACTAMENTE así: [USER_TEXT_START]el texto del usuario aquí[USER_TEXT_END]. No añadas ningún otro carácter o formato alrededor de estas etiquetas especiales. Después de presentar el texto, pregunta de forma abierta y útil cómo puedes ayudar con ese fragmento específico. Ofrece algunas sugerencias concretas, como analizar la gramática, explicar frases complejas, dar sinónimos de palabras clave, o profundizar en el significado de alguna parte. Mantén un tono conversacional, servicial y alentador. Genera toda esta respuesta inicial en una sola burbuja de chat."
        };
        const initialUserMessageForAI: Message = {
          role: 'user',
          content: `El usuario ha seleccionado el siguiente texto para discutir: [USER_TEXT_START]${initialText}[USER_TEXT_END]. Por favor, inicia la conversación según tus instrucciones.`
        };
        
        setConversation([systemMessage]); 

        OpenAIService.getAIChatResponse([systemMessage, initialUserMessageForAI])
          .then(responseContent => {
            setConversation(prevConv => [...prevConv, { role: 'assistant', content: responseContent }]);
          })
          .catch(error => {
            console.error("Error fetching initial AI response:", error);
            setConversation(prevConv => [...prevConv, { role: 'assistant', content: '¡Hola! Parece que hay un problema para conectar con mi inteligencia. Por favor, intenta más tarde.' }]);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    } else if (!isOpen) {
      setConversation([]);
      setUserInput('');
      setIsLoading(false);
      initialGreetingSentRef.current = false;
    }
  }, [isOpen, initialText]);

  useEffect(() => {
    if (chatContentRef.current) {
      chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    }
    if (isOpen && !isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [conversation, isOpen, isLoading]);

  const handleSendMessage = async () => {
    if (userInput.trim() === '' || isLoading) return;

    const newUserMessage: Message = { role: 'user', content: userInput };
    const currentConversation = [...conversation, newUserMessage];
    setConversation(currentConversation);
    setUserInput('');
    setIsLoading(true);

    try {
      const messagesForAPI: Message[] = [
        conversation[0],
        ...currentConversation.slice(1)
      ];

      const responseContent = await OpenAIService.getAIChatResponse(messagesForAPI);
      setConversation(prevConv => [...prevConv, { role: 'assistant', content: responseContent }]);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setConversation(prevConv => [...prevConv, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-2xl h-[80vh] max-h-[700px] flex flex-col overflow-hidden border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 px-4 border-b border-gray-700 bg-gray-850">
          <div className="flex items-center">
            <img src="/img/icono_lexingo.png" alt="Lexingo AI" className="w-8 h-8 rounded-full mr-3 border-2 border-teal-400"/> 
            <div>
              <h3 className="text-lg font-semibold text-gray-100">Lexingo AI</h3>
              <p className="text-xs text-teal-300 -mt-1">Asistente IA gramatical y multilingüe</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full"
            aria-label="Cerrar chat"
          >
            <X size={20} />
          </button>
        </div>

        <div ref={chatContentRef} className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {conversation.filter(msg => msg.role !== 'system').map((msg, index) => {
            const isAssistant = msg.role === 'assistant';
            let messageParts: React.ReactNode[] = [];

            if (isAssistant) {
              if (msg.content.includes('[USER_TEXT_START]') && msg.content.includes('[USER_TEXT_END]')) {
                const splitContent = msg.content.split(/(\[USER_TEXT_START\][\s\S]*?\[USER_TEXT_END\])/g);
                messageParts = splitContent.flatMap((part, i) => { // Use flatMap as parseMarkdown returns an array
                  if (part.startsWith('[USER_TEXT_START]') && part.endsWith('[USER_TEXT_END]')) {
                    return [ // flatMap expects an array to be returned for each element
                      <span 
                        key={i} 
                        className="block my-1 p-2 bg-gray-750 border border-purple-500 rounded-md shadow text-sm text-purple-300 whitespace-pre-wrap" // Reduced padding/margin
                      >
                        {part.replace('[USER_TEXT_START]', '').replace('[USER_TEXT_END]', '')}
                      </span>
                    ];
                  }
                  // Apply Markdown to assistant text parts that are NOT the user_text block
                  return parseMarkdown(part); 
                });
              } else {
                // Apply Markdown to the entire assistant message if no user_text block
                messageParts = parseMarkdown(msg.content);
              }
            } else { // User message
              // User messages are plain text, no markdown parsing.
              // The outer div's whitespace-pre-wrap will handle multiline.
              messageParts = [msg.content]; 
            }

            return (
              <div 
                key={index} 
                className={`flex items-end space-x-2 ${msg.role === 'user' ? 'justify-end flex-row-reverse space-x-reverse' : 'justify-start'}`}
              >
                {isAssistant ? (
                  <img src="/img/icono_lexingo.png" alt="Lexi" className="w-8 h-8 rounded-full border-2 border-purple-400 self-start flex-shrink-0"/>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold self-start flex-shrink-0">
                    U {/* Placeholder for User Avatar */}
                  </div>
                )}
                <div 
                  className={`max-w-[75%] p-3 rounded-xl shadow ${msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' // User bubble on the left of avatar (visual right), so BR corner is normal
                    : 'bg-gray-700 text-gray-200 rounded-bl-none'} whitespace-pre-wrap`} // Assistant bubble on the right of avatar, BL normal
                >
                  {messageParts.map((part, i) => <React.Fragment key={i}>{part}</React.Fragment>)}
                </div>
              </div>
            );
          })}
          {isLoading && conversation.length === 1 && (
            <div className="flex items-end space-x-2 justify-start">
              <img src="/img/icono_lexingo.png" alt="Lexi" className="w-8 h-8 rounded-full border-2 border-purple-400 self-start flex-shrink-0"/>
              <div className="max-w-[75%] p-3 rounded-lg shadow bg-gray-700 text-gray-200 rounded-bl-none flex items-center">
                <Loader2 size={18} className="animate-spin mr-3 text-purple-400" />
                <span>Lexingo AI está preparando tu bienvenida...</span>
              </div>
            </div>
          )}
          {isLoading && conversation.length > 1 && conversation[conversation.length -1].role === 'user' && (
            <div className="flex items-end space-x-2 justify-start">
              <img src="/img/icono_lexingo.png" alt="Lexi" className="w-8 h-8 rounded-full border-2 border-purple-400 self-start flex-shrink-0"/>
              <div className="max-w-[75%] p-3 rounded-lg shadow bg-gray-700 text-gray-200 rounded-bl-none flex items-center">
                <Loader2 size={18} className="animate-spin mr-3 text-purple-400" />
                <span>Lexingo AI está pensando...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-850">
          <div className="flex items-center bg-gray-700 rounded-lg">
            <input 
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              placeholder="Escribe tu pregunta sobre el texto..."
              className="flex-grow p-3 bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none rounded-l-lg"
              disabled={isLoading}
              onMouseDown={(e) => e.stopPropagation()}
            />
            <button 
              onClick={handleSendMessage} 
              disabled={isLoading || userInput.trim() === ''}
              className="p-3 text-purple-400 hover:text-purple-300 disabled:text-gray-500 disabled:cursor-not-allowed rounded-r-lg transition-colors"
              aria-label="Enviar mensaje"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatModal; 