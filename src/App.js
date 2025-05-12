import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare } from 'lucide-react';
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

// Componente principal
function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [model, setModel] = useState('prod'); // 'prod' o 'test'
  const messagesEndRef = useRef(null);

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

  // Función para enviar mensaje al webhook
  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Agregar mensaje del usuario
    const userMessage = { 
      id: Date.now(), 
      text: input, 
      sender: 'user' 
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Conexión al webhook según el modelo seleccionado
    fetch(webhooks[model], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: input }),
    })
      .then(response => {
        console.log('Estado de respuesta:', response.status);
        if (!response.ok) {
          throw new Error(`Error en la respuesta del servidor: ${response.status}`);
        }
        return response.text();
      })
      .then(text => {
        console.log('Respuesta como texto:', text);
        if (!text || text.trim() === '') {
          throw new Error('Respuesta vacía del servidor');
        }
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error('Error al parsear JSON:', e);
          return { output: text };
        }
      })
      .then(data => {
        console.log('Datos procesados:', data);
        const responseText = data.output || data.response || data.message || JSON.stringify(data);
        
        const aiMessage = { 
          id: Date.now() + 1, 
          text: responseText, 
          sender: 'ai' 
        };
        
        setMessages(prev => [...prev, aiMessage]);
      })
      .catch(error => {
        console.error('Error completo:', error);
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          text: `Error: ${error.message}. Por favor, intenta de nuevo.`, 
          sender: 'ai' 
        }]);
      })
      .finally(() => {
        setIsLoading(false);
      });
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
              <p>{msg.text}</p>
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
        <form onSubmit={sendMessage} className="message-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="message-input"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`send-button ${isLoading || !input.trim() ? 'disabled' : ''}`}
          >
            <Send />
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;