import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, Plus, Copy, Check, Image, File, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import copy from 'copy-to-clipboard';
import './AppNew.css';

// Componente de animación inicial
const IntroAnimation = ({ onAnimationComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 3000); // La animación dura 3 segundos

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <div className="intro-animation">
      <h1 className="intro-text">Almendral AI</h1>
    </div>
  );
};

// Componente separado para bloques de código
const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    copy(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-language">{language}</span>
        <button className="copy-button" onClick={handleCopy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <SyntaxHighlighter
        style={atomDark}
        language={language}
        PreTag="div"
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

// Componente para renderizar mensajes con Markdown
const MarkdownMessage = ({ text }) => {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Aplicamos estilos a través del componente p
          p: ({node, ...props}) => <p className="markdown-paragraph" {...props} />,
          // Aplicamos estilos a los encabezados
          h1: ({node, ...props}) => <h1 className="markdown-heading" {...props} />,
          h2: ({node, ...props}) => <h2 className="markdown-heading" {...props} />,
          h3: ({node, ...props}) => <h3 className="markdown-heading" {...props} />,
          // Utilizamos nuestro componente personalizado para bloques de código
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            if (!inline && match) {
              return <CodeBlock 
                language={match[1]} 
                value={String(children).replace(/\n$/, '')} 
              />;
            }
            return <code className={className} {...props}>{children}</code>;
          }
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

// Componente de vista previa de archivos
const FilePreview = ({ file, onRemove }) => {
  const [preview, setPreview] = useState(null);
  
  useEffect(() => {
    if (!file) return;
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }, [file]);
  
  return (
    <div className="file-preview">
      {file.type.startsWith('image/') && preview ? (
        <div className="image-preview">
          <img src={preview} alt="Preview" />
          <button className="remove-file" onClick={onRemove}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="generic-file">
          <File size={24} />
          <span>{file.name}</span>
          <button className="remove-file" onClick={onRemove}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

// Componente principal
function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [model, setModel] = useState('prod'); // 'prod' o 'test'
  const [attachment, setAttachment] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // URLs de los webhooks
  const webhooks = {
    prod: 'https://n8nalmendral.com/webhook/6f7b288e-1efe-4504-a6fd-660931327269',
    test: 'https://n8nalmendral.com/webhook-test/6f7b288e-1efe-4504-a6fd-660931327269'
  };

  // Función para desplazarse al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Función para cambiar el modelo
  const changeModel = (newModel) => {
    setModel(newModel);
    // Opcional: Limpiar la conversación al cambiar de modelo
    // setMessages([]);
  };

  // Manejar el pegado de imágenes
  useEffect(() => {
    const handlePaste = (e) => {
      if (document.activeElement !== inputRef.current) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          setAttachment(blob);
          e.preventDefault();
          break;
        }
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);
  
  // Manejar la selección de archivos
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };
  
  // Remover archivo adjunto
  const removeAttachment = () => {
    setAttachment(null);
    // Resetear el input de archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Función para enviar mensaje al webhook
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim() && !attachment) return;
    
    // Crear la versión visual del mensaje del usuario
    const userMessageText = input.trim();
    const userMessage = { 
      id: Date.now(), 
      text: userMessageText, 
      sender: 'user',
      hasAttachment: !!attachment
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Preparar los datos para enviar al webhook
    const formData = new FormData();
    formData.append('q', userMessageText);
    
    if (attachment) {
      formData.append('file', attachment);
      // Añadir una vista previa local para la UI
      setMessages(prev => {
        const lastIndex = prev.length - 1;
        if (lastIndex >= 0 && prev[lastIndex].sender === 'user') {
          const updatedMessages = [...prev];
          updatedMessages[lastIndex] = {
            ...updatedMessages[lastIndex],
            attachment: URL.createObjectURL(attachment)
          };
          return updatedMessages;
        }
        return prev;
      });
      setAttachment(null);
    }
    
    try {
      const response = await fetch(webhooks[model], {
        method: 'POST',
        body: formData,
      });
      
      console.log('Estado de respuesta:', response.status);
      if (!response.ok) {
        throw new Error(`Error en la respuesta del servidor: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('Respuesta como texto:', text);
      
      if (!text || text.trim() === '') {
        throw new Error('Respuesta vacía del servidor');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Error al parsear JSON:', e);
        data = { output: text };
      }
      
      console.log('Datos procesados:', data);
      const responseText = data.output || data.response || data.message || JSON.stringify(data);
      
      const aiMessage = { 
        id: Date.now() + 1, 
        text: responseText, 
        sender: 'ai' 
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error completo:', error);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: `Error: ${error.message}. Por favor, intenta de nuevo.`, 
        sender: 'ai' 
      }]);
    } finally {
      setIsLoading(false);
      // Resetear el input de archivo si existe
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Si todavía se muestra la animación de introducción
  if (showIntro) {
    return <IntroAnimation onAnimationComplete={() => setShowIntro(false)} />;
  }

  return (
    <div className="chat-container">
      {/* Encabezado con selector de modelos */}
      <header className="chat-header">
        <h1>Almendral AI</h1>
        <div className="model-tabs">
          <button 
            className={`tab-button ${model === 'prod' ? 'active' : ''}`}
            onClick={() => changeModel('prod')}
          >
            Producción
          </button>
          <button 
            className={`tab-button ${model === 'test' ? 'active' : ''}`}
            onClick={() => changeModel('test')}
          >
            Test
          </button>
        </div>
      </header>
      
      {/* Área de mensajes */}
      <div className="messages-area">
        {messages.length === 0 && (
          <div className="empty-chat">
            <MessageSquare size={48} />
            <p>Envía un mensaje para comenzar una conversación...</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`message-container ${msg.sender === 'user' ? 'user' : 'ai'}`}
          >
            <div className="message-bubble">
              {msg.sender === 'ai' ? (
                <MarkdownMessage text={msg.text} />
              ) : (
                <>
                  <p>{msg.text}</p>
                  {msg.attachment && (
                    <div className="message-attachment">
                      <img src={msg.attachment} alt="Attachment" className="attachment-preview" />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message-container ai">
            <div className="message-bubble loading">
              <Loader2 className="loader-icon" />
              <p>Pensando...</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input para enviar mensajes */}
      <div className="input-area">
        {attachment && (
          <FilePreview file={attachment} onRemove={removeAttachment} />
        )}
        
        <form onSubmit={sendMessage} className="message-form">
          <button 
            type="button"
            className="attachment-button"
            onClick={() => fileInputRef.current.click()}
          >
            <Plus size={20} />
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          
          <input
            type="text"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="message-input"
          />
          
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !attachment)}
            className={`send-button ${isLoading || (!input.trim() && !attachment) ? 'disabled' : ''}`}
          >
            <Send />
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;