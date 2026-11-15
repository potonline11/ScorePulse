import React, { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { MOCK_LIVE_STREAMS } from '../data/mockMatches';
import { Match, CorrectScorePrediction } from '../types/soccer';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Radio,
  Tv,
  Users,
  Plus,
  ReceiptText,
  Send,
  MessageSquare,
  Link,
  Sparkles,
  ExternalLink,
  Megaphone,
  ShieldCheck,
  Film,
  Activity,
  Copy,
  Check,
  RefreshCw,
  Info,
  CheckCircle2,
  Sliders,
  Star,
  ChevronRight,
  Flame,
  Search,
  Calendar,
  Layers,
  BarChart2,
  X,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface LiveStreamViewProps {
  matches: Match[];
  onAddToBetSlip: (match: Match, prediction: CorrectScorePrediction) => void;
  onOpenPromoModal?: () => void;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
}

// Sports Categories matching ดูบอลดูหนัง.com
const SPORTS_CATEGORIES = [
  { id: 'football', name: 'ฟุตบอล', icon: '⚽', count: 6, active: true },
  { id: 'basketball', name: 'บาสเกตบอล', icon: '🏀', count: 3 },
  { id: 'tennis', name: 'เทนนิส', icon: '🎾', count: 3 },
  { id: 'volleyball', name: 'วอลเลย์บอล', icon: '🏐', count: 2 },
  { id: 'other', name: 'อื่นๆ', icon: '🏆', count: 1 },
  { id: 'boxing', name: 'มวย', icon: '🥊', count: 2 },
  { id: 'snooker', name: 'สนุกเกอร์', icon: '🎱' },
  { id: 'badminton', name: 'แบดมินตัน', icon: '🏸' },
  { id: 'muaythai', name: 'มวยไทย', icon: '🥋' },
];

// Major Leagues list matching ดูบอลดูหนัง.com
const LEAGUE_FILTERS = [
  { id: 'all', name: 'ทุกลีก (ทั้งหมด)', icon: '🌍' },
  { id: 'ucl', name: 'ยูฟ่าแชมเปียนส์ลีก', icon: '🇪🇺' },
  { id: 'epl', name: 'พรีเมียร์ลีก อังกฤษ', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'laliga', name: 'ลาลีกา', icon: '🇪🇸' },
  { id: 'bundesliga', name: 'บุนเดสลีกา', icon: '🇩🇪' },
  { id: 'seriea', name: 'กัลโช่ เซเรีย อา', icon: '🇮🇹' },
  { id: 'ligue1', name: 'ลีกเอิง', icon: '🇫🇷' },
  { id: 'colombia', name: 'คาเตโกเรีย ปริเมรา A', icon: '🇨🇴' },
  { id: 'concacaf', name: 'คอนคาเคฟ เซ็นทรัล อเมริกา', icon: '🌎' },
  { id: 'india', name: 'อินเดียน บังคาลอร์ ซูเปอร์ ดิวิชั่น', icon: '🇮🇳' },
  { id: 'thailand', name: 'ไทยลีก 1', icon: '🇹🇭' },
];

export const LiveStreamView: React.FC<LiveStreamViewProps> = ({
  matches,
  onAddToBetSlip,
  onOpenPromoModal,
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string>(MOCK_LIVE_STREAMS[0].id);
  const [selectedServerIdx, setSelectedServerIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [showHud, setShowHud] = useState<boolean>(true);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [customStreamUrl, setCustomStreamUrl] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [activeCustomUrl, setActiveCustomUrl] = useState<string | null>(null);
  const [streamComment, setStreamComment] = useState<string>('');
  const [copiedPromo, setCopiedPromo] = useState<boolean>(false);
  const [videoBuffering, setVideoBuffering] = useState<boolean>(false);
  const [videoPlaying, setVideoPlaying] = useState<boolean>(false);
  const [activeAnalysisModal, setActiveAnalysisModal] = useState<any | null>(null);

  // Portal Navigation State (ดูบอลดูหนัง.com layout)
  const [activePortalTab, setActivePortalTab] = useState<'live' | 'analysis' | 'highlights'>('live');
  const [selectedDateTab, setSelectedDateTab] = useState<'today' | 'yesterday' | 'all'>('today');
  const [selectedFilterStatus, setSelectedFilterStatus] = useState<'ALL' | 'LIVE' | 'FAV'>('ALL');
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState<string>('all');
  const [favoriteMatchIds, setFavoriteMatchIds] = useState<string[]>(['stream-ucl-real', 'stream-ars-che']);

  const [streamChat, setStreamChat] = useState<Array<{ id: string; user: string; text: string; time: string; isVip?: boolean }>>([
    { id: 'sc-1', user: 'กูรูเอก_1xBet', text: 'มาดริดบุกหนักมาก สกอร์ 2-1 ค่าน้ำ 8.80 ลุ้นกินเต็มสดๆ!', time: '20:41', isVip: true },
    { id: 'sc-2', user: 'BallLover99', text: 'สตรีมคนเตะจริงคมชัดมาก 1080p 60fps ลื่นไหลในแอปเลย 👍', time: '20:42' },
    { id: 'sc-3', user: 'Somchai_VIP', text: 'เสียงเชียร์ในสนามกระหึ่มสุดๆ ใส่บิลสดเรียบร้อย 🔥', time: '20:43' },
  ]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const activeChannel = MOCK_LIVE_STREAMS.find((c) => c.id === selectedChannelId) || MOCK_LIVE_STREAMS[0];
  const matchedMatch = matches.find((m) => m.id === activeChannel.matchId) || matches[0];

  const currentSource = activeCustomUrl
    ? {
        label: 'Custom Stream (สัญญาณตรงที่ท่านใส่)',
        url: activeCustomUrl,
        type: (activeCustomUrl.includes('.m3u8') ? 'hls' : 'real_stream') as 'hls' | 'real_stream' | 'mp4',
        description: 'สัญญาณวิดีโอจาก URL ภายนอก',
      }
    : activeChannel.videoSources[selectedServerIdx] || activeChannel.videoSources[0];

  // Fullscreen listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // HLS and Direct Video Player Integration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const isHls = currentSource.type === 'hls' || currentSource.url.includes('.m3u8');

    if (isHls) {
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
        });
        hlsRef.current = hls;
        hls.loadSource(currentSource.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (isPlaying) {
            video.play().catch(() => {});
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentSource.url;
        if (isPlaying) {
          video.play().catch(() => {});
        }
      }
    } else {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.src = currentSource.url;
      if (isPlaying) {
        video.play().catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentSource.url, currentSource.type, isPlaying]);

  // Handle Audio activation and authentic stadium crowd roar
  const toggleAudio = () => {
    soundManager.playTap();
    if (!isAudioActive) {
      setIsAudioActive(true);
      soundManager.startStadiumAmbience(volume * 0.45);
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = volume;
      }
    } else {
      setIsAudioActive(false);
      soundManager.stopStadiumAmbience();
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
    }
  };

  const togglePlay = () => {
    soundManager.playTap();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          setVideoPlaying(true);
          if (isAudioActive) {
            soundManager.startStadiumAmbience(volume * 0.45);
          }
        }).catch(() => {});
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        setVideoPlaying(false);
        soundManager.stopStadiumAmbience();
      }
    } else {
      setIsPlaying(!isPlaying);
      if (isPlaying) {
        soundManager.stopStadiumAmbience();
      } else if (isAudioActive) {
        soundManager.startStadiumAmbience(volume * 0.45);
      }
    }
  };

  const toggleFullscreen = () => {
    soundManager.playTap();
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const spawnReaction = (emoji: string) => {
    soundManager.playTap();
    const newReaction: FloatingReaction = {
      id: `react-${Date.now()}-${Math.random()}`,
      emoji,
      x: 60 + Math.random() * 30,
    };
    setReactions((prev) => [...prev.slice(-12), newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2500);
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamComment.trim()) return;
    soundManager.playTap();
    setStreamChat((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        user: 'คุณ (ผู้ชม VIP)',
        text: streamComment.trim(),
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        isVip: true,
      },
    ]);
    setStreamComment('');
  };

  const handleApplyCustomUrl = () => {
    if (customStreamUrl.trim()) {
      soundManager.playTap();
      setActiveCustomUrl(customStreamUrl.trim());
      setShowCustomModal(false);
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playTap();
    setFavoriteMatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectStreamMatch = (streamId: string) => {
    soundManager.playTap();
    setSelectedChannelId(streamId);
    setSelectedServerIdx(0);
    setActiveCustomUrl(null);
    setIsPlaying(true);
    // Smooth scroll up to player
    playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleAddLiveOddsToSlip = (score: string, odds: number) => {
    soundManager.playTap();
    const [h, a] = score.split('-').map(Number);
    const pred: CorrectScorePrediction = {
      score,
      homeGoals: isNaN(h) ? 2 : h,
      awayGoals: isNaN(a) ? 1 : a,
      rawProbability: 14.5,
      calibratedProbability: 16.0,
      odds1xBet: odds,
      expectedValue: 18.5,
      isValueBet: true,
      rank: 1,
    };
    onAddToBetSlip(matchedMatch, pred);
  };

  const copyPromoCode = () => {
    soundManager.playTap();
    if (navigator.clipboard) {
      navigator.clipboard.writeText('SCORE95');
      setCopiedPromo(true);
      setTimeout(() => setCopiedPromo(false), 2500);
    }
  };

  // Filter matches based on Date tab, status, and league
  const filteredStreams = MOCK_LIVE_STREAMS.filter((stream) => {
    // 1. Date filter:
    if (selectedDateTab === 'today') {
      const isToday = stream.dateText.includes('30 ต.ค.') || stream.dateText.includes('วันนี้');
      if (!isToday) return false;
    } else if (selectedDateTab === 'yesterday') {
      const isYesterday = stream.dateText.includes('29 ต.ค.') || stream.dateText.includes('28 ต.ค.');
      if (!isYesterday) return false;
    }

    // 2. Status filter:
    if (selectedFilterStatus === 'LIVE' && stream.status !== 'LIVE') return false;
    if (selectedFilterStatus === 'FAV' && !favoriteMatchIds.includes(stream.id)) return false;

    // 3. League filter:
    if (selectedLeagueFilter !== 'all' && stream.leagueCode !== selectedLeagueFilter) return false;

    return true;
  });

  // Group filtered streams by league name for display
  const streamsByLeague = filteredStreams.reduce((acc, stream) => {
    const key = stream.league;
    if (!acc[key]) acc[key] = [];
    acc[key].push(stream);
    return acc;
  }, {} as Record<string, typeof MOCK_LIVE_STREAMS>);

  return (
    <div className="space-y-4 pb-28 text-white max-w-5xl mx-auto px-2 sm:px-4">
      {/* 1. Header Bar matching ดูบอลดูหนัง.com */}
      <div className="bg-[#0b1324] border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center font-black text-white shadow-md">
            ▶
          </div>
          <div>
            <span className="text-lg sm:text-xl font-black text-white tracking-wide">ดูบอลดูหนัง</span>
            <span className="text-[10px] text-amber-400 font-bold ml-1.5 px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
              x 1xBet ScorePulse
            </span>
          </div>
        </div>

        {/* Portal Nav tabs */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActivePortalTab('live')}
            className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activePortalTab === 'live'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-300 hover:text-white bg-slate-800/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>ดูบอลสด</span>
          </button>

          <button
            onClick={() => {
              setActivePortalTab('analysis');
              setActiveAnalysisModal(activeChannel);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activePortalTab === 'analysis'
                ? 'bg-sky-500 text-slate-950 font-black'
                : 'text-slate-300 hover:text-white bg-slate-800/60'
            }`}
          >
            วิเคราะห์บอล
          </button>

          <button
            onClick={() => {
              setActivePortalTab('highlights');
              setSelectedChannelId('stream-buriram');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activePortalTab === 'highlights'
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'text-slate-300 hover:text-white bg-slate-800/60'
            }`}
          >
            ไฮไลท์ฟุตบอล
          </button>

          <a
            href="https://t.me"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-full text-xs font-black bg-[#229ED9] hover:bg-[#1e8bc0] text-white flex items-center gap-1 shadow-sm transition-all"
          >
            <span>✈</span>
            <span>@DBDNFootball</span>
          </a>
        </div>
      </div>

      {/* 2. Hero Headline Banner from ดูบอลดูหนัง.com */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 p-4 rounded-2xl bg-gradient-to-r from-[#0d1627] via-[#0e2246] to-[#0d1627] border border-sky-500/30 shadow-md">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>หาลิงก์ดูบอลออนไลน์ รวมlink ให้คุณแล้ว</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            แหล่งรวมลิงก์ดูบอลออนไลน์ เว็บดูบอลออนไลน์ ที่ชัดและเยอะที่สุด ดูบอลไม่มีโฆษณาคั่น และไม่กระตุก รวมคู่ฟุตบอลดูผ่านเว็บบอลออนไลน์ทุกลีกดังเอาไว้หมดแล้ว คู่ไหนสด กดดูที่ <strong className="text-rose-400">LIVE</strong> ได้ทันที
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
              ✓ สัญญาณสดคนเตะจริง Full HD 1080p
            </span>
            <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium">
              ✓ ดีเลย์ต่ำ 0.8s
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
              ✓ เสียงพากย์และเสียงเชียร์ 360°
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between text-xs space-y-2">
          <div>
            <div className="font-bold text-amber-300 text-xs">
              ดูบอลดูหนัง ให้บริการ ดูบอลสด ดูบอลออนไลน์ ไฮไลท์ฟุตบอล
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-3">
              ดูบอลสด หาลิงก์ดูบอลออนไลน์ สะดวกผ่านคอมพิวเตอร์ แท็บเล็ต หรือมือถือ ตลอด 24 ชั่วโมง พร้อมระบบคำนวณ Correct Score xG อัจฉริยะใน 1xBet
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">รหัสโปรโมชั่น 1xBet:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-amber-400/40">
                SCORE95
              </span>
              <button
                onClick={copyPromoCode}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
              >
                {copiedPromo ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sports Category Icon Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SPORTS_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
              cat.active
                ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-sm">{cat.icon}</span>
            <span>{cat.name}</span>
            {cat.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  cat.active ? 'bg-white text-rose-600' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {cat.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 4. Tap-to-Unmute Banner if sound is muted */}
      {!isAudioActive && (
        <div
          onClick={toggleAudio}
          className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-sky-500/20 to-blue-500/20 border-2 border-amber-400/60 flex items-center justify-between gap-3 cursor-pointer shadow-lg animate-pulse hover:border-amber-400 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Volume2 className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-amber-300">
                แตะที่นี่เพื่อเปิดเสียงบรรยากาศในสนาม & เสียงพากย์สด 🔊
              </div>
              <div className="text-[11px] text-slate-300">
                เปิดระบบเสียงเชียร์แฟนบอลกระหึ่มรอบทิศทาง 360° และเสียงนกหวีดตัดสิน
              </div>
            </div>
          </div>
          <button className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow">
            เปิดเสียงสด
          </button>
        </div>
      )}

      {/* 5. Authentic Real Broadcast TV Video Player */}
      <div
        ref={playerContainerRef}
        className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.85)] aspect-video group"
      >
        {/* Direct Real Match Broadcast Video Player (Actual People / Match Broadcast) */}
        <div className="relative w-full h-full bg-black">
            <video
              ref={videoRef}
              src={currentSource.url}
              autoPlay
              playsInline
              preload="auto"
              loop
              muted={!isAudioActive}
              className="w-full h-full object-cover cursor-pointer"
              onClick={togglePlay}
              onWaiting={() => setVideoBuffering(true)}
              onPlaying={() => {
                setVideoBuffering(false);
                setVideoPlaying(true);
                setIsPlaying(true);
              }}
              onPause={() => {
                setVideoPlaying(false);
                setIsPlaying(false);
              }}
              onError={(e) => {
                console.warn('Video stream error, falling back to broadcast-1', e);
                if (videoRef.current && videoRef.current.src !== '/videos/match-broadcast-1.mp4') {
                  videoRef.current.src = '/videos/match-broadcast-1.mp4';
                  videoRef.current.play().catch(() => {});
                }
              }}
            />

            {/* Authentic Broadcast TV Watermark (beIN SPORTS 1 HD / MONOMAX / etc.) */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 pointer-events-none flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-white font-mono font-black text-[11px] tracking-wider shadow-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>{activeChannel.broadcastChannel || 'MONOMAX HD'}</span>
              </div>
            </div>

            {/* Authentic Broadcast TV Scorebug (Top-Left) */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none">
              <div className="flex items-center rounded-xl overflow-hidden bg-black/85 backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs font-mono">
                {/* Live Minute */}
                <div className="px-2.5 py-1.5 bg-rose-600 text-white font-black text-[11px] flex items-center gap-1">
                  <span>{activeChannel.matchMinute > 0 ? `${activeChannel.matchMinute}'` : 'LIVE'}</span>
                </div>
                {/* Home */}
                <div className="px-2 py-1.5 text-white font-bold text-[11px]">
                  {activeChannel.homeTeam.code}
                </div>
                {/* Score */}
                <div className="px-2.5 py-1.5 bg-slate-900 text-amber-300 font-black text-xs border-x border-slate-700">
                  {activeChannel.homeScore} - {activeChannel.awayScore}
                </div>
                {/* Away */}
                <div className="px-2 py-1.5 text-white font-bold text-[11px]">
                  {activeChannel.awayTeam.code}
                </div>
              </div>
            </div>

            {/* Direct In-App Stream Quality Badge */}
            <div className="absolute bottom-12 sm:bottom-14 left-3 z-10 flex items-center gap-2 pointer-events-none">
              <span className="px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-emerald-500/40 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>สัญญาณสด Official Match Feed • 1080p 60fps • สดจริงไม่กระตุก</span>
              </span>
            </div>

            {/* Tap to Play Big Button Overlay if paused */}
            {!videoPlaying && !videoBuffering && (
              <div
                onClick={() => {
                  soundManager.playTap();
                  if (videoRef.current) {
                    videoRef.current.play().then(() => {
                      setVideoPlaying(true);
                      setIsPlaying(true);
                    }).catch(() => {});
                  }
                }}
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 cursor-pointer z-20 group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-sky-500 to-emerald-400 hover:from-sky-400 hover:to-emerald-300 text-slate-950 flex items-center justify-center shadow-[0_0_35px_rgba(14,165,233,0.6)] transition-all group-hover:scale-110 active:scale-95">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-slate-950 ml-1" />
                </div>
                <div className="text-center px-4">
                  <div className="text-sm sm:text-base font-black text-white drop-shadow">
                    แตะเพื่อเริ่มถ่ายทอดสด (1080p 60fps)
                  </div>
                  <div className="text-xs text-sky-300 font-medium mt-0.5">
                    {activeChannel.title} • {activeChannel.league}
                  </div>
                </div>
              </div>
            )}

            {/* Buffering Indicator */}
            {videoBuffering && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 pointer-events-none z-20">
                <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                <span className="text-xs text-white font-bold">กำลังเชื่อมต่อสัญญาณภาพสด 1080p 60fps...</span>
              </div>
            )}
          </div>

        {/* Floating Animated Reaction Sprites */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {reactions.map((r) => (
            <div
              key={r.id}
              className="absolute text-3xl animate-floatUp pointer-events-none drop-shadow-lg"
              style={{ left: `${r.x}%`, bottom: '15%' }}
            >
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Reaction Buttons Floating on Right Edge */}
        <div className="absolute right-3 bottom-14 z-20 flex flex-col gap-1.5">
          <button
            onClick={() => spawnReaction('⚽')}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-slate-700 flex items-center justify-center text-sm transition-transform active:scale-125 cursor-pointer shadow-lg"
            title="กดส่งเสียงเชียร์ ⚽"
          >
            ⚽
          </button>
          <button
            onClick={() => spawnReaction('🔥')}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-slate-700 flex items-center justify-center text-sm transition-transform active:scale-125 cursor-pointer shadow-lg"
            title="กดส่งไฟลุก 🔥"
          >
            🔥
          </button>
          <button
            onClick={() => spawnReaction('🎯')}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-slate-700 flex items-center justify-center text-sm transition-transform active:scale-125 cursor-pointer shadow-lg"
            title="กดส่งเป้าหมาย 🎯"
          >
            🎯
          </button>
          <button
            onClick={() => spawnReaction('👏')}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-slate-700 flex items-center justify-center text-sm transition-transform active:scale-125 cursor-pointer shadow-lg"
            title="กดส่งเสียงปรบมือ 👏"
          >
            👏
          </button>
        </div>

        {/* Bottom Video Controls Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={toggleAudio}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                isAudioActive ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {isAudioActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
              <span className="text-[10px] hidden sm:inline">
                {isAudioActive ? 'เสียงสนาม 360° เปิดอยู่' : 'แตะเปิดเสียง'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 border border-slate-700 text-[10px] text-slate-300">
              <Users className="w-3 h-3 text-sky-400" />
              <span className="font-mono font-bold text-white">{activeChannel.viewersCount.toLocaleString()}</span>
              <span>คนกำลังดู</span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
              title="เต็มจอ"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 6. Live Channel Controller & Direct Match Switcher (No Fake Decorative Servers) */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0c162d] to-slate-900 border border-emerald-500/30 space-y-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-extrabold text-white text-sm">
              ช่องถ่ายทอดสดสัญญาณตรง (Verified Live Feed)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
              ✓ ภาพนักเตะจริง 100% ไม่มีเซิร์ฟเวอร์ประดับ
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">ช่องสัญญาณ:</span>
            <span className="font-bold text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-amber-400/30">
              {activeChannel.broadcastChannel || 'MONOMAX HD'}
            </span>
            <span className="text-slate-400 hidden sm:inline">• สด Full HD 1080p 60fps</span>
          </div>
        </div>

        {/* Quick Match Channel Switcher Pills */}
        <div>
          <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-sky-400" />
              <span>สลับคู่ถ่ายทอดสด (คู่บอลจริง):</span>
            </span>
            <span className="text-[10px] text-slate-400">แตะเพื่อเปลี่ยนคู่ถ่ายทอดสดทันที</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {MOCK_LIVE_STREAMS.slice(0, 3).map((stream) => {
              const isSelected = selectedChannelId === stream.id && !activeCustomUrl;
              return (
                <button
                  key={stream.id}
                  onClick={() => handleSelectStreamMatch(stream.id)}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/30 ring-2 ring-rose-400/50'
                      : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-black truncate">
                      <span className={`w-2 h-2 rounded-full ${stream.status === 'LIVE' ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
                      <span className="truncate">{stream.homeTeam.code} vs {stream.awayTeam.code}</span>
                    </div>
                    <div className="text-[10px] opacity-80 truncate mt-0.5">
                      {stream.league.split(' ')[0]} • {stream.status === 'LIVE' ? `${stream.matchMinute}' Live` : stream.kickoffTime}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-lg font-black shrink-0 ${isSelected ? 'bg-white text-rose-600' : 'bg-slate-700 text-slate-300'}`}>
                    {isSelected ? 'กำลังดู' : 'ดูคู่นี้ ▶'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Stream URL / 1xBet link */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-emerald-400">● สัญญาณสดเสถียร</span>
            <span>ใส่ลิงก์ถ่ายทอดสด M3U8 หรือ IPTV เพื่อรับชมผ่านแอปได้ทันที</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundManager.playTap();
                setShowCustomModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Link className="w-3.5 h-3.5" />
              <span>+ ใส่ลิงก์สตรีม M3U8 ส่วนตัว</span>
            </button>
            <a
              href="https://1xbet.com/th/live/football"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 font-bold flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิด 1xBet Live ตรง</span>
            </a>
          </div>
        </div>
      </div>

      {/* 7. Match Directory Section Matching ดูบอลดูหนัง.com Screenshot */}
      <div className="space-y-3 pt-2">
        {/* Date Tabs & Status Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Date Selector Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                soundManager.playTap();
                setSelectedDateTab('today');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                selectedDateTab === 'today'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              30 ต.ค. (วันนี้)
            </button>
            <button
              onClick={() => {
                soundManager.playTap();
                setSelectedDateTab('yesterday');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                selectedDateTab === 'yesterday'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              29 ต.ค. (เมื่อวาน)
            </button>
            <button
              onClick={() => {
                soundManager.playTap();
                setSelectedDateTab('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                selectedDateTab === 'all'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ทุกลีก/ทุกวัน
            </button>
          </div>

          {/* Sub Filters: ทั้งหมด / Live / รายการโปรด */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                soundManager.playTap();
                setSelectedFilterStatus('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                selectedFilterStatus === 'ALL'
                  ? 'bg-rose-600 text-white font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => {
                soundManager.playTap();
                setSelectedFilterStatus('LIVE');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedFilterStatus === 'LIVE'
                  ? 'bg-rose-600 text-white font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              <span>Live</span>
            </button>
            <button
              onClick={() => {
                soundManager.playTap();
                setSelectedFilterStatus('FAV');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedFilterStatus === 'FAV'
                  ? 'bg-amber-400 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>รายการโปรด ({favoriteMatchIds.length})</span>
            </button>
          </div>
        </div>

        {/* League Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {LEAGUE_FILTERS.map((lg) => (
            <button
              key={lg.id}
              onClick={() => {
                soundManager.playTap();
                setSelectedLeagueFilter(lg.id);
              }}
              className={`px-3 py-1.5 rounded-xl shrink-0 font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedLeagueFilter === lg.id
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>{lg.icon}</span>
              <span>{lg.name}</span>
            </button>
          ))}
        </div>

        {/* Fixtures List Grouped By League Header */}
        <div className="space-y-4">
          {Object.keys(streamsByLeague).length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-3xl">⚽</span>
              <div className="text-sm font-bold text-white">ไม่พบคู่ถ่ายทอดสดในเงื่อนไขนี้</div>
              <p className="text-xs text-slate-400">ลองสลับวันหรือเลือกตัวกรอง "ทั้งหมด" เพื่อรับชมคู่ที่กำลังแข่ง</p>
            </div>
          ) : (
            Object.entries(streamsByLeague).map(([leagueName, leagueMatches]) => (
              <div key={leagueName} className="rounded-2xl overflow-hidden border border-slate-800 bg-[#0d1627]/90 shadow-md">
                {/* League Header with "วิเคราะห์บอล ||" Button */}
                <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">
                      ⚽
                    </div>
                    <span className="font-extrabold text-sm text-white tracking-wide">{leagueName}</span>
                  </div>

                  <button
                    onClick={() => {
                      soundManager.playTap();
                      setActiveAnalysisModal(leagueMatches[0]);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>วิเคราะห์บอล ||</span>
                  </button>
                </div>

                {/* Fixture Rows inside this league */}
                <div className="divide-y divide-slate-800/80">
                  {leagueMatches.map((item) => {
                    const isCurrentPlaying = item.id === selectedChannelId;
                    const isFav = favoriteMatchIds.includes(item.id);
                    const isLive = item.status === 'LIVE';

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectStreamMatch(item.id)}
                        className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isCurrentPlaying
                            ? 'bg-blue-950/40 border-l-4 border-l-sky-400'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        {/* Star & Time Badge */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <button
                            onClick={(e) => toggleFavorite(item.id, e)}
                            className="text-slate-500 hover:text-amber-400 p-1 cursor-pointer"
                            title="บันทึกเป็นคู่โปรด"
                          >
                            <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>

                          <div
                            className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black shadow-sm ${
                              isLive
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {isLive ? `${item.matchMinute}' LIVE` : item.kickoffTime}
                          </div>
                        </div>

                        {/* Match Teams & Live Score */}
                        <div className="flex-1 min-w-0 flex items-center justify-between sm:justify-start sm:gap-6">
                          <div className="space-y-1 min-w-0">
                            {/* Home */}
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.homeTeam.color }} />
                              <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px] sm:max-w-none">
                                {item.homeTeam.name}
                              </span>
                              {isLive && (
                                <span className="font-mono font-black text-amber-300 text-xs ml-auto sm:ml-2">
                                  {item.homeScore}
                                </span>
                              )}
                            </div>

                            {/* Away */}
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.awayTeam.color }} />
                              <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px] sm:max-w-none">
                                {item.awayTeam.name}
                              </span>
                              {isLive && (
                                <span className="font-mono font-black text-amber-300 text-xs ml-auto sm:ml-2">
                                  {item.awayScore}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* In-Play AI Tip Badge */}
                          {item.aiTip && (
                            <div className="hidden md:flex flex-col items-start bg-slate-900/80 px-2.5 py-1 rounded-xl border border-sky-500/20 text-[10px]">
                              <span className="text-slate-400">โพยเต็ง 1xBet:</span>
                              <span className="font-mono font-black text-amber-300">
                                {item.aiTip.score} (@{item.aiTip.odds.toFixed(2)})
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Red/Dark Pill Button */}
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => handleSelectStreamMatch(item.id)}
                            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                              isLive
                                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            }`}
                          >
                            <span>ดูบอลสด</span>
                            {isLive ? <span>Live</span> : <span>{item.kickoffTime}</span>}
                            <span>▶</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 8. Live In-Play Betting & Chat Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
        {/* Box 1: In-play betting odds widget */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0d1627] to-[#121c33] border border-sky-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white">ค่าน้ำสด 1xBet ระหว่างดูบอล (Live In-Play)</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              ค่าน้ำไหลสด Real-Time
            </span>
          </div>

          {activeChannel.inPlayOdds ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <button
                  onClick={() => handleAddLiveOddsToSlip('Next Goal: Home', activeChannel.inPlayOdds!.nextGoalHome)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-400 text-left cursor-pointer transition-all"
                >
                  <div className="text-[10px] text-slate-400">{activeChannel.homeTeam.code} ยิงลูกถัดไป</div>
                  <div className="font-mono font-black text-amber-400 text-sm mt-0.5">
                    @{activeChannel.inPlayOdds.nextGoalHome.toFixed(2)}
                  </div>
                </button>

                <button
                  onClick={() => handleAddLiveOddsToSlip('No More Goals', activeChannel.inPlayOdds!.noMoreGoals)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-400 text-left cursor-pointer transition-all"
                >
                  <div className="text-[10px] text-slate-400">ไม่มีประตูเพิ่ม</div>
                  <div className="font-mono font-black text-slate-300 text-sm mt-0.5">
                    @{activeChannel.inPlayOdds.noMoreGoals.toFixed(2)}
                  </div>
                </button>

                <button
                  onClick={() => handleAddLiveOddsToSlip('Next Goal: Away', activeChannel.inPlayOdds!.nextGoalAway)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-400 text-left cursor-pointer transition-all"
                >
                  <div className="text-[10px] text-slate-400">{activeChannel.awayTeam.code} ยิงลูกถัดไป</div>
                  <div className="font-mono font-black text-amber-400 text-sm mt-0.5">
                    @{activeChannel.inPlayOdds.nextGoalAway.toFixed(2)}
                  </div>
                </button>
              </div>

              {/* Best Value Correct Score Live */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-amber-300 font-bold">สกอร์เต็ง 1xBet คู่นี้ (Dixon-Coles AI)</div>
                  <div className="font-mono font-black text-white text-base mt-0.5">
                    สกอร์ {activeChannel.inPlayOdds.favCorrectScore} &middot;{' '}
                    <span className="text-amber-400">@{activeChannel.inPlayOdds.favCorrectScoreOdds.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleAddLiveOddsToSlip(
                      activeChannel.inPlayOdds!.favCorrectScore,
                      activeChannel.inPlayOdds!.favCorrectScoreOdds
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>ใส่บิล 1xBet</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 p-2">ค่าน้ำสดจะเปิดทันทีเมื่อเริ่มการแข่งขัน</div>
          )}
        </div>

        {/* Box 2: Stream Live Chat */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span>แชตสดห้องถ่ายทอด</span>
            </span>
            <span className="text-[10px] text-slate-400">คุยสดร่วมกับคอบอลคนอื่น</span>
          </div>

          <div className="overflow-y-auto space-y-2 py-2 text-xs flex-1 pr-1">
            {streamChat.map((m) => (
              <div key={m.id} className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className={`font-bold ${m.isVip ? 'text-amber-300' : 'text-sky-300'}`}>
                    {m.user} {m.isVip && '⭐'}
                  </span>
                  <span className="text-slate-500">{m.time}</span>
                </div>
                <p className="text-slate-200 text-[11px]">{m.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendComment} className="pt-2 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={streamComment}
              onChange={(e) => setStreamComment(e.target.value)}
              placeholder="พิมพ์ข้อความเชียร์สด..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Match Analysis Pop-Up Modal */}
      {activeAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[#0f172a] border border-sky-500/40 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-sky-400" />
                <h3 className="font-extrabold text-sm text-white">วิเคราะห์บอล: {activeAnalysisModal.title}</h3>
              </div>
              <button
                onClick={() => setActiveAnalysisModal(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-bold">{activeAnalysisModal.homeTeam.name}</span>
                <span className="text-amber-400 font-mono font-bold">vs</span>
                <span className="font-bold">{activeAnalysisModal.awayTeam.name}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                ลีก: <strong className="text-white">{activeAnalysisModal.league}</strong> &middot; เวลา: {activeAnalysisModal.kickoffTime}
              </div>
            </div>

            {activeAnalysisModal.aiTip && (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-950/60 to-slate-900 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                    <span>🎯</span>
                    <span>ฟันธงสกอร์แม่นยำ (Top Correct Score):</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-black">
                    {activeAnalysisModal.aiTip.ev}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-mono font-black text-lg">
                    สกอร์ {activeAnalysisModal.aiTip.score}
                  </span>
                  <span className="text-amber-400 font-mono font-bold">
                    ค่าน้ำ 1xBet: @{activeAnalysisModal.aiTip.odds.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-slate-800">
                  {activeAnalysisModal.aiTip.analysis}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedChannelId(activeAnalysisModal.id);
                  setActiveAnalysisModal(null);
                  playerContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <span>รับชมถ่ายทอดสดคู่นี้ทันที</span>
                <span>▶</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Stream URL Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[#0f172a] border border-sky-500/40 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>ตัวปรับแต่งและดึงสัญญาณสด (Live Stream Tuner)</span>
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400">เลือกสลับช่องถ่ายทอดสดคนเตะจริง (Official Match Streams):</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    handleSelectStreamMatch('stream-everton-newcastle');
                    setShowCustomModal(false);
                    soundManager.playTap();
                  }}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-sky-400 text-left transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>⚽</span>
                    <span>Everton vs Newcastle (02:45 น.)</span>
                  </div>
                  <div className="text-[10px] text-slate-400">คาราบาว คัพ รอบ 4 • MONOMAX HD คนเตะจริง</div>
                </button>

                <button
                  onClick={() => {
                    handleSelectStreamMatch('stream-mancity-brighton');
                    setShowCustomModal(false);
                    soundManager.playTap();
                  }}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-sky-400 text-left transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <span>🏆</span>
                    <span>Man City vs Brighton (2-2 จุดโทษ 4-3)</span>
                  </div>
                  <div className="text-[10px] text-slate-400">รีเพลย์แมตช์เต็ม คาราบาว คัพ • คนเตะจริง</div>
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <label className="text-[11px] font-bold text-slate-300">
                หรือใส่ลิงก์สตรีมสดตรงของท่าน (HLS .m3u8 หรือ .mp4):
              </label>
              <input
                type="text"
                value={customStreamUrl}
                onChange={(e) => setCustomStreamUrl(e.target.value)}
                placeholder="https://domain.com/live/stream.m3u8 หรือ .mp4"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-400"
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleApplyCustomUrl}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md"
                >
                  ดึงสัญญาณสตรีมมาเล่นทันที
                </button>
                {activeCustomUrl && (
                  <button
                    onClick={() => {
                      setActiveCustomUrl(null);
                      setCustomStreamUrl('');
                      setShowCustomModal(false);
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer"
                  >
                    คืนค่าเซิร์ฟเวอร์หลัก
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
