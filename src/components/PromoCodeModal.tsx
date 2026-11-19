import React, { useState, useEffect } from 'react';
import {
  Gift,
  Copy,
  Check,
  X,
  HelpCircle,
  Ticket,
  AlertTriangle,
  CheckCircle2,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export const PROMO_STORAGE_KEY = 'scorepulse_promo_config_v1';

export interface PromoConfigState {
  promoCode: string;
  partnerLink: string;
  customBookingCode: string;
  isConfigured: boolean;
}

interface PromoCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingCode?: string;
  activeMatchTitle?: string;
  activeScore?: string;
  activeOdds?: number;
  onConfigUpdated?: (cfg: PromoConfigState) => void;
}

export const PromoCodeModal: React.FC<PromoCodeModalProps> = ({
  isOpen,
  onClose,
  bookingCode = '1X-FRATUR-15',
  activeMatchTitle = 'คู่เอกประจำวัน',
  activeScore = '2-0',
  activeOdds = 7.1,
  onConfigUpdated,
}) => {
  const [copiedPromo, setCopiedPromo] = useState<boolean>(false);
  const [copiedBooking, setCopiedBooking] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'promo' | 'booking'>('promo');

  const [promoCodeInput, setPromoCodeInput] = useState<string>('SCORE95');
  const [partnerLinkInput, setPartnerLinkInput] = useState<string>('');
  const [customBookingInput, setCustomBookingInput] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSaveMessage(null);

    const loadPromo = async () => {
      try {
        const res = await fetch('/api/promo/config');
        if (res.ok) {
          const data: PromoConfigState = await res.json();
          setPromoCodeInput(data.promoCode || 'SCORE95');
          setPartnerLinkInput(data.partnerLink || '');
          setCustomBookingInput(data.customBookingCode || '');
          setIsConfigured(Boolean(data.isConfigured));
          return;
        }
      } catch {
        // fallback to localStorage
      }

      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(PROMO_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            setPromoCodeInput(parsed.promoCode || 'SCORE95');
            setPartnerLinkInput(parsed.partnerLink || '');
            setCustomBookingInput(parsed.customBookingCode || '');
            setIsConfigured(Boolean(parsed.isConfigured));
          }
        } catch {
          // ignore
        }
      }
    };

    loadPromo();
  }, [isOpen]);

  if (!isOpen) return null;

  const displayBookingCode = customBookingInput.trim() || bookingCode;
  const hasRealBookingCode = Boolean(customBookingInput.trim());

  const handleCopyPromo = () => {
    soundManager.playTap();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(promoCodeInput.trim() || 'SCORE95');
      setCopiedPromo(true);
      setTimeout(() => setCopiedPromo(false), 2500);
    }
  };

  const handleCopyBooking = () => {
    soundManager.playTap();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(displayBookingCode);
      setCopiedBooking(true);
      setTimeout(() => setCopiedBooking(false), 2500);
    }
  };

  const handleSaveConfig = async () => {
    soundManager.playTap();
    setIsSaving(true);
    setSaveMessage(null);

    const nextPayload = {
      promoCode: promoCodeInput.trim().toUpperCase() || 'SCORE95',
      partnerLink: partnerLinkInput.trim(),
      customBookingCode: customBookingInput.trim().toUpperCase(),
    };

    try {
      const res = await fetch('/api/promo/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextPayload),
      });
      const data = await res.json();
      const finalCfg: PromoConfigState = data.config || {
        ...nextPayload,
        isConfigured: nextPayload.promoCode !== 'SCORE95',
      };

      setPromoCodeInput(finalCfg.promoCode);
      setPartnerLinkInput(finalCfg.partnerLink);
      setCustomBookingInput(finalCfg.customBookingCode);
      setIsConfigured(finalCfg.isConfigured);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(finalCfg));
        window.dispatchEvent(new Event('scorepulse-promo-updated'));
      }

      soundManager.playGoalAlert();
      setSaveMessage('✅ บันทึกรหัส 1xBet จริงเข้าสู่ระบบเรียบร้อยแล้ว!');
      onConfigUpdated?.(finalCfg);
    } catch {
      const fallbackCfg: PromoConfigState = {
        ...nextPayload,
        isConfigured: nextPayload.promoCode !== 'SCORE95',
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(fallbackCfg));
        window.dispatchEvent(new Event('scorepulse-promo-updated'));
      }
      setIsConfigured(fallbackCfg.isConfigured);
      setSaveMessage('✅ บันทึกลงเบราว์เซอร์เรียบร้อยแล้ว');
      onConfigUpdated?.(fallbackCfg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0b0f19] border border-amber-500/40 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-950/60 via-[#131d33] to-slate-900 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20">
              <Gift className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>ตั้งค่ารหัสโปรโมชั่น &amp; คูปอง 1xBet จริง</span>
              </h2>
              <p className="text-[11px] text-amber-300">
                วิธีเชื่อมรหัสจาก 1xBet Partners ให้ใช้งานได้จริง 100%
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-2 bg-[#0d1424] border-b border-slate-800 gap-2">
          <button
            onClick={() => {
              soundManager.playTap();
              setActiveTab('promo');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'promo'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>1. รหัสโปรโมชั่น 1xBet</span>
          </button>

          <button
            onClick={() => {
              soundManager.playTap();
              setActiveTab('booking');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'booking'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>2. รหัสคูปอง &amp; วิธีแทง</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* TAB 1: PROMO CODE FOR BONUS */}
          {activeTab === 'promo' && (
            <div className="space-y-4">
              {/* Honest Warning if still placeholder */}
              {!isConfigured ? (
                <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-[11px] flex items-start gap-2 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-300">
                      ทำไมรหัสเริ่มต้น &ldquo;SCORE95&rdquo; จึงยังใช้ในเว็บ 1xBet จริงไม่ได้:
                    </strong>
                    <span>
                      รหัสโปรโมชั่นของ 1xBet ต้องถูกสร้างจากระบบ <strong>1xBet Partners (Affiliate)</strong> ของ 1xBet เองเท่านั้นจึงจะได้รับอนุมัติโบนัส 130% เมื่อนำไปกรอกจริง — หากพี่สมัครพาร์ทเนอร์แล้ว สามารถนำรหัสจริงมาบันทึกด้านล่างเพื่อใช้แทนได้ทันทีครับ
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    เชื่อมต่อรหัส Partner ที่ตั้งค่าไว้แล้ว (<strong>{promoCodeInput}</strong>)
                  </span>
                </div>
              )}

              <div className="rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/30 border border-amber-500/30 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/30">
                      {isConfigured ? 'รหัส Partner ที่ตั้งค่าไว้' : 'รหัสตัวอย่างเริ่มต้น (ยังไม่ผูก Partner)'}
                    </span>
                    <h3 className="text-sm font-black text-white mt-1">
                      รหัสโปรโมชั่นต้อนรับ 1xBet
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      isConfigured
                        ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40'
                        : 'text-amber-300 bg-amber-950/80 border-amber-500/40'
                    }`}
                  >
                    {isConfigured ? 'Partner Active' : 'รอใส่รหัสจริง'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 bg-slate-950 border-2 border-amber-400/70 rounded-xl px-4 py-2.5 font-mono font-black text-amber-300 text-lg tracking-widest text-center select-all shadow-inner">
                    {promoCodeInput || 'SCORE95'}
                  </div>

                  <button
                    onClick={handleCopyPromo}
                    className="flex items-center gap-1 px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-md shadow-amber-400/20 cursor-pointer shrink-0"
                  >
                    {copiedPromo ? (
                      <>
                        <Check className="w-4 h-4 text-slate-950" />
                        <span>คัดลอกแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>คัดลอก</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Real Partner Configuration Form */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span>ตั้งค่ารหัสโปรโมชั่นจริงจาก 1xBet Partners ของคุณ:</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-slate-300 font-bold block mb-1">
                      รหัสโปรโมชั่นจริง (จากเมนู Promo Codes ใน 1xBet Partners):
                    </label>
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder="เช่น 1x_123456 หรือรหัสที่ขออนุมัติแล้ว"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold text-xs focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 font-bold block mb-1">
                      ลิงก์สมัคร Affiliate จริง (ถ้ามี):
                    </label>
                    <input
                      type="url"
                      value={partnerLinkInput}
                      onChange={(e) => setPartnerLinkInput(e.target.value)}
                      placeholder="https://refpa... (เว้นว่างได้)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 font-mono text-xs focus:border-amber-400 outline-none"
                    />
                  </div>

                  {saveMessage && (
                    <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-[11px]">
                      {saveMessage}
                    </div>
                  )}

                  <button
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all cursor-pointer active:scale-95"
                  >
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกรหัสโปรโมชั่นจริงลงในแอป'}
                  </button>
                </div>

                {/* How to actually obtain a working 1xBet Promo Code */}
                <div className="pt-2 border-t border-slate-800 space-y-2 text-[11px] text-slate-300">
                  <div className="font-bold text-sky-300">ขั้นตอนทำให้มีรหัสโปรโมชั่นใช้งานได้จริงบน 1xBet:</div>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>
                      สมัครบัญชีตัวแทนฟรีที่ <strong>1xBet Partners</strong> (<code>1xbetaffiliates.com</code>)
                    </li>
                    <li>
                      เข้าไปที่เมนู <strong>Marketing Tools &rarr; Promo Codes</strong> แล้วกดสร้าง Promo Code ของตัวเอง (หรือติดต่อผู้จัดการ Partner เปิดสิทธิ์โบนัส 130%)
                    </li>
                    <li>
                      นำรหัสจริงที่ได้มากรอกในช่องด้านบนแล้วกดบันทึก — รหัสจะถูกนำไปแสดงในแอปและส่งใช้งานได้จริง (ใช้ได้เฉพาะตอน <strong>สมัครบัญชีใหม่</strong> เท่านั้น บัญชีที่สมัครไปแล้วใส่ซ้ำไม่ได้)
                    </li>
                  </ol>
                  {partnerLinkInput && (
                    <a
                      href={partnerLinkInput}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-bold underline mt-1"
                    >
                      <span>เปิดลิงก์สมัคร Partner ที่ตั้งค่าไว้</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOOKING CODE FOR MATCHES */}
          {activeTab === 'booking' && (
            <div className="space-y-4">
              {!hasRealBookingCode && (
                <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-[11px] flex items-start gap-2 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-300">
                      ข้อเท็จจริงเรื่อง &ldquo;รหัสจองคูปอง ({bookingCode})&rdquo;:
                    </strong>
                    <span>
                      1xBet ไม่มี API เปิดให้แอปภายนอกสร้างรหัสโหลดบิลแทนได้ครับ รหัสคูปองจริง (เช่น <code>A9K2M</code>) จะสร้างได้เฉพาะตอนกด <strong>“บันทึกคูปองเดิมพัน” บนเว็บ/แอป 1xBet โดยตรง</strong> — ส่วนรหัส <code>{bookingCode}</code> เป็นรหัสอ้างอิงภายในแอปนี้เท่านั้น
                    </span>
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-blue-950/40 border border-sky-500/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/30">
                      {hasRealBookingCode ? 'รหัสคูปอง 1xBet จริงวันนี้' : 'รหัสอ้างอิงในระบบ ScorePulse'}
                    </span>
                    <h3 className="text-sm font-black text-white mt-1">
                      {activeMatchTitle} &bull; {/^\d+-\d+$/.test(activeScore) ? `สกอร์ ${activeScore}` : activeScore} (@{activeOdds.toFixed(2)})
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 bg-slate-950 border-2 border-sky-400/70 rounded-xl px-4 py-2.5 font-mono font-black text-sky-300 text-lg tracking-widest text-center select-all shadow-inner">
                    {displayBookingCode}
                  </div>

                  <button
                    onClick={handleCopyBooking}
                    className="flex items-center gap-1 px-4 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-md shadow-sky-500/20 cursor-pointer shrink-0"
                  >
                    {copiedBooking ? (
                      <>
                        <Check className="w-4 h-4 text-slate-950" />
                        <span>คัดลอกแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>คัดลอก</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <label className="text-[11px] text-slate-300 font-bold block">
                    ใส่รหัส Booking Code จริงที่สร้างจากแอป 1xBet (ถ้ามี):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customBookingInput}
                      onChange={(e) => setCustomBookingInput(e.target.value.toUpperCase())}
                      placeholder="เช่น 8XK9M (เว้นว่างเพื่อใช้รหัสอ้างอิง)"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sky-300 font-mono font-bold text-xs focus:border-sky-400 outline-none"
                    />
                    <button
                      onClick={handleSaveConfig}
                      disabled={isSaving}
                      className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs cursor-pointer shrink-0"
                    >
                      บันทึก
                    </button>
                  </div>
                </div>
              </div>

              {/* Manual steps on 1xBet */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <HelpCircle className="w-4 h-4 text-sky-400" />
                  <span>วิธีกดวางบิลคู่เอกวันนี้ในแอป 1xBet โดยตรง (ไม่ต้องพึ่งรหัสจอง):</span>
                </div>

                <div className="space-y-2.5 text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <strong className="text-white">เปิดแอป/เว็บ 1xBet</strong> &rarr; ช่องค้นหาพิมพ์ชื่อคู่{' '}
                      <span className="font-mono text-sky-300 font-bold">{activeMatchTitle}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <strong className="text-white">
                        {/^\d+-\d+$/.test(activeScore)
                          ? 'เลื่อนหาหมวด “คะแนนที่ถูกต้อง (Correct Score)”'
                          : 'เลื่อนหาหมวด “แฮนดิแคปเอเชีย (Asian Handicap)”'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <strong className="text-white">
                        {/^\d+-\d+$/.test(activeScore)
                          ? `กดเลือกสกอร์ ${activeScore}`
                          : `กดเลือกต่อ/รอง ${activeScore}`}
                      </strong>{' '}
                      (ค่าน้ำประมาณ @{activeOdds.toFixed(2)}) แล้วใส่จำนวนเงินวางเดิมพันได้ทันที
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0d1424] border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">ScorePulse xG &bull; 1xBet Setup Guide</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer"
          >
            เข้าใจแล้ว &bull; ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
