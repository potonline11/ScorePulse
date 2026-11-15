/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Match, CorrectScorePrediction, BetSlipItem, GoalAlert, ChatMessage } from './types/soccer';
import { INITIAL_MATCHES, INITIAL_CHAT_MESSAGES, SUPER_PICKS_LIST, getActiveDailyPickId } from './data/mockMatches';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { MobileFrameWrapper } from './components/MobileFrameWrapper';
import { GoalAlertToast } from './components/GoalAlertToast';
import { TipsView } from './views/TipsView';
import { LiveScoresView } from './views/LiveScoresView';
import { CalibrationLabView } from './views/CalibrationLabView';
import { CommunityView } from './views/CommunityView';
import { BetSlipView } from './views/BetSlipView';
import { MatchDetailModal } from './views/MatchDetailModal';
import { LiveStreamView } from './views/LiveStreamView';
import { AiChatDrawer } from './views/AiChatDrawer';
import { PromoCodeModal } from './components/PromoCodeModal';
import { LineNotificationModal } from './components/LineNotificationModal';
import { soundManager } from './utils/audio';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('tips');
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [activeGoalAlert, setActiveGoalAlert] = useState<GoalAlert | null>(null);
  const [selectedMatchModal, setSelectedMatchModal] = useState<Match | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState<boolean>(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState<boolean>(false);
  const [isLineModalOpen, setIsLineModalOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);

  // Sync sound manager setting
  useEffect(() => {
    soundManager.soundEnabled = soundEnabled;
  }, [soundEnabled]);

  // Periodic match minute ticker simulation for LIVE matches
  useEffect(() => {
    const timer = setInterval(() => {
      setMatches((prevMatches) =>
        prevMatches.map((m) => {
          if (m.status === 'LIVE' && m.minute !== undefined && m.minute < 90) {
            return {
              ...m,
              minute: m.minute + 1,
            };
          }
          return m;
        })
      );
    }, 12000); // Ticks every 12s in simulation

    return () => clearInterval(timer);
  }, []);

  // Handle Goal Simulation (Triggered by user or real-time event)
  const handleSimulateGoal = (matchId: string, scoringTeam: 'home' | 'away', player: string) => {
    setMatches((prevMatches) =>
      prevMatches.map((m) => {
        if (m.id === matchId) {
          const newHomeScore = scoringTeam === 'home' ? (m.homeScore || 0) + 1 : (m.homeScore || 0);
          const newAwayScore = scoringTeam === 'away' ? (m.awayScore || 0) + 1 : (m.awayScore || 0);
          const currentMinute = m.minute || 72;

          const newEvent = {
            id: `ev-${Date.now()}`,
            minute: currentMinute,
            type: 'GOAL' as const,
            team: scoringTeam,
            player,
            detail: `ทำประตูได้สำเร็จ! (xG: 0.52)`,
          };

          const newHomeXg = scoringTeam === 'home'
            ? Number((m.synthesizedXg.home + 0.52).toFixed(2))
            : m.synthesizedXg.home;
          const newAwayXg = scoringTeam === 'away'
            ? Number((m.synthesizedXg.away + 0.48).toFixed(2))
            : m.synthesizedXg.away;

          const teamName = scoringTeam === 'home' ? m.homeTeam.name : m.awayTeam.name;

          // Trigger Live Goal Alert Toast & Stadium Whistle
          setActiveGoalAlert({
            id: `alert-${Date.now()}`,
            matchId: m.id,
            league: m.league,
            homeTeam: m.homeTeam.name,
            awayTeam: m.awayTeam.name,
            scoringTeam,
            teamName,
            teamLogo: scoringTeam === 'home' ? m.homeTeam.logo : m.awayTeam.logo,
            player,
            minute: currentMinute,
            newScore: `${newHomeScore} - ${newAwayScore}`,
            timestamp: Date.now(),
          });

          return {
            ...m,
            homeScore: newHomeScore,
            awayScore: newAwayScore,
            synthesizedXg: { home: newHomeXg, away: newAwayXg },
            events: [newEvent, ...m.events],
          };
        }
        return m;
      })
    );
  };

  // Add Correct Score prediction to 1xBet Bet Slip
  const handleAddToBetSlip = (match: Match, prediction: CorrectScorePrediction) => {
    const newItem: BetSlipItem = {
      id: `slip-${match.id}-${prediction.score}-${Date.now()}`,
      matchId: match.id,
      matchTitle: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      league: match.league,
      betType: 'CORRECT_SCORE',
      selection: `Correct Score ${prediction.score}`,
      odds: prediction.odds1xBet,
      stake: 200,
      potentialReturn: Math.round(200 * prediction.odds1xBet),
      calibratedProb: prediction.calibratedProbability,
      isValueBet: prediction.isValueBet,
    };

    setBetSlip((prev) => {
      // Avoid duplicate exact selections
      const existing = prev.find(
        (it) => it.matchId === match.id && it.selection === newItem.selection
      );
      if (existing) return prev;
      return [newItem, ...prev];
    });
  };

  // Add custom score from Calibration Lab
  const handleAddCustomScoreToBetSlip = (matchTitle: string, prediction: CorrectScorePrediction) => {
    const newItem: BetSlipItem = {
      id: `slip-custom-${Date.now()}`,
      matchId: 'custom',
      matchTitle,
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      league: 'xG Lab Custom Match',
      betType: 'CORRECT_SCORE',
      selection: `Correct Score ${prediction.score}`,
      odds: prediction.odds1xBet,
      stake: 200,
      potentialReturn: Math.round(200 * prediction.odds1xBet),
      calibratedProb: prediction.calibratedProbability,
      isValueBet: prediction.isValueBet,
    };

    setBetSlip((prev) => [newItem, ...prev]);
  };

  const handleRemoveBetSlipItem = (id: string) => {
    setBetSlip((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClearBetSlip = () => {
    setBetSlip([]);
  };

  const handleUpdateStake = (id: string, stake: number) => {
    setBetSlip((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              stake,
              potentialReturn: Math.round(stake * it.odds),
            }
          : it
      )
    );
  };

  // Community Messages
  const handleSendChatMessage = (text: string, tipShare?: ChatMessage['tipShare']) => {
    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      userId: 'user-me',
      userName: 'คอบอล 1xBet (คุณ)',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&auto=format&fit=crop&q=80',
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      text,
      tipShare,
      reactions: { fire: 0, ball: 0, target: 0, claps: 0 },
    };

    setChatMessages((prev) => [newMsg, ...prev]);
  };

  const handleReactChatMessage = (
    messageId: string,
    reaction: 'fire' | 'ball' | 'target' | 'claps'
  ) => {
    soundManager.playTap();
    setChatMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            reactions: {
              ...msg.reactions,
              [reaction]: (msg.reactions[reaction] || 0) + 1,
            },
          };
        }
        return msg;
      })
    );
  };

  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const betSlipMatchIds = new Set(betSlip.map((b) => b.matchId));

  return (
    <MobileFrameWrapper isMobileFrame={isMobileFrame}>
      {/* Top Header */}
      <Header
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          soundManager.playTap();
          setSoundEnabled(!soundEnabled);
        }}
        isMobileFrame={isMobileFrame}
        onToggleMobileFrame={() => {
          soundManager.playTap();
          setIsMobileFrame(!isMobileFrame);
        }}
        betSlipCount={betSlip.length}
        onOpenBetSlip={() => setActiveTab('betslip')}
        onOpenAiChat={() => setIsAiChatOpen(true)}
        onOpenPromoModal={() => setIsPromoModalOpen(true)}
        onSelectSuperPick={() => {
          soundManager.playTap();
          setActiveTab('tips');
        }}
        onOpenLiveStream={() => {
          soundManager.playTap();
          setActiveTab('stream');
        }}
        onOpenLineModal={() => setIsLineModalOpen(true)}
      />

      {/* Main Content Body */}
      <main className="max-w-4xl mx-auto min-h-screen">
        {activeTab === 'tips' && (
          <TipsView
            matches={matches}
            onSelectMatch={(m) => setSelectedMatchModal(m)}
            onAddToBetSlip={handleAddToBetSlip}
            betSlipMatchIds={betSlipMatchIds}
            onOpenPromoModal={() => setIsPromoModalOpen(true)}
          />
        )}

        {activeTab === 'live' && (
          <LiveScoresView
            matches={matches}
            onSelectMatch={(m) => setSelectedMatchModal(m)}
            onSimulateGoal={handleSimulateGoal}
            onWatchStream={() => setActiveTab('stream')}
          />
        )}

        {activeTab === 'stream' && (
          <LiveStreamView
            matches={matches}
            onAddToBetSlip={handleAddToBetSlip}
            onOpenPromoModal={() => setIsPromoModalOpen(true)}
          />
        )}

        {activeTab === 'lab' && (
          <CalibrationLabView onAddToBetSlip={handleAddCustomScoreToBetSlip} />
        )}

        {activeTab === 'community' && (
          <CommunityView
            messages={chatMessages}
            matches={matches}
            onSendMessage={handleSendChatMessage}
            onReactMessage={handleReactChatMessage}
          />
        )}

        {activeTab === 'betslip' && (
          <BetSlipView
            items={betSlip}
            onRemoveItem={handleRemoveBetSlipItem}
            onClearAll={handleClearBetSlip}
            onUpdateStake={handleUpdateStake}
          />
        )}
      </main>

      {/* Goal Alert Toast with Confetti and Sound */}
      <GoalAlertToast
        alert={activeGoalAlert}
        onDismiss={() => setActiveGoalAlert(null)}
        onViewMatch={(matchId) => {
          const m = matches.find((it) => it.id === matchId);
          if (m) setSelectedMatchModal(m);
        }}
      />

      {/* Match Detail & 5x5 Heatmap Modal */}
      <MatchDetailModal
        match={selectedMatchModal}
        onClose={() => setSelectedMatchModal(null)}
        onAddToBetSlip={handleAddToBetSlip}
        betSlipMatchIds={betSlipMatchIds}
      />

      {/* AI Soccer Analyst Chat Drawer */}
      <AiChatDrawer
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        matchesContext={matches.map((m) => ({
          league: m.league,
          homeTeam: m.homeTeam.name,
          awayTeam: m.awayTeam.name,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          homeXg: m.synthesizedXg.home,
          awayXg: m.synthesizedXg.away,
          topPick: m.predictions[0]?.score,
        }))}
      />

      {/* 1xBet Promo Code and Booking Code Modal */}
      {(() => {
        const todayId = getActiveDailyPickId(new Date());
        const todayPick = SUPER_PICKS_LIST.find((p) => p.id === todayId) || SUPER_PICKS_LIST[0];
        return (
          <PromoCodeModal
            isOpen={isPromoModalOpen}
            onClose={() => setIsPromoModalOpen(false)}
            bookingCode={todayPick?.bookingCode1xBet || '1X-FRATUR-15'}
            activeMatchTitle={todayPick?.matchTitle}
            activeScore={todayPick?.primaryScore}
            activeOdds={todayPick?.primaryOdds}
          />
        );
      })()}

      {/* LINE Official Account Notification Modal */}
      <LineNotificationModal
        isOpen={isLineModalOpen}
        onClose={() => setIsLineModalOpen(false)}
      />

      {/* Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        betSlipCount={betSlip.length}
        liveMatchCount={liveMatches.length}
      />
    </MobileFrameWrapper>
  );
}
