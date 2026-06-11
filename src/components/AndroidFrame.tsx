/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Signal, Wifi, Battery, Clock, Cpu, ArrowLeft, Square, Circle } from "lucide-react";

interface AndroidFrameProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onHomePress?: () => void;
  onBackPress?: () => void;
  tpuActive?: boolean;
}

export default function AndroidFrame({
  children,
  activeTab,
  onTabChange,
  onHomePress,
  onBackPress,
  tpuActive = false,
}: AndroidFrameProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setTime(`${hours}:${minutes} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000 * 30); // update every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[92vh] py-4 px-2 sm:px-6 select-none bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#312e81] font-sans">
      {/* Outer Phone Shell Wrapping */}
      <div className="relative w-full max-w-[430px] rounded-[52px] border-8 border-slate-900 bg-black shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col aspect-[9/19.5] ring-1 ring-white/10">
        
        {/* Physical Internal Speaker and Camera Punch Hole */}
        <div className="absolute top-0 inset-x-0 h-8 bg-black z-50 flex items-center justify-center">
          {/* Camera Punch */}
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-800 mr-4 shadow-inner"></div>
          {/* Speaker grill */}
          <div className="w-16 h-1 rounded-full bg-slate-900"></div>
        </div>

        {/* Physical Left-Side Buttons Mock */}
        <div className="absolute -left-[11px] top-28 w-[3px] h-12 bg-slate-800 rounded-l z-40"></div>
        <div className="absolute -left-[11px] top-44 w-[3px] h-20 bg-slate-800 rounded-l z-40"></div>
        {/* Physical Right-Side Power Button */}
        <div className="absolute -right-[11px] top-36 w-[3px] h-14 bg-slate-800 rounded-r z-40"></div>

        {/* Top Status Bar Inside Screen */}
        <div className="pt-8 px-5 pb-2 bg-white/5 backdrop-blur-md border-b border-white/5 flex items-center justify-between text-xs font-semibold text-slate-300 z-40 select-none">
          <div className="flex items-center gap-1">
            <span className="text-[10px] tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1 font-mono">
              <Cpu className={`w-3 h-3 ${tpuActive ? "animate-pulse text-indigo-300" : ""}`} />
              NNAPI TPU
            </span>
          </div>
          
          {/* Right Status Group */}
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] text-slate-200">{time}</span>
            <div className="flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-slate-300" />
              <Signal className="w-3.5 h-3.5 text-slate-300" />
              <div className="flex items-center gap-0.5 text-indigo-400">
                <Battery className="w-4 h-4" />
                <span className="text-[10px] font-mono font-medium">98%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Central Operating Screen Container */}
        <div className="flex-1 bg-slate-950/90 backdrop-blur-xl relative overflow-y-auto flex flex-col text-slate-100">
          {children}
        </div>

        {/* Bottom Hardware Navigation Bar (Android Drawer Mode) */}
        <div className="bg-white/5 backdrop-blur-md border-t border-white/5 h-14 flex items-center justify-around text-slate-400 px-8 z-40">
          <button
            id="android-nav-back"
            onClick={onBackPress}
            className="p-2 hover:bg-white/15 rounded-full transition-colors active:scale-90 text-slate-400 hover:text-indigo-300"
            aria-label="Back Button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <button
            id="android-nav-home"
            onClick={onHomePress}
            className="p-2 hover:bg-white/15 rounded-full transition-colors active:scale-90 text-slate-400 hover:text-indigo-400"
            aria-label="Home Button"
          >
            <Circle className="w-5 h-5 fill-current text-slate-400/30 hover:text-indigo-405/20" />
          </button>

          <button
            id="android-nav-recents"
            className="p-2 hover:bg-white/15 rounded-full transition-colors active:scale-90 text-slate-400 hover:text-indigo-300"
            aria-label="Recents Button"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
