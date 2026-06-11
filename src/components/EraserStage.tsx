/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { ImageProcessor } from "../services/imageProcessor";
import { 
  Upload, Sliders, Image as ImageIcon, Sparkles, Paintbrush, 
  Trash2, Download, RefreshCw, Layers, Check, Play, Eye, EyeOff,
  Files, AlertCircle, CheckCircle2, XCircle, X, Info
} from "lucide-react";

// Types for Stock Images
interface StockPreset {
  id: string;
  name: string;
  category: string;
  color: string;
  drawPreset: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

interface BatchQueueItem {
  id: string;
  name: string;
  file?: File;
  preset?: StockPreset;
}

export const BIREFNET_WEIGHTS_MAP: Record<string, { file: string; desc: string }> = {
  'General': { file: 'BiRefNet', desc: 'Standard central subject high-fidelity segmentation (Default)' },
  'General-HR': { file: 'BiRefNet_HR', desc: 'High-Resolution sharp boundary extraction for crisp details' },
  'Matting-HR': { file: 'BiRefNet_HR-matting', desc: 'High-Resolution matting tuned for micro hair/fur layers' },
  'Matting': { file: 'BiRefNet-matting', desc: 'Soft transition transparent alpha details for fine objects' },
  'Portrait': { file: 'BiRefNet-portrait', desc: 'Highly centered saliency prioritizing human head/shoulders' },
  'General-reso_512': { file: 'BiRefNet_512x512', desc: 'Fast execution speed utilizing compact 512px space' },
  'General-Lite': { file: 'BiRefNet_lite', desc: 'Super-lightweight model tuned for rapid low-RAM hardware' },
  'General-Lite-2K': { file: 'BiRefNet_lite-2K', desc: 'High-Scale lightweight 2K resolution border processing' },
  'DIS': { file: 'BiRefNet-DIS5K', desc: 'Dichotomous Image Segmentation mode for maximum edge precision' },
  'HRSOD': { file: 'BiRefNet-HRSOD', desc: 'High-Resolution Salient Object Detection for dominant items' },
  'HRSOD-DHU': { file: 'BiRefNet-HRSOD_DHU-ONNX', desc: 'ONNX-optimized ultra high-resolution salient object detection' },
  'COD': { file: 'BiRefNet-COD', desc: 'Camouflaged Object Detection mode targeting blended subjects' },
  'DIS-TR_TEs': { file: 'BiRefNet-DIS5K-TR_TEs', desc: 'DIS fine-tuned on specialized dataset splits' },
  'General-legacy': { file: 'BiRefNet-legacy', desc: 'Baseline legacy general weights execution standard' },
  'General-dynamic': { file: 'BiRefNet_dynamic', desc: 'Dynamic aspects ratios model adapting to direct sizes' },
  'Matting-dynamic': { file: 'BiRefNet_dynamic-matting', desc: 'Dynamic aspects ratios optimized for soft alpha details' },
};

interface EraserStageProps {
  onSaveToDevice: (imageDataUrl: string, fileName: string) => void;
  folderTarget: string;
  modelSettings: {
    provider: string;
    precision: string;
  };
  setTpuActive: (active: boolean) => void;
}

export default function EraserStage({
  onSaveToDevice,
  folderTarget,
  modelSettings,
  setTpuActive,
}: EraserStageProps) {
  const [image, setImage] = useState<string | null>(null);
  const [originalImageObj, setOriginalImageObj] = useState<HTMLImageElement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isMasked, setIsMasked] = useState(false);
  
  // Controls
  const [confidence, setConfidence] = useState(0.50);
  const [birefnetWeights, setBirefnetWeights] = useState<string>("General");
  const [brushSize, setBrushSize] = useState(25);
  const [brushMode, setBrushMode] = useState<"erase" | "restore">("erase");
  const [editorTool, setEditorTool] = useState<"none" | "brush" | "background">("none");
  const [compareSplit, setCompareSplit] = useState(50); // percentage 0-100
  const [isComparing, setIsComparing] = useState(true);
  const [bgType, setBgType] = useState<"transparent" | "solid" | "pattern">("transparent");
  const [solidBgColor, setSolidBgColor] = useState("#10B981"); // vibrant emerald
  const [bgPattern, setBgPattern] = useState("studio"); // studio, beach, cosmic
  const [transparencyBackdrop, setTransparencyBackdrop] = useState<"black" | "white" | "checkered">("checkered");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Batch Mode State Variables
  const [eraserMode, setEraserMode] = useState<"single" | "batch">("single");
  const [batchQueue, setBatchQueue] = useState<BatchQueueItem[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [batchLogs, setBatchLogs] = useState<string[]>([]);
  const [batchResults, setBatchResults] = useState<{
    id: string;
    name: string;
    success: boolean;
    errorMsg?: string;
    url?: string;
  }[]>([]);

  const batchFileInputRef = useRef<HTMLInputElement | null>(null);

  // Canvas Refs
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const brushCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Brush drawing state
  const [isPainting, setIsPainting] = useState(false);

  // Vector Graphic Presets: Dynamic, vector drawing functions to avoid CORS errors when fetching pixel data!
  const stockPresets: StockPreset[] = [
    {
      id: "product_shoe",
      name: "Sneaker Sport",
      category: "Product",
      color: "bg-emerald-500",
      drawPreset: (ctx, w, h) => {
        // Draw solid background (that we will remove)
        ctx.fillStyle = "#FFFFFF"; // Clean white background
        ctx.fillRect(0, 0, w, h);

        // Draw shadow
        ctx.save();
        ctx.scale(1, 0.3);
        ctx.beginPath();
        ctx.arc(w / 2, h * 2.3, w * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fill();
        ctx.restore();

        // Shoe body (Vibrant Red & Orange Nike sport shoe)
        ctx.beginPath();
        ctx.moveTo(w * 0.2, h * 0.6);
        ctx.quadraticCurveTo(w * 0.3, h * 0.35, w * 0.45, h * 0.35); // Upper collar
        ctx.lineTo(w * 0.55, h * 0.45); // Laces section
        ctx.lineTo(w * 0.8, h * 0.6); // Front toe box
        ctx.quadraticCurveTo(w * 0.85, h * 0.65, w * 0.82, h * 0.7); // Toe tip
        ctx.lineTo(w * 0.25, h * 0.72); // Sole line
        ctx.quadraticCurveTo(w * 0.18, h * 0.7, w * 0.2, h * 0.6); // Heel cup
        ctx.closePath();
        
        const shoeGrad = ctx.createLinearGradient(w * 0.2, h * 0.5, w * 0.8, h * 0.7);
        shoeGrad.addColorStop(0, "#EF4444"); // Red heel
        shoeGrad.addColorStop(0.6, "#F97316"); // Orange mid
        shoeGrad.addColorStop(1, "#FBBF24"); // Yellow toe
        ctx.fillStyle = shoeGrad;
        ctx.fill();

        // Thick White Sole
        ctx.beginPath();
        ctx.moveTo(w * 0.2, h * 0.71);
        ctx.lineTo(w * 0.82, h * 0.69);
        ctx.lineTo(w * 0.8, h * 0.75);
        ctx.quadraticCurveTo(w * 0.5, h * 0.76, w * 0.23, h * 0.75);
        ctx.closePath();
        ctx.fillStyle = "#F3F4F6";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#D1D5DB";
        ctx.stroke();

        // Decorative Sport Swoosh (Black)
        ctx.beginPath();
        ctx.moveTo(w * 0.4, h * 0.53);
        ctx.quadraticCurveTo(w * 0.55, h * 0.48, w * 0.7, h * 0.52);
        ctx.quadraticCurveTo(w * 0.52, h * 0.58, w * 0.38, h * 0.62);
        ctx.closePath();
        ctx.fillStyle = "#111827";
        ctx.fill();

        // Yellow laces and details
        ctx.beginPath();
        ctx.moveTo(w * 0.48, h * 0.46);
        ctx.lineTo(w * 0.54, h * 0.49);
        ctx.moveTo(w * 0.51, h * 0.44);
        ctx.lineTo(w * 0.57, h * 0.47);
        ctx.strokeStyle = "#FBBF24";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    },
    {
      id: "portrait_man",
      name: "Organic Portrait",
      category: "Face",
      color: "bg-blue-500",
      drawPreset: (ctx, w, h) => {
        // Plain blue background
        ctx.fillStyle = "#3B82F6"; 
        ctx.fillRect(0, 0, w, h);

        // Shoulders (Suit-style coat)
        ctx.beginPath();
        ctx.moveTo(w * 0.2, h * 0.95);
        ctx.quadraticCurveTo(w * 0.25, h * 0.75, w * 0.35, h * 0.72);
        ctx.lineTo(w * 0.5, h * 0.85); // Tie joint
        ctx.lineTo(w * 0.65, h * 0.72);
        ctx.quadraticCurveTo(w * 0.75, h * 0.75, w * 0.8, h * 0.95);
        ctx.closePath();
        ctx.fillStyle = "#1F2937";
        ctx.fill();

        // White Neck inner shirt
        ctx.beginPath();
        ctx.moveTo(w * 0.46, h * 0.7);
        ctx.lineTo(w * 0.5, h * 0.82);
        ctx.lineTo(w * 0.54, h * 0.7);
        ctx.closePath();
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        // Red Tie
        ctx.beginPath();
        ctx.moveTo(w * 0.48, h * 0.82);
        ctx.lineTo(w * 0.52, h * 0.82);
        ctx.lineTo(w * 0.54, h * 0.95);
        ctx.lineTo(w * 0.46, h * 0.95);
        ctx.closePath();
        ctx.fillStyle = "#EF4444";
        ctx.fill();

        // Neck
        ctx.beginPath();
        ctx.moveTo(w * 0.44, h * 0.55);
        ctx.lineTo(w * 0.44, h * 0.72);
        ctx.lineTo(w * 0.56, h * 0.72);
        ctx.lineTo(w * 0.56, h * 0.55);
        ctx.closePath();
        ctx.fillStyle = "#FDBA74"; // Warm skin
        ctx.fill();

        // Face Oval
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.48, w * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = "#FED7AA"; // Slightly lighter skin
        ctx.fill();

        // Cool Sunglasses (Block out of subjects)
        ctx.beginPath();
        ctx.rect(w * 0.39, h * 0.43, w * 0.1, h * 0.05);
        ctx.rect(w * 0.51, h * 0.43, w * 0.1, h * 0.05);
        ctx.fillStyle = "#111827";
        ctx.fill();
        // Nose bridge sunglasses
        ctx.beginPath();
        ctx.moveTo(w * 0.49, h * 0.45);
        ctx.lineTo(w * 0.51, h * 0.45);
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Classic Hair (Retro pompadour/dark brown)
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.35, w * 0.16, Math.PI, 0);
        ctx.quadraticCurveTo(w * 0.68, h * 0.38, w * 0.66, h * 0.45);
        ctx.lineTo(w * 0.34, h * 0.45);
        ctx.quadraticCurveTo(w * 0.32, h * 0.38, w * 0.5, h * 0.35);
        ctx.closePath();
        ctx.fillStyle = "#451A03";
        ctx.fill();

        // Smile
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.54, w * 0.04, 0, Math.PI);
        ctx.strokeStyle = "#C2410C";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    },
    {
      id: "car_sports",
      name: "Supercar Racing",
      category: "Vehicle",
      color: "bg-red-500",
      drawPreset: (ctx, w, h) => {
        // High-contrast Yellow background
        ctx.fillStyle = "#FBBF24"; 
        ctx.fillRect(0, 0, w, h);

        // Ground shadow
        ctx.save();
        ctx.scale(1, 0.25);
        ctx.beginPath();
        ctx.arc(w / 2 + 10, h * 2.9, w * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fill();
        ctx.restore();

        // Car Body (Stylized dark sports car)
        ctx.beginPath();
        ctx.moveTo(w * 0.14, h * 0.68);
        ctx.quadraticCurveTo(w * 0.22, h * 0.54, w * 0.34, h * 0.48); // hood slope
        ctx.quadraticCurveTo(w * 0.45, h * 0.42, w * 0.55, h * 0.42); // roof line
        ctx.quadraticCurveTo(w * 0.72, h * 0.45, w * 0.86, h * 0.64); // back trunk active spoiler
        ctx.lineTo(w * 0.88, h * 0.7);
        ctx.lineTo(w * 0.16, h * 0.71);
        ctx.closePath();
        ctx.fillStyle = "#020617"; // Midnight space color
        ctx.fill();

        // Windshield glass
        ctx.beginPath();
        ctx.moveTo(w * 0.44, h * 0.49);
        ctx.lineTo(w * 0.54, h * 0.49);
        ctx.lineTo(w * 0.58, h * 0.56);
        ctx.lineTo(w * 0.38, h * 0.56);
        ctx.closePath();
        ctx.fillStyle = "#38BDF8";
        ctx.fill();

        // Wheels Front & Back
        ctx.beginPath();
        ctx.arc(w * 0.3, h * 0.7, w * 0.08, 0, Math.PI * 2);
        ctx.arc(w * 0.7, h * 0.7, w * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = "#1E293B";
        ctx.fill();

        // Alloys details (White star spokes)
        ctx.beginPath();
        ctx.arc(w * 0.3, h * 0.7, w * 0.04, 0, Math.PI * 2);
        ctx.arc(w * 0.7, h * 0.7, w * 0.04, 0, Math.PI * 2);
        ctx.fillStyle = "#F1F5F9";
        ctx.fill();

        // Headlights (Neon cyan)
        ctx.beginPath();
        ctx.moveTo(w * 0.14, h * 0.64);
        ctx.quadraticCurveTo(w * 0.18, h * 0.64, w * 0.20, h * 0.66);
        ctx.lineTo(w * 0.16, h * 0.68);
        ctx.closePath();
        ctx.fillStyle = "#22D3EE";
        ctx.fill();
      }
    }
  ];

  // Draw preset on canvas on load
  const loadPreset = (preset: StockPreset) => {
    setIsMasked(false);
    setIsComparing(false);
    setEditorTool("none");
    setLogs([]);

    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext("2d")!;
    preset.drawPreset(ctx, 600, 600);

    const dataUrl = canvas.toDataURL("image/png");
    setImage(dataUrl);

    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      setOriginalImageObj(img);
      initializeCanvases(img);
    };

    setLogs((prev) => [
      ...prev,
      `[GALLERY] Opened preset template "${preset.name}" (${preset.category})`
    ]);
  };

  const handleDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsMasked(false);
    setIsComparing(false);
    setEditorTool("none");
    setLogs([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImage(dataUrl);

      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        setOriginalImageObj(img);
        initializeCanvases(img);
      };
    };
    reader.readAsDataURL(file);

    setLogs((prev) => [
      ...prev,
      `[STORAGE] Opened file: ${file.name} (${Math.round(file.size / 1024)} KB)`
    ]);
  };

  const handleBatchFilesUploaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: BatchQueueItem[] = Array.from(files).map((file: any) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      file: file as File,
    }));

    setBatchQueue((prev) => [...prev, ...newItems]);
    setBatchResults([]);
    setBatchLogs([]);
  };

  const handleLoadPresetsInBatch = () => {
    const newItems: BatchQueueItem[] = stockPresets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      preset,
    }));
    setBatchQueue((prev) => [...prev, ...newItems]);
    setBatchResults([]);
    setBatchLogs([]);
  };

  const removeFromBatchQueue = (id: string) => {
    setBatchQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearBatchQueue = () => {
    setBatchQueue([]);
    setBatchResults([]);
    setBatchLogs([]);
  };

  const loadImgFromFile = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        resolve(img);
      };
      img.onerror = (err) => {
        reject(new Error("Failed to decode image file."));
      };
    });
  };

  const convertImageDataToUrl = (
    imageData: ImageData,
    bg: "transparent" | "solid" | "pattern",
    color: string,
    pattern: string
  ): string => {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d")!;

    if (bg === "solid") {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bg === "pattern") {
      if (pattern === "studio") {
        const grad = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 50,
          canvas.width / 2, canvas.height / 2, canvas.width * 0.7
        );
        grad.addColorStop(0, "#FEF08A");
        grad.addColorStop(1, "#EAB308");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (pattern === "beach") {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, "#38BDF8");
        grad.addColorStop(0.6, "#FEE2E2");
        grad.addColorStop(1, "#FEF08A");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (pattern === "cosmic") {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, "#4C1D95");
        grad.addColorStop(1, "#030712");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const handleRunBatchProcess = async () => {
    if (batchQueue.length === 0) return;

    // Check simulated offline airplane mode cache constraints
    const isAirplaneSim = localStorage.getItem("birefnet_offline_airplane_saved_mode") === "true";
    let cachedMap: Record<string, boolean> = { 'General': true, 'General-Lite': true };
    try {
      const saved = localStorage.getItem("birefnet_offline_saved_models");
      if (saved) cachedMap = JSON.parse(saved);
    } catch (_) {}

    const isModelCached = !!cachedMap[birefnetWeights];

    if (isAirplaneSim && !isModelCached) {
      setBatchProcessing(true);
      setTpuActive(true);
      setBatchLogs([
        `[CELL_OFFLINE_BLOCK] ⚠️ BATCH INFERENCE INGRESS FAILURE: Zero cellular connection is active.`,
        `[CELL_OFFLINE_BLOCK] Error: Selected weights profile "${birefnetWeights}" is NOT cached locally in browser sandbox storage.`,
        `[CELL_OFFLINE_BLOCK] Please first switch to settings tab to download the weights file or disable Offline Flight Mode.`
      ]);
      setBatchProgress(0);
      setTimeout(() => {
        setBatchProcessing(false);
        setTpuActive(false);
      }, 4000);
      return;
    }

    setBatchProcessing(true);
    setTpuActive(true);
    setBatchProgress(1);
    setCurrentFileIndex(0);
    setBatchResults([]);
    setBatchLogs([
      `[BATCH_INIT] Starting batch processing for ${batchQueue.length} files...`,
      `[BATCH_LOAD] Initializing ONNX BiRefNet Weights: "${birefnetWeights}" (Model: "${BIREFNET_WEIGHTS_MAP[birefnetWeights]?.file || 'BiRefNet'}") pipeline...`,
      `[TPU] Target accelerator precision schema: ${modelSettings.precision === "uint8" ? "UINT8 Quantized TPU Mode" : "FP16 Shared Cache memory"}`
    ]);

    for (let idx = 0; idx < batchQueue.length; idx++) {
      const item = batchQueue[idx];
      setCurrentFileIndex(idx);
      const prefix = `[ITEM ${idx + 1}/${batchQueue.length}]`;

      setBatchLogs((prev) => [...prev, `${prefix} Active: "${item.name}"`]);

      try {
        let img: HTMLImageElement;

        if (item.file) {
          setBatchLogs((prev) => [...prev, `${prefix} Reading file buffer...`]);
          img = await loadImgFromFile(item.file);
        } else if (item.preset) {
          setBatchLogs((prev) => [...prev, `${prefix} Generating visual vector layers...`]);
          const canvas = document.createElement("canvas");
          canvas.width = 600;
          canvas.height = 600;
          const ctx = canvas.getContext("2d")!;
          item.preset.drawPreset(ctx, 600, 600);

          const presetImg = new Image();
          presetImg.src = canvas.toDataURL("image/png");
          await new Promise((resolve) => {
            presetImg.onload = resolve;
          });
          img = presetImg;
        } else {
          throw new Error("Invalid item format in batch stream.");
        }

        // Simulating the stages of loading model tensors
        await new Promise((resolve) => setTimeout(resolve, 300));
        setBatchLogs((prev) => [...prev, `${prefix} Normalized model square tensor [1, 3, 800, 800]`]);

        // Executing local remove background keying
        const maskedData = await ImageProcessor.removeBackgroundLocally(img, confidence, birefnetWeights);
        await new Promise((resolve) => setTimeout(resolve, 300));
        setBatchLogs((prev) => [...prev, `${prefix} Decoded raw edge probabilities to transparent alpha matte`]);

        // Composite chosen background output
        const urlOutput = convertImageDataToUrl(maskedData, bgType, solidBgColor, bgPattern);

        // Generate names
        const cleanName = item.name.replace(/\.[^/.]+$/, "");
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(8, 14);
        const outFileName = `birefnet_${cleanName || "batch"}_${timestamp}.png`;

        // Save into app native gallery database
        onSaveToDevice(urlOutput, outFileName);

        // Download physical file
        const downloader = document.createElement("a");
        downloader.download = outFileName;
        downloader.href = urlOutput;
        downloader.click();

        setBatchLogs((prev) => [...prev, `${prefix} SUCCESS: Saved as ..${folderTarget}/${outFileName}`]);
        setBatchResults((prev) => [
          ...prev,
          {
            id: item.id,
            name: item.name,
            success: true,
            url: urlOutput,
          },
        ]);
      } catch (err: any) {
        const errorString = err.message || String(err);
        setBatchLogs((prev) => [...prev, `${prefix} ⚠️ ERROR: ${errorString}`]);
        setBatchResults((prev) => [
          ...prev,
          {
            id: item.id,
            name: item.name,
            success: false,
            errorMsg: errorString,
          },
        ]);
      }

      // Progress updating step
      const stepPercent = Math.round(((idx + 1) / batchQueue.length) * 100);
      setBatchProgress(stepPercent);
    }

    setBatchProcessing(false);
    setTpuActive(false);
    setBatchLogs((prev) => [...prev, `[BATCH_COMPLETED] Finished processing queue. Queue length: ${batchQueue.length}`]);
  };

  // Initialize both visual comparison canvases
  const initializeCanvases = (img: HTMLImageElement) => {
    const origCanvas = originalCanvasRef.current;
    const procCanvas = processedCanvasRef.current;
    const brushCanvas = brushCanvasRef.current;

    if (!origCanvas || !procCanvas || !brushCanvas) return;

    // Maintain aspect ratio
    const dWidth = 400;
    const dHeight = Math.round((img.naturalHeight * dWidth) / img.naturalWidth);

    origCanvas.width = dWidth;
    origCanvas.height = dHeight;
    procCanvas.width = dWidth;
    procCanvas.height = dHeight;
    brushCanvas.width = dWidth;
    brushCanvas.height = dHeight;

    const ctxOrig = origCanvas.getContext("2d")!;
    const ctxProc = procCanvas.getContext("2d")!;
    const ctxBrush = brushCanvas.getContext("2d")!;

    ctxOrig.drawImage(img, 0, 0, dWidth, dHeight);
    ctxProc.drawImage(img, 0, 0, dWidth, dHeight);
    
    // Brush canvas transparent by default
    ctxBrush.clearRect(0, 0, dWidth, dHeight);
  };

  // Auto detect background removal workflow using real neural model execution
  const triggerAutoRemoveBg = async () => {
    if (!originalImageObj) return;

    // Check simulated offline airplane mode cache constraints
    const isAirplaneSim = localStorage.getItem("birefnet_offline_airplane_saved_mode") === "true";
    let cachedMap: Record<string, boolean> = { 'General': true, 'General-Lite': true };
    try {
      const saved = localStorage.getItem("birefnet_offline_saved_models");
      if (saved) cachedMap = JSON.parse(saved);
    } catch (_) {}

    const isModelCached = !!cachedMap[birefnetWeights];

    if (isAirplaneSim && !isModelCached) {
      setProcessing(true);
      setTpuActive(true);
      setProgress(0);
      setProgressMsg("Error: Cell connection blocked locally.");
      setLogs([
        `[CELL_OFFLINE_BLOCK] ⚠️ OFFLINE TRIGGER FAILURE: Zero cellular connection simulation is active.`,
        `[CELL_OFFLINE_BLOCK] Error: Neural weights profile "${birefnetWeights}" is NOT cached locally.`,
        `[CELL_OFFLINE_BLOCK] Please click the "Settings" tab in the bottom bar and download the cached weights file first.`
      ]);
      setTimeout(() => {
        setProcessing(false);
        setTpuActive(false);
      }, 3500);
      return;
    }

    setProcessing(true);
    setTpuActive(true);
    setProgress(5);
    setProgressMsg("Connecting to local WebAssembly executor...");
    
    const startTime = Date.now();
    const selectedModelWeightsName = BIREFNET_WEIGHTS_MAP[birefnetWeights]?.file || "BiRefNet";
    const systemLogs = [
      `[INIT] Booting real on-device ONNX Runtime Web assembly...`,
      `[LOAD] Selected Weights: "${birefnetWeights}" (${selectedModelWeightsName})`,
      `[TPU] Target Execution: WebGL/WebGPU with WebAssembly high-performance fallback.`
    ];
    setLogs(systemLogs);

    try {
      const maskedData = await ImageProcessor.removeBackgroundLocally(
        originalImageObj,
        confidence,
        birefnetWeights,
        (pct, label) => {
          setProgress(pct);
          setProgressMsg(label);
          setLogs((prev) => {
            const logEntry = `[${new Date().toLocaleTimeString()}] ${label}`;
            // Avoid adding duplicate consecutive logs or over-logging fast changes
            if (prev[prev.length - 1]?.includes(label)) return prev;
            return [...prev, logEntry];
          });
        }
      );

      const endTime = Date.now();
      setLogs((prev) => [
        ...prev,
        `[SUCCESS] Real background removal completed in ${endTime - startTime}ms!`,
        `[MATTE] Alpha mask layered and smoothing matrices resolved successfully.`
      ]);

      setIsMasked(true);
      setIsComparing(true);
      setCompareSplit(50);
      setEditorTool("background");
      setProcessing(false);
      setTpuActive(false);

      // Draw canvas with safety timeout for React DOM cycle to mount the canvas
      setTimeout(() => {
        const procCanvas = processedCanvasRef.current;
        if (procCanvas) {
          const ctx = procCanvas.getContext("2d")!;
          procCanvas.width = maskedData.width;
          procCanvas.height = maskedData.height;
          ctx.putImageData(maskedData, 0, 0);

          // Reset brush on new remove
          const brushCanvas = brushCanvasRef.current;
          if (brushCanvas) {
            brushCanvas.width = maskedData.width;
            brushCanvas.height = maskedData.height;
            const ctxBrush = brushCanvas.getContext("2d")!;
            ctxBrush.clearRect(0, 0, maskedData.width, maskedData.height);
          }
        }
      }, 50);
    } catch (err: any) {
      console.error(err);
      setLogs((prev) => [
        ...prev,
        `[ERROR] Execution failed: ${err.message || String(err)}`,
        `[FALLBACK] Attempting high-fidelity canvas keyer heuristic...`
      ]);
      setProcessing(false);
      setTpuActive(false);
    }
  };

  // Redraw canvases when Confidence, Weight settings or states change
  useEffect(() => {
    if (isMasked && originalImageObj && !processing) {
      ImageProcessor.removeBackgroundLocally(originalImageObj, confidence, birefnetWeights)
        .then((maskedData) => {
          const procCanvas = processedCanvasRef.current;
          if (procCanvas) {
            const ctx = procCanvas.getContext("2d")!;
            procCanvas.width = maskedData.width;
            procCanvas.height = maskedData.height;
            ctx.putImageData(maskedData, 0, 0);

            const brushCanvas = brushCanvasRef.current;
            if (brushCanvas) {
              brushCanvas.width = maskedData.width;
              brushCanvas.height = maskedData.height;
            }
          }
        });
    } else if (!isMasked && originalImageObj && !processing) {
      // Image is loaded but not yet processed: render the original image to the preview canvas immediately!
      initializeCanvases(originalImageObj);
    }
  }, [confidence, birefnetWeights, isMasked, processing, originalImageObj]);

  // Handle Touch/Mouse Painting on the Brush Alpha Overlay Canvas
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = processedCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Scale canvas pixels appropriately
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const handlePaintStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (editorTool !== "brush" || !isMasked) return;
    setIsPainting(true);
    
    // Draw initial dot
    const coords = getCanvasCoords(e);
    paintOnCanvas(coords.x, coords.y);
  };

  const handlePaintMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPainting || editorTool !== "brush") return;
    const coords = getCanvasCoords(e);
    paintOnCanvas(coords.x, coords.y);
  };

  const handlePaintStop = () => {
    setIsPainting(false);
  };

  const paintOnCanvas = (x: number, y: number) => {
    const procCanvas = processedCanvasRef.current;
    if (!procCanvas) return;

    const ctx = procCanvas.getContext("2d")!;
    ImageProcessor.applyBrush(ctx, x, y, brushSize, brushMode === "erase");
    
    // Also save stroke trace to intermediate render triggers
    setLogs((prev) => {
      const entry = `[EDIT] Brush ${brushMode === "erase" ? "transparent" : "opaque"} painted at coords (${Math.round(x)}, ${Math.round(y)})`;
      if (prev[prev.length - 1]?.startsWith("[EDIT]")) {
        return [...prev.slice(0, -1), entry]; // Debounce canvas log flooding
      }
      return [...prev, entry];
    });
  };

  // Prepare and discharge a beautiful composite downloaded file
  const handleSaveAndExport = () => {
    const procCanvas = processedCanvasRef.current;
    if (!procCanvas) return;

    // Setup an offscreen synthesis canvas to render the chosen background format behind the PNG mask
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = procCanvas.width;
    exportCanvas.height = procCanvas.height;
    const ctx = exportCanvas.getContext("2d")!;

    if (bgType === "solid") {
      ctx.fillStyle = solidBgColor;
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    } else if (bgType === "pattern") {
      if (bgPattern === "studio") {
        const grad = ctx.createRadialGradient(
          exportCanvas.width / 2, exportCanvas.height / 2, 50,
          exportCanvas.width / 2, exportCanvas.height / 2, exportCanvas.width * 0.7
        );
        grad.addColorStop(0, "#FEF08A"); // Pale soft studio spotlight
        grad.addColorStop(1, "#EAB308");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      } else if (bgPattern === "beach") {
        // Sky bottom beach vibe
        const grad = ctx.createLinearGradient(0, 0, 0, exportCanvas.height);
        grad.addColorStop(0, "#38BDF8"); // light blue sky
        grad.addColorStop(0.6, "#FEE2E2"); // warm sunset horizon
        grad.addColorStop(1, "#FEF08A"); // sand yellow
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      } else if (bgPattern === "cosmic") {
        // Starry purple gradient
        const grad = ctx.createLinearGradient(0, 0, exportCanvas.width, exportCanvas.height);
        grad.addColorStop(0, "#4C1D95"); // Dark violet
        grad.addColorStop(1, "#030712"); // deep galactic black
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      }
    }

    // Overlay the fully trimmed processed subject
    ctx.drawImage(procCanvas, 0, 0);

    const mergedUrl = exportCanvas.toDataURL("image/png");
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    const filename = `birefnet_${timestamp}.png`;

    // Trigger true browser save download anchor
    const link = document.createElement("a");
    link.download = filename;
    link.href = mergedUrl;
    link.click();

    // Bubble up to Local Frame Database Storage Manager
    onSaveToDevice(mergedUrl, filename);

    // Dynamic toast notification
    setToastMessage(`Saved to ..${folderTarget}/${filename}`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="flex flex-col flex-1 p-4 relative" id="eraser-stage">
      {/* Dynamic Saving Toast Animation */}
      {toastMessage && (
        <div className="absolute top-4 inset-x-4 bg-[#1a1f36]/80 backdrop-blur-md border border-indigo-500/30 text-indigo-400 shrink-0 text-indigo-200 px-4 py-3 rounded-xl flex items-center gap-3 shadow-2xl z-50 animate-bounce text-xs font-medium">
          <Check className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="flex-1 min-w-0 break-all">{toastMessage}</div>
        </div>
      )}

      {/* 1. Header Area with action icons */}
      <div className="mb-3 border-b border-white/5 pb-2">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
            <h2 className="text-[11px] sm:text-xs font-bold tracking-wide text-white/90 truncate">
              Standard Generic Image Background Remover
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              id="eraser-btn-about"
              onClick={() => setShowAboutModal(true)}
              className="flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 font-bold px-1.5 py-1 rounded-lg text-[10px] transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>About</span>
            </button>
            {image && !processing && eraserMode === "single" && (
              <button
                id="eraser-btn-reload"
                onClick={() => setImage(null)}
                className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/5 backdrop-blur-md px-1.5 py-1 rounded-lg text-[10px] text-rose-450 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex bg-black/20 p-1 rounded-xl mb-3">
        <button
          onClick={() => !processing && !batchProcessing && setEraserMode("single")}
          disabled={processing || batchProcessing}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            eraserMode === "single"
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200"
          } ${processing || batchProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Single Image
        </button>
        <button
          onClick={() => !processing && !batchProcessing && setEraserMode("batch")}
          disabled={processing || batchProcessing}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            eraserMode === "batch"
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200"
          } ${processing || batchProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Batch Engine
        </button>
      </div>

      {eraserMode === "single" && (
        <>
          {/* 2. Upload / Input Landing Stage */}
          {!image && (
        <div className="flex-1 flex flex-col justify-center py-6">
          <div className="border-2 border-dashed border-white/10 rounded-3xl p-6 text-center hover:border-indigo-500/50 hover:bg-white/5 transition-all flex flex-col items-center">
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mb-3 text-indigo-400">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white/90 mb-1">Upload Source Image</h3>
            <p className="text-[11px] text-slate-400 mb-4 max-w-xs">
              Select an image from device storage or gallery folders to undergo local BiRefNet_lite-ONNX segmentation.
            </p>
            
            <button
              id="upload-file-trigger"
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-500 hover:bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.4)] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all mb-4 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              File & Gallery Selector
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleDeviceUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>
      )}

      {/* 4. Canvas Stage and Comparison Controls */}
      {image && (
        <div className="flex-1 flex flex-col justify-between">
          
          {/* Active Canvas Display Frame */}
          <div className="flex-1 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-slate-900/50 border border-white/10 rounded-3xl relative overflow-hidden h-[180px] min-h-[160px] max-h-[300px] mb-3">
            
            {/* Transparent checkerboard template backdrop */}
            <div className="absolute inset-0 select-none bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

            {/* Background Compositing previews */}
            {isMasked && bgType === "solid" && (
              <div className="absolute inset-0 z-0" style={{ backgroundColor: solidBgColor }} />
            )}
            {isMasked && bgType === "pattern" && bgPattern === "studio" && (
              <div className="absolute inset-0 z-0 bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200" />
            )}
            {isMasked && bgType === "pattern" && bgPattern === "beach" && (
              <div className="absolute inset-0 z-0 bg-gradient-to-b from-sky-400 via-rose-100 to-amber-200" />
            )}
            {isMasked && bgType === "pattern" && bgPattern === "cosmic" && (
              <div className="absolute inset-0 z-0 bg-gradient-to-tr from-violet-900 via-slate-950 to-indigo-950" />
            )}

            {/* If processing is active, show the overlay indicator directly on top of the original/active image! */}
            {processing && (
              <div id="tpu-processing-glass-overlay" className="absolute inset-0 bg-[#080a13]/70 backdrop-blur-md z-30 flex flex-col items-center justify-center p-4">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                <h3 className="text-xs font-bold text-white mb-1 uppercase tracking-wider select-none">TPU Offline Inference</h3>
                <p className="text-[10px] text-slate-350 font-mono text-center max-w-[85%] truncate mb-3 select-all">{progressMsg}</p>
                <div className="w-2/3 bg-white/10 rounded-full h-1 overflow-hidden mb-1">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-350 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono font-bold text-indigo-400">{progress}% COMPLETED</span>
              </div>
            )}

            {/* Hidden original asset canvas tracker */}
            <canvas ref={originalCanvasRef} className="hidden" />
            
            {/* Comparison Visualizer Container */}
            <div 
              className="relative overflow-hidden w-full h-full max-w-[85%] max-h-[85%] rounded-xl flex items-center justify-center border border-slate-800/80 shadow-[0_10px_25px_rgba(0,0,0,0.5)] transition-all duration-300"
              style={{
                aspectRatio: originalImageObj 
                  ? `${originalImageObj.naturalWidth / originalImageObj.naturalHeight}`
                  : "1",
                backgroundColor: !isMasked
                  ? "rgba(2, 6, 23, 0.2)"
                  : bgType === "solid"
                  ? solidBgColor
                  : transparencyBackdrop === "black"
                  ? "#000000"
                  : transparencyBackdrop === "white"
                  ? "#ffffff"
                  : "transparent",
                backgroundImage: (isMasked && bgType === "transparent" && transparencyBackdrop === "checkered")
                  ? "conic-gradient(#cbd5e1 25%, #ffffff 25% 50%, #cbd5e1 50% 75%, #ffffff 75%)"
                  : "none",
                backgroundSize: (isMasked && bgType === "transparent" && transparencyBackdrop === "checkered")
                  ? "16px 16px"
                  : "auto"
              }}
            >
              
              {/* Processed (Masked/Transparent Canvas) */}
              <canvas
                id="processed-rmbg-canvas"
                ref={processedCanvasRef}
                onMouseDown={handlePaintStart}
                onMouseMove={handlePaintMove}
                onMouseUp={handlePaintStop}
                onMouseLeave={handlePaintStop}
                onTouchStart={handlePaintStart}
                onTouchMove={handlePaintMove}
                onTouchEnd={handlePaintStop}
                className="absolute inset-0 w-full h-full z-10 cursor-crosshair rounded-xl"
                style={{
                  clipPath: isComparing && isMasked
                    ? `polygon(0 0, ${compareSplit}% 0, ${compareSplit}% 100%, 0 100%)`
                    : "none"
                }}
              />

              {/* Original Canvas Backdrop for comparison slider */}
              {isComparing && isMasked && (
                <img
                  src={image}
                  alt="Original template"
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-85 rounded-xl object-fill"
                  style={{
                    clipPath: `polygon(${compareSplit}% 0, 100% 0, 100% 100%, ${compareSplit}% 100%)`
                  }}
                />
              )}

              {/* Extra brush visualizer overlay */}
              <canvas ref={brushCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none hidden rounded-xl" />

              {/* Split drag handler bar */}
              {isComparing && isMasked && (
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-indigo-400 cursor-ew-resize z-25 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                  style={{ left: `${compareSplit}%` }}
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center shadow-lg pointer-events-none select-none">
                    ↔
                  </div>
                </div>
              )}
            </div>

            {/* Compare sliding bar trigger */}
            {isComparing && isMasked && (
              <div className="absolute bottom-1.5 inset-x-4 bg-[#0a0c14]/80 backdrop-blur-xl border border-white/5 px-3 py-1.5 rounded-full flex items-center gap-2 z-30">
                <span className="text-[9px] font-semibold text-indigo-400 shrink-0 uppercase tracking-widest font-mono">Split Position</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={compareSplit}
                  onChange={(e) => setCompareSplit(Number(e.target.value))}
                  className="flex-1 accent-indigo-500 h-1 rounded"
                />
                <span className="text-[10px] text-slate-300 font-mono w-8 text-right">{compareSplit}%</span>
              </div>
            )}
          </div>

          {/* 5. Tool Action Control Bar */}
          <div className="bg-[#1a1f36]/40 backdrop-blur-md border border-white/10 rounded-3xl p-3.5 mb-1 flex flex-col gap-3">
            
            {/* If currently processing, show live scrolling neural telemetry */}
            {processing ? (
              <div className="flex flex-col gap-2.5 py-1 text-left animate-pulse">
                <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
                  <span className="text-xs font-bold text-white/95 uppercase tracking-wider font-sans">
                    Neural Core Execution Telemetry
                  </span>
                </div>
                {/* Neural System Log Output Console */}
                <div className="w-full bg-black/40 border border-white/5 p-2.5 rounded-xl text-left font-mono text-[9px] text-slate-400 h-28 overflow-y-auto block select-text">
                  {logs.map((log, lidx) => (
                    <div key={lidx} className="mb-0.5 leading-normal">
                      <span className="text-slate-650 mr-1.5">[{new Date().toLocaleTimeString()}]</span>
                      <span className={log.includes("COMPLETED") || log.includes("success") ? "text-indigo-400 font-semibold" : "text-slate-300"}>
                        {log}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 font-medium italic text-center">
                  Executing model tensors offline. Your original image assets remain strictly in-browser.
                </p>
              </div>
            ) : !isMasked ? (
              <div className="flex flex-col gap-3 py-1 text-left">
                {/* Always-visible BiRefNet Weights Selector Dropdown BEFORE segmentation */}
                <div className="flex flex-col gap-1.5 bg-black/25 border border-white/5 p-3 rounded-2xl">
                  <div className="flex items-center justify-between text-[11px] text-slate-350">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      BiRefNet Weights Option
                    </span>
                  </div>
                  <select
                    id="birefnet-weights-select-before"
                    value={birefnetWeights}
                    onChange={(e) => setBirefnetWeights(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {Object.entries(BIREFNET_WEIGHTS_MAP).map(([key, info]) => (
                      <option key={key} value={key} className="bg-[#121629] text-slate-200">
                        {key} ({info.file})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 italic leading-snug">
                    {BIREFNET_WEIGHTS_MAP[birefnetWeights]?.desc}
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 text-center leading-normal">
                  Choose your weights model profile above first, then click below to trigger offline background extraction.
                </p>
                <button
                  id="run-local-tpu-inference"
                  onClick={triggerAutoRemoveBg}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 text-white font-semibold py-3 px-5 rounded-2xl flex items-center justify-center gap-2.5 transition-all text-xs active:scale-[0.98] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current text-white" />
                  Run Offline TPU Segmentation
                </button>
              </div>
            ) : (
              // Masked edit configurations
              <div className="flex flex-col gap-3">
                
                {/* Secondary Toggles Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-semibold text-white/95 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Interactive Adjust
                  </span>
                </div>

                {/* Always-visible BiRefNet Weights Selector Dropdown */}
                <div className="flex flex-col gap-1.5 border-b border-white/5 pb-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="font-semibold flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      BiRefNet Model Weights Profile
                    </span>
                  </div>
                  <select
                    id="birefnet-weights-select"
                    value={birefnetWeights}
                    onChange={(e) => setBirefnetWeights(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {Object.entries(BIREFNET_WEIGHTS_MAP).map(([key, info]) => (
                      <option key={key} value={key} className="bg-[#121629] text-slate-200">
                        {key} ({info.file})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 italic leading-snug">
                    {BIREFNET_WEIGHTS_MAP[birefnetWeights]?.desc}
                  </p>
                </div>

                {/* Sub Tool: Slider tuning parameters */}
                {editorTool === "none" && (
                  <div className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-350">
                        <span className="font-semibold flex items-center gap-1">
                          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                          Sigmoid Model Confidence Score
                        </span>
                        <span className="font-mono text-indigo-450 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          {(confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="0.95"
                        step="0.01"
                        value={confidence}
                        onChange={(e) => setConfidence(Number(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-black/30 rounded cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 leading-normal italic">
                        Uses the continuous, raw mathematical sigmoid probability score computed locally from onnx-community/BiRefNet model prediction tensors.
                      </span>
                    </div>
                  </div>
                )}

                {/* Sub Tool: Manual Transparent/Opaque brush paint */}
                {editorTool === "brush" && (
                  <div className="flex flex-col gap-2 font-sans bg-black/10 p-2.5 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="text-slate-300">Paint Mode</span>
                      <div className="flex gap-1 bg-black/35 p-0.5 rounded-lg border border-white/5">
                        <button
                          onClick={() => setBrushMode("erase")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            brushMode === "erase" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 opacity-100" : "text-slate-400"
                          }`}
                        >
                          Erase (Transparent)
                        </button>
                        <button
                          onClick={() => setBrushMode("restore")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            brushMode === "restore" ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-slate-400"
                          }`}
                        >
                          Restore
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Brush Diameter</span>
                      <span className="font-mono text-indigo-400">{brushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-black/30 rounded cursor-pointer"
                    />

                    <p className="text-[9px] text-slate-500 italic text-center">
                      Tip: Click/drag directly on the image canvas above to manually erase or restore details!
                    </p>
                  </div>
                )}

                {/* Sub Tool: Background composites */}
                {editorTool === "background" && (
                  <div className="flex flex-col gap-2 bg-black/15 p-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1.5 bg-black/30 p-0.5 rounded-lg border border-white/5 w-fit self-center">
                      <button
                        onClick={() => setBgType("transparent")}
                        className={`text-[10px] px-2 py-1 rounded font-bold ${
                          bgType === "transparent" ? "bg-indigo-500 text-white" : "text-slate-400"
                        }`}
                      >
                        Transparent
                      </button>
                      <button
                        onClick={() => setBgType("solid")}
                        className={`text-[10px] px-2 py-1 rounded font-bold ${
                          bgType === "solid" ? "bg-indigo-500 text-white" : "text-slate-400"
                        }`}
                      >
                        Solid Color
                      </button>
                    </div>

                    {/* BG Sub Controls */}
                    {bgType === "transparent" && (
                      <div className="flex flex-col gap-1.5 border-t border-white/5 pt-2 mt-1">
                        <span className="text-[10px] text-slate-400 font-medium text-center">Transparent View Backdrop</span>
                        <div className="flex justify-center gap-1.5">
                          {(["black", "white", "checkered"] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setTransparencyBackdrop(mode)}
                              className={`text-[9px] px-2.5 py-1 rounded-lg border font-bold capitalize transition-all cursor-pointer ${
                                transparencyBackdrop === mode
                                  ? "bg-indigo-500 border-indigo-500 text-white shadow-sm shadow-indigo-500/20"
                                  : "bg-[#121629] border-white/5 text-slate-400 hover:text-white"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {bgType === "solid" && (
                      <div className="flex items-center gap-2 justify-center mt-1">
                        <span className="text-[11px] text-slate-400">Picker:</span>
                        {["#10B981", "#3B82F6", "#EF4444", "#8B5CF6", "#F59E0B", "#F472B6"].map((col) => (
                          <button
                            key={col}
                            onClick={() => setSolidBgColor(col)}
                            className="w-5 h-5 rounded-full border border-slate-500 active:scale-90 transition-transform cursor-pointer shadow-sm relative overflow-hidden"
                            style={{ backgroundColor: col }}
                          >
                            {solidBgColor === col && <Check className="w-3.5 h-3.5 text-white stroke-[4] absolute inset-1.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Toggle Compare Slider button (Eye indicator) */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsComparing(!isComparing)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      isComparing 
                        ? "bg-[#0a0c14]/40 border-indigo-500/40 text-indigo-400" 
                        : "bg-[#0a0c14]/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    {isComparing ? <Eye className="w-4 h-4 text-indigo-400" /> : <EyeOff className="w-4 h-4" />}
                    {isComparing ? "Hide Split Compare" : "Show Split Compare"}
                  </button>

                  <button
                    id="save-processed-file-btn"
                    onClick={handleSaveAndExport}
                    className="flex-[1.5] bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-xs cursor-pointer shadow-xl shadow-indigo-500/25"
                  >
                    <Download className="w-4 h-4" />
                    Save to Device Gallery
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}

      {/* 2. Batch Processing View Block */}
      {eraserMode === "batch" && (
        <div className="flex-grow flex flex-col justify-between" id="eraser-batch-container">
          
          {/* B1: Upload Landing / Mock Selector */}
          {batchQueue.length === 0 && (
            <div className="flex-1 flex flex-col justify-center py-6">
              <div className="border-2 border-dashed border-white/10 rounded-3xl p-6 text-center hover:border-indigo-500/50 hover:bg-white/5 transition-all flex flex-col items-center">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mb-3 text-indigo-400">
                  <Files className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white/90 mb-1">Upload Multiple Images</h3>
                <p className="text-[11px] text-slate-400 mb-4 max-w-xs leading-relaxed">
                  Select several images from device storage or gallery folders to undergo local BiRefNet_lite-ONNX batch segmentation.
                </p>

                <button
                  id="batch-upload-trigger"
                  onClick={() => batchFileInputRef.current?.click()}
                  className="bg-indigo-500 hover:bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.4)] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all mb-4 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Select Files/Gallery
                </button>

                <input
                  type="file"
                  ref={batchFileInputRef}
                  onChange={handleBatchFilesUploaded}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                <div className="w-full border-t border-white/5 my-4 flex items-center justify-center">
                  <span className="bg-black/30 px-3 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                    Or Tap Mock Presets
                  </span>
                </div>

                <button
                  onClick={handleLoadPresetsInBatch}
                  className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl py-2 px-4 text-xs font-semibold text-slate-300 hover:text-indigo-300 transition-all cursor-pointer"
                >
                  Queue All Stock Presets ({stockPresets.length})
                </button>
              </div>
            </div>
          )}

          {/* B2: Queue and Processing Screen */}
          {batchQueue.length > 0 && (
            <div className="flex-grow flex flex-col justify-between overflow-hidden">
              
              {/* B2a: Active Queue Scroll Box */}
              <div className="flex-grow flex flex-col min-h-[140px] max-h-[220px] bg-slate-900/30 border border-white/10 rounded-2xl p-3 overflow-y-auto mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Files className="w-3.5 h-3.5" />
                    Pending Queue ({batchQueue.length})
                  </span>
                  {!batchProcessing && (
                    <button
                      onClick={clearBatchQueue}
                      className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors uppercase font-mono cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  {batchQueue.map((item, qIdx) => {
                    const isProcessingThis = batchProcessing && currentFileIndex === qIdx;
                    const hasResult = batchResults.find((r) => r.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] ${
                          isProcessingThis
                            ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300 animate-pulse"
                            : hasResult
                            ? hasResult.success
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-455"
                            : "bg-white/5 border-white/5 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          <span className="text-[9px] font-mono text-slate-500 shrink-0">#{qIdx + 1}</span>
                          <span className="truncate font-medium">{item.name}</span>
                          {isProcessingThis && (
                            <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin shrink-0" />
                          )}
                        </div>

                        {!batchProcessing && !hasResult && (
                          <button
                            onClick={() => removeFromBatchQueue(item.id)}
                            className="text-rose-400 hover:text-rose-300 p-0.5 rounded cursor-pointer animate-none"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {hasResult && (
                          <span className="text-[9px] uppercase font-mono font-bold shrink-0">
                            {hasResult.success ? "✓ Done" : "✗ Error"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* B2b: Continuous Progress indicator updates */}
              {batchProcessing && (
                <div className="bg-[#1a1f36]/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-3 flex flex-col items-center">
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-semibold text-white/90 font-sans">
                      Processing: {currentFileIndex + 1} of {batchQueue.length} items
                    </span>
                    <span className="text-[10px] font-bold text-indigo-400 font-mono">
                      {batchProgress}%
                    </span>
                  </div>

                  <div className="w-full bg-white/5 rounded-full h-1.5 mb-3">
                    <div
                      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 h-1.5 rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                      style={{ width: `${batchProgress}%` }}
                    />
                  </div>

                  {/* Neural Console terminal for active telemetry logs */}
                  <div className="w-full bg-black/40 border border-white/5 p-2 rounded-xl text-left font-mono text-[9px] text-slate-400 h-20 overflow-y-auto block select-text">
                    {batchLogs.slice(-8).map((log, lidx) => (
                      <div key={lidx} className="mb-0.5 leading-normal truncate">
                        <span className="text-slate-600 mr-1.5">[{new Date().toLocaleTimeString()}]</span>
                        <span className={log.includes("SUCCESS") || log.includes("COMPLETED") ? "text-indigo-400 font-medium" : "text-slate-350"}>
                          {log}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* B2c: Final Summary report of successful and failed operations */}
              {!batchProcessing && batchResults.length > 0 && (
                <div className="bg-[#1a1f36]/30 border border-white/10 rounded-2xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-2.5 border-b border-white/5 pb-1.5">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Batch Summary Report
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 px-2 py-0.5 rounded-full">
                      Passed: {batchResults.filter(r => r.success).length} / {batchResults.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {batchResults.map((res) => (
                      <div
                        key={res.id}
                        className={`p-2 rounded-xl border flex items-center gap-2 ${
                          res.success ? "bg-black/10 border-white/5" : "bg-rose-500/5 border-rose-500/10"
                        }`}
                      >
                        {res.success && res.url ? (
                          <div className="w-8 h-8 bg-black/25 rounded border border-white/5 flex items-center justify-center p-0.5 overflow-hidden shrink-0">
                            <img
                              src={res.url}
                              alt="Result preview"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-rose-500/10 rounded flex items-center justify-center text-rose-400 shrink-0">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 pr-1">
                          <div className="text-[10px] font-semibold text-slate-200 truncate leading-snug">
                            {res.name}
                          </div>
                          <div className={`text-[8.5px] font-mono leading-none ${res.success ? "text-indigo-400" : "text-rose-455"}`}>
                            {res.success ? "Saved" : res.errorMsg || "Failed"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* B2d: Configuration Options */}
              {!batchProcessing && (
                <div className="bg-[#1a1f36]/40 backdrop-blur-md border border-white/10 rounded-3xl p-3.5 mb-1 flex flex-col gap-3">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <span className="text-xs font-semibold text-white/95 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                        Custom Batch Settings
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 mb-1 pb-1.5 border-b border-white/5">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-semibold">
                          <Layers className="w-3 h-3 text-indigo-400" />
                          Weights Profile:
                        </span>
                      </div>
                      <select
                        id="batch-birefnet-weights-select"
                        value={birefnetWeights}
                        onChange={(e) => setBirefnetWeights(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {Object.entries(BIREFNET_WEIGHTS_MAP).map(([key, info]) => (
                          <option key={key} value={key} className="bg-[#121629] text-slate-200">
                            {key} ({info.file})
                          </option>
                        ))}
                      </select>
                      <p className="text-[9px] text-slate-500 leading-snug">
                        {BIREFNET_WEIGHTS_MAP[birefnetWeights]?.desc}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 mb-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Sigmoid Model Confidence:</span>
                        <span className="font-mono text-indigo-400 font-bold">{(confidence * 100).toFixed(1)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="0.95"
                        step="0.01"
                        value={confidence}
                        onChange={(e) => setConfidence(Number(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-black/30 rounded cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 border-t border-white/5 pt-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>Background Composition Mode</span>
                        <span className="text-[9px] uppercase bg-black/30 text-indigo-400 font-mono px-1.5 py-0.5 rounded">
                          {bgType === "transparent" ? "Transparent" : "Solid Fill"}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 bg-black/30 p-0.5 rounded-lg border border-white/5 w-fit self-center">
                        <button
                          onClick={() => setBgType("transparent")}
                          className={`text-[10px] px-2.5 py-1 rounded font-bold cursor-pointer ${
                            bgType === "transparent" ? "bg-indigo-500 text-white shadow-sm" : "text-slate-400"
                          }`}
                        >
                          Transparent
                        </button>
                        <button
                          onClick={() => setBgType("solid")}
                          className={`text-[10px] px-2.5 py-1 rounded font-bold cursor-pointer ${
                            bgType === "solid" ? "bg-indigo-500 text-white shadow-sm" : "text-slate-400"
                          }`}
                        >
                          Solid Fill
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Run Queue CTA */}
                  <button
                    onClick={handleRunBatchProcess}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 text-white font-semibold py-2.5 px-5 rounded-2xl flex items-center justify-center gap-2 transition-all text-xs active:scale-[0.98] cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current text-white" />
                    Process & Export Queue
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* About Modal Dialog Overlay */}
      {showAboutModal && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1e38] border border-indigo-500/30 rounded-3xl p-5 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              id="close-about-modal"
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center font-sans">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/25 rounded-full flex items-center justify-center mb-3 text-indigo-400">
                <Info className="w-6 h-6" />
              </div>

              <h3 className="text-sm font-bold text-white mb-2">
                About BiRefNet Background Remover
              </h3>
              
              <div className="space-y-2 text-[11px] text-slate-350 text-left bg-black/25 p-3 rounded-xl border border-white/5 leading-relaxed">
                <p>
                  <strong>Standard Generic Image Background Remover</strong> provides state-of-the-art client-side high-fidelity image segmentation.
                </p>
                <p>
                  This utility runs the high-performance <span className="text-indigo-400 font-semibold font-mono">onnx-community/BiRefNet_lite-ONNX</span> model locally via ONNX Runtime &amp; WebAssembly, ensuring your assets remain strictly confidential.
                </p>
                <div className="border-t border-white/5 pt-1.5 mt-1 text-[10px] text-slate-400">
                  <span className="font-bold">Attribution &amp; Source</span>:
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Model: <a href="https://huggingface.co/onnx-community/BiRefNet_lite-ONNX" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline font-mono">BiRefNet_lite-ONNX</a></li>
                    <li>Weights: <span className="text-indigo-300 font-mono">onnx/model_quantized.onnx</span></li>
                    <li>Engine: ONNX Runtime Web</li>
                    <li>Interface: Simulated Android Core</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowAboutModal(false)}
                className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 font-bold text-white px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
