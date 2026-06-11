/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Cpu } from "lucide-react";

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
  return (
    <div className="flex-1 flex flex-col w-full min-h-screen">
      {/* 
        Full-screen responsive container for natural mobile app styling on all devices.
      */}
      <div className="w-full bg-[#070913]/90 backdrop-blur-3xl flex flex-col min-h-screen transition-all">
        
        {/* Central Operating Screen Container */}
        <div className="flex-1 bg-slate-950/10 relative overflow-y-auto flex flex-col text-slate-100">
          {children}
        </div>

      </div>
    </div>
  );
}

