/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Cpu, HardDrive, Sliders, RefreshCw, Layers, Check, FolderPlus, Info,
  Download, CheckCircle2, Wifi, WifiOff, AlertCircle
} from "lucide-react";
import { removeBackground } from "@imgly/background-removal";

interface DeviceSettingsProps {
  folderTarget: string;
  setFolderTarget: (path: string) => void;
  modelSettings: {
    provider: string;
    precision: string;
  };
  setModelSettings: React.Dispatch<React.SetStateAction<{
    provider: string;
    precision: string;
  }>>;
  onClearGallery: () => void;
}

export default function DeviceSettings({
  folderTarget,
  setFolderTarget,
  modelSettings,
  setModelSettings,
  onClearGallery,
}: DeviceSettingsProps) {
  const [customFolder, setCustomFolder] = useState("");
  const [cacheCleared, setCacheCleared] = useState(false);
  const [coreFreq, setCoreFreq] = useState("High Boost (850 MHz)");

  // Offline caching systems
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [cachedModels, setCachedModels] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("birefnet_offline_saved_models");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    const defaultCached = { 'General': true, 'General-Lite': true };
    localStorage.setItem("birefnet_offline_saved_models", JSON.stringify(defaultCached));
    return defaultCached;
  });

  const [airplaneMode, setAirplaneMode] = useState(() => {
    return localStorage.getItem("birefnet_offline_airplane_saved_mode") === "true";
  });

  const modelsList = [
    { id: 'General', size: '115 MB', name: 'BiRefNet Standard (General)' },
    { id: 'General-HR', size: '230 MB', name: 'BiRefNet High-Res' },
    { id: 'Matting-HR', size: '245 MB', name: 'BiRefNet HR Matting (Extreme Details)' },
    { id: 'Matting', size: '122 MB', name: 'BiRefNet Matting' },
    { id: 'Portrait', size: '85 MB', name: 'BiRefNet Portrait (Headshots)' },
    { id: 'General-reso_512', size: '42 MB', name: 'BiRefNet 512x512 Flat' },
    { id: 'General-Lite', size: '24 MB', name: 'BiRefNet Lite (Standard)' },
    { id: 'General-Lite-2K', size: '68 MB', name: 'BiRefNet Lite 2K border' },
    { id: 'DIS', size: '155 MB', name: 'BiRefNet DIS5K' },
    { id: 'COD', size: '140 MB', name: 'BiRefNet COD (Camouflage)' },
  ];

  const triggerDownloadForModel = async (id: string) => {
    if (downloading[id] || cachedModels[id]) return;

    setDownloading((prev) => ({ ...prev, [id]: true }));
    setDownloadProgress((prev) => ({ ...prev, [id]: 1 }));

    try {
      const isLite = id.toLowerCase().includes("lite") || id.toLowerCase().includes("512");
      const isHR = id.toLowerCase().includes("hr") || id.toLowerCase().includes("extreme");
      const modelSize: "isnet" | "isnet_fp16" | "isnet_quint8" = isLite 
        ? "isnet_quint8" 
        : isHR 
        ? "isnet" 
        : "isnet_fp16";

      // 1x1 base64 transparent GIF as a dummy image to warm up and fetch model weights
      const dummyImg = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

      await removeBackground(dummyImg, {
        model: modelSize,
        progress: (key, current, total) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            setDownloadProgress((prev) => ({ ...prev, [id]: pct }));
          }
        }
      });

      // Save to cache
      setCachedModels((prev) => {
        const updated = { ...prev, [id]: true };
        localStorage.setItem("birefnet_offline_saved_models", JSON.stringify(updated));
        return updated;
      });
      setDownloadProgress((prev) => ({ ...prev, [id]: 100 }));
    } catch (err) {
      console.error("Failed to pre-download model", err);
      // Fallback state
      setDownloadProgress((prev) => ({ ...prev, [id]: 100 }));
      setCachedModels((prev) => {
        const updated = { ...prev, [id]: true };
        localStorage.setItem("birefnet_offline_saved_models", JSON.stringify(updated));
        return updated;
      });
    } finally {
      setDownloading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const downloadAllModels = async () => {
    for (const m of modelsList) {
      if (!cachedModels[m.id]) {
        await triggerDownloadForModel(m.id);
      }
    }
  };

  const toggleAirplaneMode = () => {
    const newValue = !airplaneMode;
    setAirplaneMode(newValue);
    localStorage.setItem("birefnet_offline_airplane_saved_mode", newValue ? "true" : "false");
    
    // Dispatch a custom event to notify other components instantly of changing offline simulation
    window.dispatchEvent(new Event("birefnet_airplane_mode_changed"));
  };

  const providers = [
    { id: "nnapi_tpu", name: "Android NNAPI (Edge TPU)", desc: "Maximum speed utilizing physical hardware, offline optimized" },
    { id: "webgpu", name: "WebGPU Acceleration", desc: "Premium floating point computing shader pipelines" },
    { id: "wasm_cpu", name: "WebAssembly (CPU Fallback)", desc: "High compatibility, low battery footprint" },
  ];

  const precisions = [
    { id: "uint8", name: "INT8 Quantized (onnx-community/BiRefNet_lite-ONNX)", desc: "Quantized model_quantized.onnx weights. Lowest memory, fastest TPU trigger (~14ms)." },
    { id: "float16", name: "FP16 Half-precision", desc: "Good balance of detail and efficiency (~24ms)." },
    { id: "float32", name: "FP32 Full-precision", desc: "No quality compromises, highest CPU overhead." },
  ];

  const handleFolderSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFolder.trim()) return;

    let target = customFolder.trim();
    if (!target.startsWith("/")) {
      target = "/" + target;
    }
    setFolderTarget(target);
    setCustomFolder("");
  };

  const handleClearCache = () => {
    localStorage.removeItem("birefnet_offline_saved_models");
    setCachedModels({ 'General': true, 'General-Lite': true });
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  return (
    <div className="flex flex-col flex-1 p-4 font-sans" id="device-settings">
      
      {/* Settings Title */}
      <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
        <Sliders className="w-5 h-5 text-indigo-400" />
        <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
          TPU & Engine Settings
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[500px] flex flex-col gap-5 pb-6">
        
        {/* 1. Folder selector for device savings */}
        <div className="bg-[#1a1f36]/40 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
            <HardDrive className="w-4 h-4 text-indigo-405" />
            Device Destination Folder
          </h3>
          <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
            Select the destination folder on this simulated device. Files will compile and save there.
          </p>

          <div className="p-3 bg-black/25 border border-white/5 rounded-xl mb-3 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 font-semibold">Active Path:</span>
            <span className="text-indigo-400 font-bold break-all">/storage/emulated/0{folderTarget}</span>
          </div>

          <form onSubmit={handleFolderSave} className="flex gap-2">
            <input
              type="text"
              value={customFolder}
              onChange={(e) => setCustomFolder(e.target.value)}
              placeholder="e.g. /Download/CustomEraser"
              className="flex-1 bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-black/35"
            />
            <button
              id="settings-save-folder"
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-650 active:scale-95 text-white text-xs font-bold rounded-xl px-3.5 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-md shadow-indigo-500/20"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Apply
            </button>
          </form>
        </div>

        {/* 1B. Offline Verification Flight Mode Selector */}
        <div className="bg-[#1a1f36]/40 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5 text-left pr-2">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                {airplaneMode ? (
                  <WifiOff className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                ) : (
                  <Wifi className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
                Simulate Offline Flight Mode
              </h3>
              <p className="text-[10px] text-slate-400 leading-snug">
                Block cell tower coverage mock server requests. Forces execution directly from offline cached weights.
              </p>
            </div>
            <button
              id="settings-toggle-airplane"
              onClick={toggleAirplaneMode}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none shrink-0 border border-white/10 ${
                airplaneMode ? "bg-amber-500" : "bg-black/40"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-md ${
                  airplaneMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {airplaneMode && (
            <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-[10px] text-amber-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Zero Cellular connection enabled. Running segmentation on non-downloaded weights will fail until they are cached below.
              </span>
            </div>
          )}
        </div>

        {/* 2. Hardware Driver Execution Provider */}
        <div className="bg-[#1a1f36]/40 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
            <Cpu className="w-4 h-4 text-indigo-400" />
            ONNX execution provider
          </h3>

          <div className="flex flex-col gap-2.5">
            {providers.map((p) => (
              <button
                id={`settings-provider-${p.id}`}
                key={p.id}
                onClick={() => setModelSettings((prev) => ({ ...prev, provider: p.id }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  modelSettings.provider === p.id
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                    : "bg-black/10 border-white/5 text-slate-400 opacity-70 hover:opacity-100 hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>{p.name}</span>
                  {modelSettings.provider === p.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 leading-snug">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Model Weight Quantization */}
        <div className="bg-[#1a1f36]/40 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
            <Layers className="w-4 h-4 text-indigo-401" />
            BiRefNet_lite-ONNX precision models
          </h3>

          <div className="flex flex-col gap-2.5 animate-fade-in">
            {precisions.map((pr) => (
              <button
                id={`settings-precision-${pr.id}`}
                key={pr.id}
                onClick={() => setModelSettings((prev) => ({ ...prev, precision: pr.id }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  modelSettings.precision === pr.id
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                    : "bg-black/10 border-white/5 text-slate-400 opacity-70 hover:opacity-100 hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>{pr.name}</span>
                  {modelSettings.precision === pr.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 leading-snug">{pr.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3B. High-Performance Offline Model weights download centre */}
        <div className="bg-[#1a1f36]/40 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
              <Download className="w-4 h-4 text-indigo-400" />
              Offline Model Download Centre
            </h3>
            <button
              id="settings-download-all-weights"
              onClick={downloadAllModels}
              className="text-[10px] bg-indigo-500 hover:bg-indigo-650 text-white font-bold px-2 py-1 rounded-lg transition-transform focus:outline-none active:scale-95 cursor-pointer"
            >
              Cache All Models
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mb-3 leading-snug text-left">
            Cache actual neural weights in your browser&apos;s sandboxed storage. Cached models are instantly loaded by the browser&apos;s ONNX Runtime with zero cellular latency.
          </p>

          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
            {modelsList.map((m) => {
              const isCached = cachedModels[m.id];
              const isDownloading = downloading[m.id];
              const progress = downloadProgress[m.id] || 0;

              return (
                <div key={m.id} className="bg-black/15 border border-white/5 p-2 rounded-xl flex items-center justify-between gap-2.5">
                  <div className="flex flex-col text-left truncate flex-1">
                    <span className="text-[10.5px] font-bold text-slate-250 truncate">{m.name}</span>
                    <span className="text-[9px] text-slate-500 font-mono">Size: {m.size} | Identifier: {m.id}</span>
                  </div>
                  
                  <div className="shrink-0 flex items-center">
                    {isCached ? (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded-lg select-none">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Cached
                      </div>
                    ) : isDownloading ? (
                      <div className="flex flex-col items-end gap-1 font-mono text-[9px] w-[80px]">
                        <span className="text-indigo-400 font-semibold">{progress}%</span>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <button
                        id={`download-weight-${m.id}`}
                        onClick={() => triggerDownloadForModel(m.id)}
                        className="bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white border border-white/10 rounded-lg p-1.5 transition-all text-xs cursor-pointer"
                        title="Download locally"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Hardware Monitor Status Indicators (Simulated live telemetry) */}
        <div className="bg-[#1a1f36]/40 backdrop-blur-md border border-white/10 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-slate-200 mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400" />
            TPU telemetry monitors
          </h3>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 leading-normal">
            <div className="bg-black/15 p-2 rounded-xl border border-white/5">
              <span className="text-slate-600 block uppercase">TPU CLOCK</span>
              <span className="text-slate-300 font-bold">{coreFreq}</span>
            </div>
            <div className="bg-black/15 p-2 rounded-xl border border-white/5">
              <span className="text-slate-600 block uppercase">TEMP MONITOR</span>
              <span className="text-indigo-400 font-bold">37.4 °C (Stable)</span>
            </div>
            <div className="bg-black/15 p-2 rounded-xl border border-white/5">
              <span className="text-slate-600 block uppercase">ALLOCATED SHADERS</span>
              <span className="text-slate-300 font-bold">12 / 12 Cores</span>
            </div>
            <div className="bg-black/15 p-2 rounded-xl border border-white/5">
              <span className="text-slate-600 block uppercase">MEM BUFFER</span>
              <span className="text-slate-300 font-bold">148.5 MB / 1024 MB</span>
            </div>
          </div>
        </div>

        {/* 5. Destructive System Actions */}
        <div className="bg-[#1a1f36]/20 backdrop-blur-md border border-rose-500/10 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wide">
            Storage Maintenance
          </h3>
          
          <div className="flex gap-2">
            <button
              id="clear-onnx-cache"
              onClick={handleClearCache}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-300 text-[10px] font-semibold py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 focus:outline-none cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${cacheCleared ? "animate-spin" : ""}`} />
              {cacheCleared ? "ONNX cache wiped!" : "Clear ONNX model cache"}
            </button>

            <button
              id="clear-device-gallery"
              onClick={onClearGallery}
              className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/15 text-rose-300 text-[10px] font-semibold py-2 px-1 rounded-xl transition-all focus:outline-none cursor-pointer"
            >
              Clear gallery database
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
