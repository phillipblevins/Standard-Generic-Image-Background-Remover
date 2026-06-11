/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Folder, Trash2, Calendar, Share2, Clipboard, Image as ImageIcon, ExternalLink, HardDrive } from "lucide-react";

export interface GalleryItem {
  id: string;
  url: string;
  fileName: string;
  timestamp: string;
  folder: string;
  sizeKb: number;
}

interface DeviceGalleryProps {
  items: GalleryItem[];
  onDeleteItem: (id: string) => void;
  folderTarget: string;
}

export default function DeviceGallery({ items, onDeleteItem, folderTarget }: DeviceGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const handleShareSimulate = (item: GalleryItem) => {
    const textToCopy = `file://storage/emulated/0${folderTarget}/${item.fileName}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="flex flex-col flex-1 p-4 font-sans" id="device-gallery">
      {/* Detail Showcase Lightbox Overlay */}
      {selectedItem && (
        <div className="absolute inset-0 bg-[#0a0c14]/98 backdrop-blur-xl z-50 flex flex-col p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              {new Date(selectedItem.timestamp).toLocaleString()}
            </span>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-xs bg-white/5 border border-white/10 hover:bg-white/15 text-slate-300 font-bold px-3 py-1 rounded-lg cursor-pointer"
            >
              Close PREVIEW
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center bg-slate-900/50 rounded-3xl p-4 border border-white/10 relative overflow-hidden mb-4">
            {/* Checkerboard backdrop */}
            <div className="absolute inset-0 select-none bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
            <img
              src={selectedItem.url}
              alt={selectedItem.fileName}
              className="max-h-full max-w-full rounded-xl object-contain drop-shadow-xl z-10"
            />
          </div>

          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-2">
            <div className="text-xs text-slate-300 font-semibold break-all flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{selectedItem.fileName}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono bg-black/20 p-2.5 rounded-xl border border-white/5">
              <div>SIZE: {selectedItem.sizeKb} KB</div>
              <div>ENGINE: BiRefNet Lit (ONNX)</div>
              <div>PATH: ..{selectedItem.folder}</div>
              <div>PROVIDER: Android NNAPI TPU</div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleShareSimulate(selectedItem)}
                className="flex-1 bg-white/5 border border-white/5 text-slate-300 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 hover:text-indigo-400 transition-colors"
              >
                <Clipboard className="w-4 h-4" />
                {copiedText ? "Path Copied!" : "Copy Local Link"}
              </button>
              
              <button
                onClick={() => {
                  onDeleteItem(selectedItem.id);
                  setSelectedItem(null);
                }}
                className="flex-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-rose-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Gallery Grid */}
      <div className="flex items-center justify-between mb-3.5 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
            Android Gallery
            <span className="text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full text-indigo-400 font-bold">
              {items.length} file{items.length !== 1 ? "s" : ""}
            </span>
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          Target: ..{folderTarget}
        </span>
      </div>

      {/* Empty Gallery fallbacks */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
            <ImageIcon className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="text-sm font-semibold text-slate-300 mb-1">No Processed Images Found</h3>
          <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
            Your saved PNG assets will accumulate and store here.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto max-h-[500px] pb-4">
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <div
                id={`gallery-item-${item.id}`}
                key={item.id}
                className="bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-md flex flex-col group relative"
              >
                {/* Visual content box */}
                <div 
                  onClick={() => setSelectedItem(item)}
                  className="bg-black/10 aspect-square flex items-center justify-center p-2 relative overflow-hidden cursor-pointer group-hover:opacity-90"
                >
                  <div className="absolute inset-0 select-none bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px] opacity-40"></div>
                  <img
                    src={item.url}
                    alt={item.fileName}
                    className="max-h-full max-w-full rounded-lg object-contain drop-shadow-md z-10"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md p-1.5 z-20 flex justify-between items-center text-[8.5px] font-mono text-slate-300">
                    <span>{item.sizeKb} KB</span>
                    <span className="text-[7.5px] text-indigo-400 font-bold uppercase">TPU OK</span>
                  </div>
                </div>

                {/* Info and fast action toolbar */}
                <div className="p-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-300 font-semibold truncate bg-transparent">
                  <div className="truncate flex-1 pr-1 text-slate-200">{item.fileName}</div>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="text-rose-500 hover:text-rose-450 p-1 rounded-md transition-colors cursor-pointer"
                    title="Delete item"
                    aria-label="Delete gallery item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
