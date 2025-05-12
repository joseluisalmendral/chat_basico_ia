import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Función para desplazarse al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Función para enviar mensaje al webhook real con mejor manejo de errores
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
    
    // CONEXIÓN REAL AL WEBHOOK CON MEJOR MANEJO DE ERRORES
    fetch('https://n8nalmendral.com/webhook/6f7b288e-1efe-4504-a6fd-660931327269', {
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
        // Primero convertimos la respuesta a texto para ver qué estamos recibiendo
        return response.text();
      })
      .then(text => {
        console.log('Respuesta como texto:', text);
        // Si está vacío, lanzamos un error
        if (!text || text.trim() === '') {
          throw new Error('Respuesta vacía del servidor');
        }
        // Intentamos parsear el texto como JSON
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error('Error al parsear JSON:', e);
          // Si no podemos parsear JSON, devolvemos un objeto con el texto como mensaje
          return { output: text };
        }
      })
      .then(data => {
        console.log('Datos procesados:', data);
        // Extraemos el mensaje correcto según la estructura de respuesta
        const responseText = data.output || data.response || data.message || JSON.stringify(data);
        
        // Agregar respuesta del modelo
        const aiMessage = { 
          id: Date.now() + 1, 
          text: responseText, 
          sender: 'ai' 
        };
        
        setMessages(prev => [...prev, aiMessage]);
      })
      .catch(error => {
        console.error('Error completo:', error);
        // Mostrar mensaje de error más detallado
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Encabezado */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-center">
        <h1 className="text-xl font-semibold text-gray-800">Chat con IA</h1>
      </header>
      
      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">
              Envía un mensaje para comenzar una conversación...
            </p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`message ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="message ai-message loading">
              <div className="loading-indicator">
                <Loader2 className="loader-icon" />
                <p>Pensando...</p>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input para enviar mensajes */}
      <div className="message-input">
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(e)}
            placeholder="Escribe un mensaje..."
            className="text-input"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className={`send-button ${isLoading || !input.trim() ? 'disabled' : ''}`}
          >
            <Send className="send-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;