import React, { useState, useRef, useEffect } from 'react';
import { MessageRole, ChatMessage } from '../types';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
  onGenerateRow: (instruction: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  isProcessing,
  onGenerateRow 
}) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'chat' | 'generate'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    if (mode === 'chat') {
      onSendMessage(input);
    } else {
      onGenerateRow(input);
    }
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Bot size={20} className="text-green-600" />
          Asistente IA
        </h2>
        <div className="flex mt-3 bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setMode('chat')}
            className={`flex-1 py-1 text-sm font-medium rounded-md transition-all ${
              mode === 'chat' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Consultar
          </button>
          <button
            onClick={() => setMode('generate')}
            className={`flex-1 py-1 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
              mode === 'generate' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Sparkles size={14} />
            Generar Fila
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {mode === 'chat' 
            ? "Pregunta sobre tendencias, promedios o busca datos específicos." 
            : "Describe una nueva entrada y la IA la creará con el formato correcto."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-10">
            <Bot size={48} className="mx-auto mb-2 opacity-20" />
            <p>Empieza a chatear con tus datos...</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === MessageRole.User ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === MessageRole.User
                  ? 'bg-green-600 text-white rounded-br-none'
                  : 'bg-slate-100 text-slate-800 rounded-bl-none'
              } ${msg.isError ? 'bg-red-50 text-red-600 border border-red-200' : ''}`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className={`text-[10px] mt-1 opacity-70 ${msg.role === MessageRole.User ? 'text-green-100' : 'text-slate-500'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-slate-50 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 size={16} className="animate-spin" />
                {mode === 'chat' ? 'Analizando datos...' : 'Generando estructura...'}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'chat' ? "Ej: ¿Cuál es el salario promedio?" : "Ej: Agrega a Juan Pérez, Vendedor..."}
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="bg-green-600 text-white rounded-lg p-2 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mode === 'chat' ? <Send size={20} /> : <Sparkles size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;