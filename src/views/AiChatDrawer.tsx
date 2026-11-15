import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User, Target } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  matchesContext?: unknown;
}

interface MessageItem {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({
  isOpen,
  onClose,
  matchesContext,
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'สวัสดีครับ! ผมคือ กูรู AI xG & Correct Score Analyst ยินดีให้คำแนะนำการวิเคราะห์สกอร์บอลแม่นยำด้วยโมเดลคณิตศาสตร์ Dixon-Coles และการหาตัวเลือกที่มีค่า +EV สูงสุดใน 1xBet ครับ อยากให้ผมวิเคราะห์คู่ไหนเป็นพิเศษไหมครับ?',
      time: '19:45',
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'คู่ไหนใน 1xBet มีค่า +EV สูงสุดตอนนี้?',
    'วิเคราะห์คู่ Arsenal vs Chelsea ให้หน่อย',
    'ทำไมต้องทำ Data Calibration ให้ error ต่ำกว่า 5%?',
    'แนะนำ 3 สกอร์น่าจัดสำหรับบอลสเต็ปคืนนี้',
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    soundManager.playTap();
    const userMsg: MessageItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          matchContext: matchesContext,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: MessageItem = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.reply || 'ขออภัยครับ ไม่สามารถสร้างคำตอบได้ชั่วคราว',
          time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error('Error querying AI chat:', err);
      const aiMsg: MessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: 'ขออภัยครับ ระบบกำลังประมวลผล xG ขัดข้องชั่วคราว ลองใหม่อีกครั้งนะครับ',
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full max-w-lg bg-[#0b0f19] border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl h-[80vh] flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="p-3.5 bg-[#0d1424] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 p-[1px] flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>กูรู AI วิเคราะห์บอล &amp; xG Analyst</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[10px] text-slate-400">Powered by Gemini &amp; Dixon-Coles Model</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-6 h-6 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-sky-400 shrink-0 text-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed space-y-1 ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-line">{m.text}</p>
                <div className={`text-[9px] font-mono ${m.sender === 'user' ? 'text-blue-200' : 'text-slate-500'} text-right`}>
                  {m.time}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 items-center text-xs text-sky-400 p-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>กูรู AI กำลังประมวลผล xG และราคาค่าน้ำ 1xBet...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts Bar */}
        <div className="p-2 bg-[#090d15] border-t border-slate-800/80 overflow-x-auto flex gap-1.5 scrollbar-none">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="p-3 bg-[#0d1424] border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="ถามกูรู AI เกี่ยวกับสกอร์แม่นยำ หรือค่าน้ำ 1xBet..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-40 active:scale-95 cursor-pointer shadow-md shadow-blue-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
