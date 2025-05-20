import React, { useState, useEffect, useRef } from 'react';
import { OpenAIService } from '../services/openai';
import { X, Send, Loader2, Sparkles, UserCircle2, Mic, StopCircle, Square, SignalHigh } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Interfaz para el perfil del usuario
interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
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
  
  // Estado para el perfil del usuario
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Estado para Speech-to-Text
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Estado para controlar la expansión del texto del usuario en el mensaje inicial
  const [isUserTextExpanded, setIsUserTextExpanded] = useState(false);
  const USER_TEXT_TRUNCATE_LENGTH = 300; // Caracteres a mostrar antes de truncar

  useEffect(() => {
    if (isOpen) {
      if (!isLoading && !isRecording && !isTranscribing && inputRef.current) {
        inputRef.current.focus();
      }
      if (initialText && !initialGreetingSentRef.current) {
        initialGreetingSentRef.current = true;
        setIsLoading(true);
        setIsUserTextExpanded(false); // Resetear al abrir el modal

        const systemMessage: Message = {
          role: 'system',
          content: "Eres Lexi, un asistente de IA amigable y experto en idiomas integrado en la aplicación de lectura Lexingo. Tu objetivo es ayudar a los usuarios a comprender mejor los textos que están leyendo. El usuario te proporcionará un fragmento de texto.\nDebes iniciar la conversación saludando amablemente.\nLuego, PRESENTA CLARAMENTE el texto que el usuario compartió envolviéndolo EXACTAMENTE así: [USER_TEXT_START]el texto del usuario aquí[USER_TEXT_END]. No añadas ningún otro carácter o formato alrededor de estas etiquetas especiales.\nDespués de presentar el texto, DEBES continuar tu mensaje EXACTAMENTE con el siguiente formato y texto para las sugerencias (puedes ajustar la referencia a \'este fragmento\' si es natural, pero mantén la estructura de la lista numerada):\n\n'¿En qué puedo ayudarte con este fragmento? Por ejemplo, puedo:\n1. Analizar la gramática.\n2. Explicar frases complejas.\n3. Dar sinónimos de palabras clave.\n4. Profundizar en el significado de alguna parte.\n\n¡Dime qué te interesa explorar o simplemente indica el número de la opción!\'\n\nMantén un tono conversacional, servicial y alentador en tu saludo inicial y en la frase final. Genera toda esta respuesta inicial en una sola burbuja de chat."
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
      setIsUserTextExpanded(false); // Asegurarse de resetear al cerrar
    }
  }, [isOpen, initialText]);

  useEffect(() => {
    if (chatContentRef.current) {
      const { current: chat } = chatContentRef;
      const lastMessage = conversation[conversation.length - 1];

      if (lastMessage && lastMessage.role === 'assistant') {
        // Intentar hacer scroll al último elemento hijo del contenedor de chat,
        // que debería ser el nuevo mensaje del asistente.
        const lastMessageElement = chat.lastElementChild;
        if (lastMessageElement) {
          lastMessageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // Fallback si no se encuentra el elemento, aunque es improbable si hay mensajes.
          chat.scrollTop = chat.scrollHeight;
        }
      } else {
        // Si el último mensaje es del usuario o no hay mensajes (o es el mensaje inicial del sistema),
        // hacer scroll hasta el final para mantener el input visible.
        chat.scrollTop = chat.scrollHeight;
      }
    }

    if (isOpen && !isLoading && !isRecording && !isTranscribing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [conversation, isOpen, isLoading, isRecording, isTranscribing]);

  const handleSendMessage = async () => {
    if (userInput.trim() === '' || isLoading || isRecording || isTranscribing) return;

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

  // Funciones para Speech-to-Text
  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecordingAndTranscribe();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('La API de MediaDevices no es soportada en este navegador.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        setIsTranscribing(true);
        setUserInput(''); // Limpiar input mientras transcribe

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], "recording.webm", {
          type: "audio/webm",
          lastModified: Date.now(),
        });

        try {
          const transcribedText = await OpenAIService.transcribeAudio(audioFile);
          setUserInput(transcribedText);
        } catch (error) {
          console.error("Error al transcribir el audio:", error);
          alert("Error al transcribir el audio. Intenta de nuevo.");
        } finally {
          setIsTranscribing(false);
          // Detener las pistas del stream para apagar el indicador del micrófono del navegador
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsTranscribing(false);
      setUserInput(''); // Limpiar input al empezar a grabar
    } catch (error) {
      console.error("Error al iniciar la grabación:", error);
      alert("No se pudo iniciar la grabación. Asegúrate de permitir el acceso al micrófono.");
      setIsRecording(false);
    }
  };

  const stopRecordingAndTranscribe = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      // El resto de la lógica está en el 'onstop' handler
    }
  };

  // Limpiar al desmontar o cerrar
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      const stream = mediaRecorderRef.current?.stream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Obtener el perfil del usuario
  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();
    }
  }, [isOpen]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error al obtener el perfil del usuario:', error);
        return;
      }

      setUserProfile(data);
      
      // Si hay una URL de avatar, añadir timestamp para evitar caché
      if (data.avatar_url) {
        const timestamp = new Date().getTime();
        const cachedUrl = `${data.avatar_url}?t=${timestamp}`;
        setAvatarUrl(cachedUrl);
      }
    } catch (error) {
      console.error('Error al obtener el perfil del usuario:', error);
    }
  };

  // Función para obtener las iniciales del usuario
  const getUserInitials = () => {
    if (!userProfile) return 'U';
    
    if (userProfile.name) {
      return userProfile.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
    }
    
    return userProfile.email[0].toUpperCase();
  };
  
  // Manejar error al cargar la imagen
  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Error al cargar el avatar en el chat');
    setAvatarUrl(null);
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
                    const userText = part.replace('[USER_TEXT_START]', '').replace('[USER_TEXT_END]', '');
                    const needsTruncation = userText.length > USER_TEXT_TRUNCATE_LENGTH;
                    const displayText = isUserTextExpanded || !needsTruncation ? userText : `${userText.substring(0, USER_TEXT_TRUNCATE_LENGTH)}...`;

                    return [ // flatMap expects an array to be returned for each element
                      <div key={i} className="block my-1 p-3 bg-gray-750 border border-purple-500 rounded-md shadow text-sm text-purple-300 whitespace-pre-wrap">
                        {displayText}
                        {needsTruncation && (
                          <button
                            onClick={() => setIsUserTextExpanded(!isUserTextExpanded)}
                            className="block text-xs text-purple-400 hover:text-purple-200 mt-2 focus:outline-none underline"
                          >
                            {isUserTextExpanded ? 'Mostrar menos' : 'Mostrar más'}
                          </button>
                        )}
                      </div>
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
                className={`flex items-end w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`flex items-end space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {isAssistant ? (
                    <img src="/img/icono_lexingo.png" alt="Lexi" className="w-8 h-8 rounded-full border-2 border-purple-400 self-start flex-shrink-0"/>
                  ) : (
                    <>
                      {avatarUrl ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-400 self-start flex-shrink-0">
                          <img 
                            src={avatarUrl}
                            alt="Usuario"
                            className="w-full h-full object-cover"
                            onError={handleAvatarError}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold self-start flex-shrink-0">
                          {getUserInitials()}
                        </div>
                      )}
                    </>
                  )}
                  <div 
                    className={`max-w-[75%] p-3 rounded-xl shadow ${msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-gray-700 text-gray-200 rounded-bl-none'} whitespace-pre-wrap`}
                  >
                    {messageParts.map((part, i) => <React.Fragment key={i}>{part}</React.Fragment>)}
                  </div>
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
          <div className="flex items-center bg-gray-700 rounded-lg p-1.5 pr-2.5 relative">
            {/* Área de Input o Indicador de Estado */} 
            <div className="flex-grow flex items-center justify-center min-h-[40px]"> {/* Asegura altura mínima */} 
              {isRecording ? (
                <div className="flex items-center text-yellow-400">
                  <Mic size={20} className="animate-pulse mr-2" />
                  <span>Grabando...</span>
                </div>
              ) : isTranscribing ? (
                <div className="flex items-center text-blue-400">
                  <Loader2 size={20} className="animate-spin mr-2" />
                  <span>Transcribiendo...</span>
                </div>
              ) : (
                <input 
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                  placeholder="Escribe tu pregunta sobre el texto..."
                  className="w-full h-full bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none px-2 py-1"
                  disabled={isLoading}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              )}
            </div>

            {/* Botones a la derecha */} 
            <div className="flex items-center space-x-1.5 ml-2">
              {!isRecording && !isTranscribing && (
                <button
                  onClick={handleToggleRecording} 
                  className="p-2 text-gray-400 hover:text-gray-300 transition-colors rounded-full border-2 border-gray-600 hover:border-gray-500 focus:outline-none"
                  aria-label="Iniciar grabación"
                >
                  <Mic size={20} />
                </button>
              )}

              <button 
                onClick={() => {
                  if (isRecording) {
                    stopRecordingAndTranscribe();
                  } else if (!isTranscribing) {
                    handleSendMessage();
                  }
                  // No hacer nada si está transcribiendo
                }}
                disabled={(isLoading && !isRecording) || isTranscribing || (!isRecording && userInput.trim() === '')}
                className={`p-2 rounded-full flex items-center justify-center transition-all duration-150 ease-in-out 
                  ${isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white w-9 h-9' // Botón detener grabación
                    : isTranscribing 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed w-9 h-9' // Transcribiendo
                      : 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-500 disabled:hover:bg-gray-500 disabled:cursor-not-allowed w-9 h-9' // Enviar texto
                  }`}
                aria-label={isRecording ? "Detener grabación" : isTranscribing ? "Transcribiendo" : "Enviar mensaje"}
              >
                {isRecording ? (
                  <Square size={16} fill="white" /> // Icono cuadrado para detener
                ) : isTranscribing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatModal; 