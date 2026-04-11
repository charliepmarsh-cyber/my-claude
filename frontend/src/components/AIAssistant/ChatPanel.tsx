import { useState } from 'react';
import { Send, CheckCircle, Circle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestedPrompts = [
  'How is my revenue?',
  "What's my top selling product?",
  'How are my ads performing?',
  'Tell me about AI traffic',
];

const contextModules = [
  { key: 'revenue', label: 'Revenue & order data' },
  { key: 'products', label: 'Product performance' },
  { key: 'google_ads', label: 'Google Ads metrics' },
  { key: 'email', label: 'Email campaign stats' },
  { key: 'ai_referrals', label: 'AI referral data' },
  { key: 'traffic', label: 'Traffic sources' },
];

// Demo responses for standalone mode
const demoResponses: Record<string, string> = {
  'how is my revenue': "Your total revenue over the last 30 days is **£148,320.50** across **1,842 orders**, giving you an average order value of **£80.52**.\n\nKey highlights:\n- Shopify is your strongest channel at £98,450 (66.3% of revenue)\n- Amazon contributes £28,900 (19.5%)\n- Conversion rate sits at 3.8% with 42% returning customers\n- Revenue has been consistent, averaging £4,900/day with slight peaks mid-week",
  "what's my top selling product": "Your **Premium Wireless Earbuds (SKU-1001)** is the clear winner:\n- **284 sales** generating **£14,196** in revenue\n- 4,820 views with a strong 5.89% conversion rate\n- 612 add-to-carts (12.7% ATC rate)\n\nFollowed by:\n1. LED Desk Lamp - £8,040 (134 sales)\n2. Organic Cotton T-Shirt - £6,930 (231 sales, highest conv rate at 5.91%)\n3. Water Bottle 1L - £5,940 (198 sales)",
  'how are my ads performing': "Your Google Ads are performing well with a **2.91x ROAS**:\n\n- **8,420 clicks** from 142,300 impressions (5.92% CTR)\n- **£4,280.50 spent** generating **£12,470.50 revenue**\n- **152 conversions** at £0.51 CPC\n\nYour CTR of 5.92% is above average for e-commerce. The £0.51 CPC is efficient. Consider increasing budget as ROAS is healthy at nearly 3x.",
  'tell me about ai traffic': "AI referral traffic is a growing channel for your brand:\n\n- **32 orders** worth **£3,300** from **128 unique visitors**\n- 25% conversion rate from AI traffic (vs 3.8% overall)\n\nBreakdown by source:\n1. **ChatGPT**: 14 orders / £1,430 revenue (dominant)\n2. **Perplexity**: 8 orders / £845\n3. **Claude**: 5 orders / £520\n4. **Gemini**: 3 orders / £350\n5. **Copilot**: 2 orders / £155\n\nYour Premium Wireless Earbuds is the most recommended product by AI assistants.",
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeModules] = useState<Record<string, boolean>>(
    Object.fromEntries(contextModules.map(m => [m.key, true]))
  );

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Demo mode: use local responses
    const key = Object.keys(demoResponses).find(k => text.toLowerCase().includes(k));
    const answer = key
      ? demoResponses[key]
      : "I can see your dashboard data is loaded. Based on the current 30-day period, your store is performing well with £148,320.50 in total revenue. Could you ask me something more specific about your revenue, products, ads, email campaigns, or AI traffic?";

    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
    setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    setLoading(false);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-10rem)]">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col glass rounded-2xl">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-12">
              <p className="text-lg font-medium mb-2">Ask me anything about your data</p>
              <p className="text-sm">I have access to your live dashboard metrics</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-50 text-gray-800 border border-gray-100'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-400 border border-gray-100">
                Analyzing your data...
              </div>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        {messages.length === 0 && (
          <div className="px-5 pb-3 flex gap-2 flex-wrap">
            {suggestedPrompts.map(p => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm hover:bg-blue-100 transition"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your revenue, products, ads..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Context Sidebar */}
      <div className="w-64 glass rounded-2xl p-5 hidden lg:block">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Context Loaded</h3>
        <div className="space-y-3">
          {contextModules.map(m => (
            <div key={m.key} className="flex items-center gap-2">
              {activeModules[m.key] ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <span className="text-sm text-gray-700">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Powered by Claude AI</p>
          <p className="text-xs text-gray-400 mt-1">Using live dashboard data</p>
        </div>
      </div>
    </div>
  );
}
