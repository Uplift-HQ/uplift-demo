// ============================================================
// AI CHAT WIDGET
// Floating chatbot that calls Anthropic API directly
// Uses demo data context for realistic responses
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2 } from 'lucide-react';

const DEMO_CONTEXT = `You are Uplift AI, the intelligent assistant built into the Uplift workforce management platform.

You are running in DEMO MODE for Grand Metropolitan Hotel Group.
150 employees across 9 hotel locations worldwide.

Available data you know about:
- 9 locations: London Mayfair, Paris Champs-Élysées, Dubai Marina, New York Central Park, Tokyo Ginza, Barcelona, Sydney, Rome, Amsterdam
- 9 departments: Front of House, Kitchen, Housekeeping, Bar & Beverage, Spa & Wellness, Events & Conferences, Engineering & Facilities, HR, Finance
- 150 employees across these locations
- Current user: Maria Santos, Front Desk Manager, London Mayfair
- Maria's upcoming shifts: Mon 07:00-15:00, Tue 07:00-15:00, Wed OFF, Thu 14:00-22:00, Fri 14:00-22:00
- Maria's time off balance: 18 days remaining of 25
- Maria's team: 8 direct reports in Front of House London
- Pending approvals: 2 time off requests, 1 expense claim
- eNPS score: +45 (Excellent)
- Turnover rate: 12% (hospitality average ~30%)
- Training compliance: 94%
- Current month payroll: £142,500 (UK), processed
- Open positions: 3 (Sous Chef Paris, Night Manager Dubai, Receptionist London)

When answering questions:
- Use this demo data to give realistic answers
- Be concise — this may be read on mobile
- For write actions, say "In the live system, I would [action]. In this demo, I've simulated the action."
- Be helpful and proactive
- If asked about data you don't have, say so honestly
- Keep responses under 150 words unless more detail is specifically requested`;

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Uplift AI. Ask me about your schedule, team, approvals, or anything else. How can I help?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

      if (!apiKey) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'API key not configured. Add VITE_ANTHROPIC_API_KEY to your .env file.',
          },
        ]);
        setLoading(false);
        return;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: DEMO_CONTEXT,
          messages: [...messages.slice(1), userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'API error');
      }

      const aiMessage = {
        role: 'assistant',
        content: data.content?.[0]?.text || 'Sorry, I could not process that.',
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center transition-all duration-200
          ${isOpen
            ? 'bg-slate-700 hover:bg-slate-800 rotate-0'
            : 'bg-momentum-500 hover:bg-momentum-600 hover:scale-105'
          }
        `}
        aria-label={isOpen ? 'Close chat' : 'Open Uplift AI'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Sparkles className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-momentum-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Uplift AI</h3>
              <p className="text-slate-400 text-xs">Your intelligent assistant</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px] min-h-[300px] bg-slate-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-momentum-500 text-white rounded-br-md'
                      : 'bg-white text-slate-700 border border-slate-200 rounded-bl-md shadow-sm'
                    }
                  `}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-500 px-3 py-2 rounded-2xl rounded-bl-md border border-slate-200 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-momentum-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className={`
                  p-2 rounded-lg transition-colors
                  ${loading || !input.trim()
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-momentum-500 text-white hover:bg-momentum-600'
                  }
                `}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Demo mode — responses based on sample data
            </p>
          </div>
        </div>
      )}
    </>
  );
}
