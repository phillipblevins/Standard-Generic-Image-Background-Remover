/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import AndroidFrame from "./components/AndroidFrame";
import EraserStage from "./components/EraserStage";
import DeviceGallery, { GalleryItem } from "./components/DeviceGallery";
import DeviceSettings from "./components/DeviceSettings";
import { Sparkles, Image as ImageIcon, Cpu, Settings } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"eraser" | "gallery" | "settings">("eraser");
  const [folderTarget, setFolderTarget] = useState("/Download/BackgroundRemover");
  const [modelSettings, setModelSettings] = useState({
    provider: "nnapi_tpu",
    precision: "uint8", // INT8 quantized (fastest offline model)
  });
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [tpuActive, setTpuActive] = useState(false);

  // Initialize Gallery from LocalData Storage
  useEffect(() => {
    try {
      const storedNew = localStorage.getItem("birefnet_gallery_items");
      const storedOld = localStorage.getItem("rmbg_gallery_items");
      const stored = storedNew || storedOld;
      if (stored) {
        setGalleryItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Local Storage parsing failed", e);
    }
  }, []);

  // Save changes to Gallery
  const saveToGallery = (imageDataUrl: string, fileName: string) => {
    // Generate simulated size KB
    const simulatedSize = Math.round(imageDataUrl.length * 0.75 / 1024);

    const newItem: GalleryItem = {
      id: Math.random().toString(36).substring(2, 9),
      url: imageDataUrl,
      fileName,
      timestamp: new Date().toISOString(),
      folder: folderTarget,
      sizeKb: simulatedSize,
    };

    const updated = [newItem, ...galleryItems];
    setGalleryItems(updated);
    try {
      localStorage.setItem("birefnet_gallery_items", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to persist data item", err);
    }
  };

  const deleteFromGallery = (id: string) => {
    const updated = galleryItems.filter((i) => i.id !== id);
    setGalleryItems(updated);
    try {
      localStorage.setItem("birefnet_gallery_items", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to update database on delete", err);
    }
  };

  const clearAllGallery = () => {
    setGalleryItems([]);
    try {
      localStorage.removeItem("birefnet_gallery_items");
      localStorage.removeItem("rmbg_gallery_items");
    } catch (err) {
      console.error("Failed to wipe database", err);
    }
  };

  // Nav flows
  const handleHomePress = () => {
    setActiveTab("eraser");
  };

  const handleBackPress = () => {
    if (activeTab !== "eraser") {
      setActiveTab("eraser");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0f1d] via-[#080a13] to-[#1e1a38] flex flex-col justify-between selection:bg-indigo-500/35 selection:text-indigo-200">
      
      {/* 3D Physical Smartphone layout container */}
      <AndroidFrame
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
        onHomePress={handleHomePress}
        onBackPress={handleBackPress}
        tpuActive={tpuActive}
      >
        <div className="flex-1 flex flex-col justify-between">
          
          {/* Main Display screen router switch */}
          {activeTab === "eraser" && (
            <EraserStage
              onSaveToDevice={saveToGallery}
              folderTarget={folderTarget}
              modelSettings={modelSettings}
              setTpuActive={setTpuActive}
            />
          )}

          {activeTab === "gallery" && (
            <DeviceGallery
              items={galleryItems}
              onDeleteItem={deleteFromGallery}
              folderTarget={folderTarget}
            />
          )}

          {activeTab === "settings" && (
            <DeviceSettings
              folderTarget={folderTarget}
              setFolderTarget={setFolderTarget}
              modelSettings={modelSettings}
              setModelSettings={setModelSettings}
              onClearGallery={clearAllGallery}
            />
          )}

          {/* Android Material You Bottom Navigation Bar */}
          <div className="bg-white/5 border-t border-white/10 backdrop-blur-lg py-2.5 px-3 flex justify-around select-none shrink-0 z-40">
            
            {/* Eraser Stage Nav Icon */}
            <button
              id="android-tab-eraser"
              onClick={() => setActiveTab("eraser")}
              className="flex flex-col items-center gap-1 flex-1 relative cursor-pointer"
            >
              <div className={`px-5 py-1 rounded-full transition-all relative ${
                activeTab === "eraser" 
                  ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-105" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}>
                <Sparkles className="w-4.5 h-4.5" />
                {activeTab === "eraser" && (
                  <span className="absolute inset-x-0 bottom-0.5 h-0.5 bg-indigo-400 rounded-full scale-50" />
                )}
              </div>
              <span className={`text-[9.5px] font-bold tracking-wide transition-colors ${
                activeTab === "eraser" ? "text-indigo-400" : "text-slate-500"
              }`}>
                Remover
              </span>
            </button>

            {/* Gallery Nav Icon */}
            <button
              id="android-tab-gallery"
              onClick={() => setActiveTab("gallery")}
              className="flex flex-col items-center gap-1 flex-1 relative cursor-pointer"
            >
              <div className={`px-5 py-1 rounded-full transition-all relative ${
                activeTab === "gallery" 
                  ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-105" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}>
                <ImageIcon className="w-4.5 h-4.5" />
              </div>
              <span className={`text-[9.5px] font-bold tracking-wide transition-colors ${
                activeTab === "gallery" ? "text-indigo-400" : "text-slate-500"
              }`}>
                Gallery
              </span>
            </button>

            {/* Hardware/Folders Nav Icon */}
            <button
              id="android-tab-settings"
              onClick={() => setActiveTab("settings")}
              className="flex flex-col items-center gap-1 flex-1 relative cursor-pointer"
            >
              <div className={`px-5 py-1 rounded-full transition-all relative ${
                activeTab === "settings" 
                  ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-105" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}>
                <Settings className="w-4.5 h-4.5" />
              </div>
              <span className={`text-[9.5px] font-bold tracking-wide transition-colors ${
                activeTab === "settings" ? "text-indigo-400" : "text-slate-500"
              }`}>
                Settings
              </span>
            </button>

          </div>

        </div>
      </AndroidFrame>

      {/* Aesthetic outer footer branding - Simple, humble, clean */}
      <div className="bg-slate-950/40 backdrop-blur-md py-3.5 border-t border-white/5 text-center select-none shrink-0">
        <span className="font-sans text-[10px] tracking-wide text-slate-500 uppercase">
          Neural API offline background removal utility
        </span>
      </div>

    </div>
  );
}
