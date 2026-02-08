'use client';

import { useEffect, useRef, useState } from 'react';
import { Game } from 'phaser';
import config from '@/src/config';
import { socket } from '../network/socket';


let game: Game | null = null;

const PhaserGame = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [showWheel, setShowWheel] = useState(false);

  useEffect(() => {
    (window as any).isEmoteWheelOpen = showWheel;
  }, [showWheel]);

  useEffect(() => {
    if (isJoined && gameRef.current && !game) {
      config.parent = gameRef.current;
      game = new Game(config);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ') {
        setShowWheel(prev => !prev);
      }
      if (e.code === 'Escape') {
        setShowWheel(false);
      }
    };

    if (isJoined) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (game) {
        game.destroy(true);
        game = null;
      }
    };
  }, [isJoined]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    socket.emit("SET_NAME", { name: playerName.trim() });
    setIsJoined(true);
  };

  const handleAction = (type: string, value: string) => {
    if (type === 'emote') {
      socket.emit("EMOTE", { type: value });
    } else if (type === 'dance') {
      socket.emit("DANCE", { type: value });
    } else if (type === 'stop') {
      socket.emit("STOP_DANCE");
    }
    setShowWheel(false);
  };

  if (!isJoined) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden bg-[#0a0b1e]">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />

          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />
        </div>

        <form
          onSubmit={handleJoin}
          className="relative bg-white/5 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-white/10 w-full max-w-md transform transition-all duration-700 ease-out"
        >
          {/* Decorative Brackets */}
          <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-blue-500/50 rounded-tl-xl" />
          <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-blue-500/50 rounded-tr-xl" />
          <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-blue-500/50 rounded-bl-xl" />
          <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-blue-500/50 rounded-br-xl" />

          {/* Header Area */}
          <div className="text-center mb-10">
            <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] ml-1">
                System Initializing...
              </span>
            </div>
            <h1 className="text-5xl font-black text-white italic tracking-tighter">
              SIGNAL<span className="text-blue-500">.</span>IO
            </h1>
            <p className="text-slate-400 text-sm mt-2 font-medium opacity-60">
              TRANSPOSE YOUR CONSCIOUSNESS
            </p>
          </div>

          <div className="space-y-6">
            <div className="group relative">
              <label htmlFor="name" className="block text-[10px] font-bold text-blue-400/70 mb-2 ml-4 uppercase tracking-[0.2em]">
                IDENTIFICATION TAG
              </label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="User_01"
                  maxLength={16}
                  autoFocus
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/60 transition-all duration-300 text-lg font-mono tracking-wider"
                />
                {/* Glowing line under input */}
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-blue-500 transition-all duration-500 ${playerName ? 'w-[90%] opacity-100 shadow-[0_0_15px_#3b82f6]' : 'w-0 opacity-0'}`} />
              </div>
            </div>

            <button
              type="submit"
              disabled={!playerName.trim()}
              className="group relative w-full overflow-hidden rounded-2xl p-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0a0b1e] disabled:opacity-30 transition-all duration-500"
            >
              <div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#3b82f6_0%,#1d4ed8_50%,#3b82f6_100%)] group-hover:bg-[conic-gradient(from_90deg_at_50%_50%,#60a5fa_0%,#3b82f6_50%,#60a5fa_100%)] opacity-100 transition-all duration-500" />

              <span className="relative flex h-full w-full items-center justify-center rounded-2xl bg-slate-900/90 group-hover:bg-slate-900/40 px-8 py-4 text-sm font-bold text-white transition-all duration-300 tracking-[0.2em] uppercase">
                ENTER SIMULATION
                <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>

          {/* Footer Diagnostic Info */}
          <div className="mt-10 flex justify-between items-center px-2">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 font-mono text-center">ENCRYPTION</span>
              <span className="text-[10px] text-blue-500/50 font-mono text-center">AES-256-GCM</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-slate-500 font-mono text-right">SIGNAL ID</span>
              <span className="text-[10px] text-blue-500/50 font-mono text-right">
                {socket.id?.slice(0, 8).toUpperCase() || 'SEARCHING...'}
              </span>
            </div>
          </div>
        </form>

        {/* Bottom Left Watermark */}
        <div className="absolute bottom-6 left-8 flex items-center space-x-3 opacity-30 select-none">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-white font-bold tracking-[0.4em] uppercase">V.1.04 PHASE_CORE</span>
        </div>
      </div>
    );
  }

  const actions = [
    { label: 'Wave', icon: '👋', type: 'emote', value: '👋' },
    { label: 'Heart', icon: '❤️', type: 'emote', value: '❤️' },
    { label: 'Laugh', icon: '😄', type: 'emote', value: '😄' },
    { label: 'Dance 1', icon: '💃', type: 'dance', value: 'dance1' },
    { label: 'Stop', icon: '🛑', type: 'stop', value: '' },
    { label: 'Shuffle', icon: '🕴️', type: 'dance', value: 'dance3' },
    { label: 'Spin', icon: '🌀', type: 'dance', value: 'dance2' },
    { label: 'Angry', icon: '😡', type: 'emote', value: '😡' },
  ];

  return (
    <div className="relative w-full h-full">
      <div ref={gameRef} className="w-full h-full" />

      {/* Emote Wheel Overlay */}
      {showWheel && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[4px] pointer-events-auto"
          onClick={() => setShowWheel(false)}
        >
          <div
            className="relative w-96 h-96 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Center Hub */}
            <div
              className="absolute w-24 h-24 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.6)] z-30 flex items-center justify-center overflow-hidden group cursor-pointer hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
              onClick={(e) => {
                e.stopPropagation();
                setShowWheel(false);
              }}
            >
              <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-blue-500/30 transition-colors" />
              <div className="text-white text-[10px] font-black tracking-[0.2em] uppercase animate-pulse text-center leading-tight">
                CLOSE<br /><span className="text-blue-400 opacity-60">ESC</span>
              </div>
            </div>

            {/* Wheel Items */}
            {actions.map((action, i) => {
              const angle = (i * 360) / actions.length;
              const radius = 130; // Increased radius for better spacing
              const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius;
              const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius;

              return (
                <button
                  key={i}
                  className="absolute p-5 rounded-3xl bg-white/10 hover:bg-white/30 border border-white/20 backdrop-blur-xl transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 hover:rotate-3 hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] group z-20"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log(`Action selected: ${action.label}`);
                    handleAction(action.type, action.value);
                  }}
                >
                  <div className="text-3xl mb-1 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{action.icon}</div>
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-blue-400 font-black opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap uppercase tracking-[0.2em] bg-black/60 px-2 py-0.5 rounded blur-none">
                    {action.label}
                  </div>

                  {/* Decorative glow ring */}
                  <div className="absolute inset-0 rounded-3xl border border-blue-500/0 group-hover:border-blue-500/50 group-hover:animate-ping opacity-0 group-hover:opacity-30 transition-all duration-500" />
                </button>
              );
            })}

            {/* Rotation Rings (Decorative Background) */}
            <div className="absolute w-[280px] h-[280px] border border-blue-500/20 rounded-full animate-[spin_20s_linear_infinite] opacity-40" />
            <div className="absolute w-[320px] h-[320px] border border-blue-500/10 rounded-full animate-[spin_30s_linear_infinite_reverse] opacity-20" />
            <div className="absolute w-[360px] h-[360px] border border-white/5 rounded-full opacity-10" />
          </div>

          <div className="absolute bottom-16 text-blue-400/40 font-black tracking-[0.5em] uppercase text-[10px] animate-pulse">
            Neural Interface Active // Select Sector
          </div>
        </div>
      )}

      {/* Control Hint */}
      {!showWheel && (
        <div className="absolute bottom-6 right-8 px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white/50 font-bold text-[10px] tracking-widest uppercase flex items-center gap-2">
          <div className="w-5 h-5 flex items-center justify-center bg-blue-500/40 rounded border border-blue-500/50 text-white">Q</div>
          Emote Wheel
        </div>
      )}
    </div>
  );
};

export default PhaserGame;