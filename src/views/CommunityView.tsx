import React, { useState } from 'react';
import { ChatMessage, Match } from '../types/soccer';
import { MessageSquare, Send, ThumbsUp, Flame, Target, Sparkles, CheckCircle2, Share2, Vote } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface CommunityViewProps {
  messages: ChatMessage[];
  matches: Match[];
  onSendMessage: (text: string, tipShare?: ChatMessage['tipShare']) => void;
  onReactMessage: (messageId: string, reaction: 'fire' | 'ball' | 'target' | 'claps') => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({
  messages,
  matches,
  onSendMessage,
  onReactMessage,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [showTipModal, setShowTipModal] = useState<boolean>(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matches[0]?.id || '');
  const [selectedScore, setSelectedScore] = useState<string>('2-1');

  // Live community poll state
  const [pollVotes, setPollVotes] = useState({ '2-1': 142, '1-1': 89, '2-0': 64, '3-1': 51 });
  const [userVoted, setUserVoted] = useState<string | null>(null);

  const totalVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);

  const handleVote = (choice: '2-1' | '1-1' | '2-0' | '3-1') => {
    if (userVoted) return;
    soundManager.playTap();
    setUserVoted(choice);
    setPollVotes((prev) => ({
      ...prev,
      [choice]: prev[choice] + 1,
    }));
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    soundManager.playTap();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleShareTipSubmit = () => {
    const targetMatch = matches.find((m) => m.id === selectedMatchId) || matches[0];
    const targetPred = targetMatch.predictions.find((p) => p.score === selectedScore) || targetMatch.predictions[0];

    onSendMessage(`ผมฟันธงคู่นี้ครับ! สกอร์ ${selectedScore} ค่าน้ำ 1xBet @${targetPred.odds1xBet} โมเดล xG เข้าตามาก 🎯`, {
      matchId: targetMatch.id,
      matchTitle: `${targetMatch.homeTeam.name} vs ${targetMatch.awayTeam.name}`,
      score: selectedScore,
      odds: targetPred.odds1xBet,
      confidence: targetMatch.calibration.confidenceIndex,
    });

    setShowTipModal(false);
  };

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* Community Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <span>กระดานสนทนาคอบอล &amp; แลกเปลี่ยนทัศนะสด</span>
          </h1>
          <p className="text-xs text-slate-400">
            แชตสดกับเพื่อนคอบอลและเซียน xG พร้อมฟังก์ชั่นแชร์ทีเด็ดสกอร์
          </p>
        </div>

        <button
          onClick={() => setShowTipModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>แชร์ทัศนะ</span>
        </button>
      </div>

      {/* Daily Live Community Poll */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-sky-500/30 p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Vote className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-white">โพลสดคอบอล 1xBet: คู่ Arsenal vs Chelsea</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{totalVotes} คนโหวตแล้ว</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['2-1', '1-1', '2-0', '3-1'] as const).map((choice) => {
            const votes = pollVotes[choice];
            const pct = Math.round((votes / (totalVotes || 1)) * 100);
            const isVoted = userVoted === choice;

            return (
              <button
                key={choice}
                onClick={() => handleVote(choice)}
                disabled={!!userVoted}
                className={`relative overflow-hidden p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isVoted
                    ? 'border-amber-400 bg-amber-500/20 text-white font-bold'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 text-slate-200'
                }`}
              >
                {/* Background vote progress bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 opacity-20 pointer-events-none ${
                    isVoted ? 'bg-amber-400' : 'bg-sky-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black font-mono">{choice}</span>
                    {isVoted && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-300">{pct}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="rounded-2xl bg-[#0f172a] border border-slate-800 p-3.5 space-y-2 shadow-sm"
          >
            {/* User row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={msg.userAvatar}
                  alt={msg.userName}
                  className="w-7 h-7 rounded-full object-cover border border-slate-700"
                />
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  {msg.userName}
                  {msg.isVerifiedTipster && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      กูรู xG
                    </span>
                  )}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{msg.time}</span>
            </div>

            {/* Message Body */}
            <p className="text-xs text-slate-200 leading-relaxed">{msg.text}</p>

            {/* Attached Match Tip Card */}
            {msg.tipShare && (
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-blue-900/30 via-slate-900 to-blue-900/30 border border-sky-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400">{msg.tipShare.matchTitle}</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-sm font-black text-white font-mono">
                      สกอร์ฟันธง: {msg.tipShare.score}
                    </span>
                    <span className="text-xs font-bold text-amber-400 font-mono">
                      ค่าน้ำ 1xBet @{msg.tipShare.odds}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/40">
                    ความมั่นใจ {msg.tipShare.confidence}%
                  </span>
                </div>
              </div>
            )}

            {/* Reactions bar */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onReactMessage(msg.id, 'fire')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] text-slate-300 transition-colors cursor-pointer"
              >
                <span>🔥</span>
                <span className="font-mono text-[10px]">{msg.reactions.fire}</span>
              </button>

              <button
                onClick={() => onReactMessage(msg.id, 'target')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] text-slate-300 transition-colors cursor-pointer"
              >
                <span>🎯</span>
                <span className="font-mono text-[10px]">{msg.reactions.target}</span>
              </button>

              <button
                onClick={() => onReactMessage(msg.id, 'ball')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] text-slate-300 transition-colors cursor-pointer"
              >
                <span>⚽</span>
                <span className="font-mono text-[10px]">{msg.reactions.ball}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Chat Input Box */}
      <div className="fixed bottom-16 left-0 right-0 z-30 p-3 bg-[#0d1424]/95 backdrop-blur-md border-t border-slate-800">
        <form onSubmit={handleSend} className="max-w-md mx-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="พิมพ์แสดงความคิดเห็น หรือแลกเปลี่ยนทัศนะ..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-40 disabled:hover:bg-blue-600 active:scale-95 shrink-0 cursor-pointer shadow-md shadow-blue-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Share Tip Modal */}
      {showTipModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0f172a] border border-slate-800 p-4 space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span>แชร์ทีเด็ดสกอร์เข้าสู่กระดานสด</span>
            </h3>

            {/* Select Match */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">เลือกคู่แข่งขัน</label>
              <select
                value={selectedMatchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none"
              >
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.homeTeam.name} vs {m.awayTeam.name} ({m.league})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Score */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">เลือกสกอร์ฟันธง</label>
              <div className="grid grid-cols-4 gap-1.5">
                {['2-1', '1-1', '2-0', '3-1', '2-2', '1-0', '3-2', '0-0'].map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setSelectedScore(sc)}
                    className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedScore === sc
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowTipModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleShareTipSubmit}
                className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all active:scale-95 shadow-md shadow-sky-500/20 cursor-pointer"
              >
                โพสต์ทีเด็ด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
