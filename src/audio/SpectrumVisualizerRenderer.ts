/**
 * VocalMirror — Real-Time Spectral Gap Canvas 2D Visualizer Renderer
 * 
 * High-performance 60fps zero-allocation dual FFT spectrum visualizer.
 * Renders raw air conduction vs processed bone conduction curves with
 * differential energy gap shading, logarithmic frequency scale, dynamic
 * acoustic annotation badges, and High-DPI Retina support.
 */

import {
  frequencyToX,
  xToFrequency,
  dbToY,
  yToDb,
  interpolateMagnitude,
  getFrequencyGridTicks,
  calculateSpectralGapMetrics,
  SpectralGapMetrics,
  CursorInspectionData,
  FREQ_CONSTANTS,
} from '../utils/frequencyMapping';

export type VisualizerDisplayMode = 'OVERLAY' | 'DIFFERENTIAL' | 'GAP_ONLY';

export type VisualizerLabelFormatter = (
  key: string,
  defaultText: string,
  params?: Record<string, string | number>
) => string;

export interface VisualizerRenderOptions {
  /** Minimum frequency in Hz (default: 20) */
  minFrequency?: number;
  /** Maximum frequency in Hz (default: 20000) */
  maxFrequency?: number;
  /** Minimum dB floor for canvas bottom (default: -100) */
  minDecibels?: number;
  /** Maximum dB ceiling for canvas top (default: -30) */
  maxDecibels?: number;
  /** Temporal smoothing constant for curve motion [0.0 - 1.0] (default: 0.35) */
  smoothingAlpha?: number;
  /** Show frequency and dB reference grid lines (default: true) */
  showGrid?: boolean;
  /** Show dynamic peak resonance and damping badges (default: true) */
  showAnnotations?: boolean;
  /** Show air conduction curve (default: true) */
  showAirCurve?: boolean;
  /** Show simulated bone conduction curve (default: true) */
  showBoneCurve?: boolean;
  /** Show differential energy gap area fills (default: true) */
  showDifferentialGap?: boolean;
  /** Air curve primary stroke color (default: '#38bdf8') */
  airCurveColor?: string;
  /** Bone curve primary stroke color (default: '#fbbf24') */
  boneCurveColor?: string;
  /** Custom label formatter for i18n localization */
  labelFormatter?: VisualizerLabelFormatter;
}

export interface SpectrumVisualizerOptions {
  canvas: HTMLCanvasElement;
  rawAnalyser: AnalyserNode | null;
  processedAnalyser: AnalyserNode | null;
  sampleRate?: number;
  fftSize?: number;
  displayMode?: VisualizerDisplayMode;
  renderOptions?: VisualizerRenderOptions;
  onMetricsUpdate?: (metrics: SpectralGapMetrics) => void;
  onCursorInspect?: (data: CursorInspectionData | null) => void;
}

interface BadgeState {
  x: number;
  y: number;
  valueDb: number;
  freq: number;
  visible: boolean;
  alpha: number;
}

export class SpectrumVisualizerRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private rawAnalyser: AnalyserNode | null = null;
  private processedAnalyser: AnalyserNode | null = null;

  private sampleRate: number;
  private fftSize: number;
  private displayMode: VisualizerDisplayMode = 'OVERLAY';

  // Config options
  private options: Required<Omit<VisualizerRenderOptions, 'labelFormatter'>> & {
    labelFormatter?: VisualizerLabelFormatter;
  };

  // Dimensions & scaling
  private width = 800;
  private height = 300;
  private dpr = 1;

  // Pre-allocated TypedArray Buffers (Zero Allocation Loop)
  private readonly maxFftBins = 2048;
  private rawFreqData: Float32Array;
  private boneFreqData: Float32Array;

  private readonly maxPixels = 4096;
  private pixelAirY: Float32Array;
  private pixelBoneY: Float32Array;
  private smoothedAirY: Float32Array;
  private smoothedBoneY: Float32Array;

  // Lifecycle state
  private isRunning = false;
  private isDestroyed = false;
  private rafId: number | null = null;

  // Hover Cursor State
  private hoverX: number | null = null;
  private hoverY: number | null = null;

  // Dynamic Badges Smoothing State
  private boostBadge: BadgeState = { x: 0, y: 0, valueDb: 0, freq: 0, visible: false, alpha: 0 };
  private dampBadge: BadgeState = { x: 0, y: 0, valueDb: 0, freq: 0, visible: false, alpha: 0 };

  // Throttled Callbacks
  private onMetricsUpdate?: (metrics: SpectralGapMetrics) => void;
  private onCursorInspect?: (data: CursorInspectionData | null) => void;
  private lastMetricsTime = 0;

  constructor(options: SpectrumVisualizerOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      // In non-canvas test environments, avoid unhandled hard crash
      this.ctx = null;
    } else {
      this.ctx = ctx;
    }

    this.rawAnalyser = options.rawAnalyser || null;
    this.processedAnalyser = options.processedAnalyser || null;
    this.sampleRate = options.sampleRate || FREQ_CONSTANTS.DEFAULT_SAMPLE_RATE;
    this.fftSize = options.fftSize || FREQ_CONSTANTS.DEFAULT_FFT_SIZE;
    this.displayMode = options.displayMode || 'OVERLAY';
    this.onMetricsUpdate = options.onMetricsUpdate;
    this.onCursorInspect = options.onCursorInspect;

    const opt = options.renderOptions || {};
    this.options = {
      minFrequency: opt.minFrequency ?? FREQ_CONSTANTS.MIN_FREQ,
      maxFrequency: opt.maxFrequency ?? FREQ_CONSTANTS.MAX_FREQ,
      minDecibels: opt.minDecibels ?? FREQ_CONSTANTS.MIN_DB,
      maxDecibels: opt.maxDecibels ?? FREQ_CONSTANTS.MAX_DB,
      smoothingAlpha: opt.smoothingAlpha ?? 0.35,
      showGrid: opt.showGrid ?? true,
      showAnnotations: opt.showAnnotations ?? true,
      showAirCurve: opt.showAirCurve ?? true,
      showBoneCurve: opt.showBoneCurve ?? true,
      showDifferentialGap: opt.showDifferentialGap ?? true,
      airCurveColor: opt.airCurveColor ?? '#38bdf8',
      boneCurveColor: opt.boneCurveColor ?? '#fbbf24',
      labelFormatter: opt.labelFormatter,
    };

    // Pre-allocate arrays
    this.rawFreqData = new Float32Array(this.maxFftBins);
    this.boneFreqData = new Float32Array(this.maxFftBins);
    this.rawFreqData.fill(this.options.minDecibels);
    this.boneFreqData.fill(this.options.minDecibels);

    this.pixelAirY = new Float32Array(this.maxPixels);
    this.pixelBoneY = new Float32Array(this.maxPixels);
    this.smoothedAirY = new Float32Array(this.maxPixels);
    this.smoothedBoneY = new Float32Array(this.maxPixels);

    this.initBuffers();
  }

  private initBuffers(): void {
    const floorY = this.height;
    for (let i = 0; i < this.maxPixels; i++) {
      this.pixelAirY[i] = floorY;
      this.pixelBoneY[i] = floorY;
      this.smoothedAirY[i] = floorY;
      this.smoothedBoneY[i] = floorY;
    }
  }

  public setAnalysers(raw: AnalyserNode | null, processed: AnalyserNode | null): void {
    this.rawAnalyser = raw;
    this.processedAnalyser = processed;
  }

  public setMode(mode: VisualizerDisplayMode): void {
    this.displayMode = mode;
  }

  public getMode(): VisualizerDisplayMode {
    return this.displayMode;
  }

  public setOptions(newOptions: Partial<VisualizerRenderOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  public frequencyToX(freq: number, width = this.width): number {
    return frequencyToX(freq, width, this.options.minFrequency, this.options.maxFrequency);
  }

  public xToFrequency(x: number, width = this.width): number {
    return xToFrequency(x, width, this.options.minFrequency, this.options.maxFrequency);
  }

  public dbToY(db: number, height = this.height): number {
    return dbToY(db, height, this.options.minDecibels, this.options.maxDecibels);
  }

  public yToDb(y: number, height = this.height): number {
    return yToDb(y, height, this.options.minDecibels, this.options.maxDecibels);
  }

  public resize(width: number, height: number, dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1): void {
    if (this.isDestroyed || !this.canvas) return;
    if (width <= 0 || height <= 0) return;

    this.width = Math.floor(width);
    this.height = Math.floor(height);
    this.dpr = Math.max(1, dpr);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    if (this.ctx) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    if (!this.isRunning) {
      this.render();
    }
  }

  public setHoverCursor(x: number | null, y: number | null): void {
    this.hoverX = x;
    this.hoverY = y;
  }

  public clearHoverCursor(): void {
    this.hoverX = null;
    this.hoverY = null;
    if (this.onCursorInspect) {
      this.onCursorInspect(null);
    }
  }

  public start(): void {
    if (this.isRunning || this.isDestroyed) return;
    this.isRunning = true;
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning || this.isDestroyed) return;
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  /**
   * Main 60fps Zero-Allocation Render Pass
   */
  public render(): void {
    const ctx = this.ctx;
    if (!ctx || this.isDestroyed) return;
    const w = this.width;
    const h = this.height;
    if (w <= 0 || h <= 0) return;

    // 1. Fetch live frequency data without allocations
    this.fetchFrequencyData();

    // 2. Clear canvas with deep dark studio background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // 3. Render Background Grid Lines
    if (this.options.showGrid) {
      this.renderGrid(ctx, w, h);
    }

    // 4. Map Frequency Data to Pixel Y Coordinates
    this.mapDataToPixels(w, h);

    // 5. Render mode-specific visualization
    switch (this.displayMode) {
      case 'OVERLAY':
        this.renderOverlayMode(ctx, w, h);
        break;
      case 'DIFFERENTIAL':
        this.renderDifferentialMode(ctx, w, h);
        break;
      case 'GAP_ONLY':
        this.renderGapOnlyMode(ctx, w, h);
        break;
    }

    // 6. Render Dynamic Acoustic Callout Badges
    if (this.options.showAnnotations) {
      this.renderAnnotations(ctx, w, h);
    }

    // 7. Render Hover Crosshair & Tooltip
    this.renderHoverInspection(ctx, w, h);

    // 8. Throttled Metrics Callback (every ~100ms)
    this.dispatchMetrics();
  }

  private fetchFrequencyData(): void {
    if (this.rawAnalyser) {
      this.rawAnalyser.getFloatFrequencyData(this.rawFreqData);
    } else {
      this.rawFreqData.fill(this.options.minDecibels);
    }

    if (this.processedAnalyser) {
      this.processedAnalyser.getFloatFrequencyData(this.boneFreqData);
    } else {
      this.boneFreqData.fill(this.options.minDecibels);
    }
  }

  private mapDataToPixels(w: number, h: number): void {
    const alpha = this.options.smoothingAlpha;
    const invAlpha = 1.0 - alpha;
    const count = Math.min(w, this.maxPixels);

    for (let x = 0; x < count; x++) {
      const freq = xToFrequency(x, w, this.options.minFrequency, this.options.maxFrequency);
      const rawDb = interpolateMagnitude(this.rawFreqData, freq, this.sampleRate, this.fftSize, this.options.minDecibels);
      const boneDb = interpolateMagnitude(this.boneFreqData, freq, this.sampleRate, this.fftSize, this.options.minDecibels);

      const airY = dbToY(rawDb, h, this.options.minDecibels, this.options.maxDecibels);
      const boneY = dbToY(boneDb, h, this.options.minDecibels, this.options.maxDecibels);

      this.pixelAirY[x] = airY;
      this.pixelBoneY[x] = boneY;

      // Temporal Exponential Moving Average smoothing
      this.smoothedAirY[x] = alpha * airY + invAlpha * this.smoothedAirY[x];
      this.smoothedBoneY[x] = alpha * boneY + invAlpha * this.smoothedBoneY[x];
    }
  }

  private renderGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const ticks = getFrequencyGridTicks(this.options.minFrequency, this.options.maxFrequency);

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)'; // slate-800
    ctx.fillStyle = 'rgba(100, 116, 139, 0.7)'; // slate-500
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    // Vertical Frequency Grid Lines
    for (const tick of ticks) {
      const x = tick.xNormalized * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.fillText(tick.label, x, h - 6);
    }

    // Horizontal Decibel Reference Lines (-90dB, -60dB, -30dB)
    const dbTicks = [-90, -60, -30];
    ctx.textAlign = 'left';
    for (const db of dbTicks) {
      if (db >= this.options.minDecibels && db <= this.options.maxDecibels) {
        const y = dbToY(db, h, this.options.minDecibels, this.options.maxDecibels);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.fillText(`${db}dB`, 8, y - 4);
      }
    }

    ctx.restore();
  }

  private renderOverlayMode(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // 1. Render Differential Gap Area Fills (Cyan Boost & Amber/Rose Damping)
    if (this.options.showDifferentialGap) {
      this.renderDifferentialGapFills(ctx, w, h);
    }

    // 2. Render Ambient Glow Under Curves
    this.renderAmbientCurveFills(ctx, w, h);

    // 3. Render Air Conduction Spectrum Stroke (Sky Blue)
    if (this.options.showAirCurve) {
      this.renderCurve(ctx, this.smoothedAirY, w, this.options.airCurveColor, 1.75, false);
    }

    // 4. Render Bone Conduction Spectrum Stroke (Amber with subtle glow)
    if (this.options.showBoneCurve) {
      this.renderCurve(ctx, this.smoothedBoneY, w, this.options.boneCurveColor, 2.25, true);
    }
  }

  private renderDifferentialGapFills(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const stepPx = 2;
    const points = Math.ceil(w / stepPx);

    ctx.save();
    for (let i = 0; i < points - 1; i++) {
      const x0 = i * stepPx;
      const x1 = Math.min(w - 1, (i + 1) * stepPx);

      const yAir0 = this.smoothedAirY[x0];
      const yAir1 = this.smoothedAirY[x1];
      const yBone0 = this.smoothedBoneY[x0];
      const yBone1 = this.smoothedBoneY[x1];

      // Bone > Air (Bone is higher on screen -> yBone < yAir)
      if (yBone0 < yAir0 - 0.5 || yBone1 < yAir1 - 0.5) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.30)'; // cyan-500/30
        ctx.beginPath();
        ctx.moveTo(x0, yAir0);
        ctx.lineTo(x1, yAir1);
        ctx.lineTo(x1, yBone1);
        ctx.lineTo(x0, yBone0);
        ctx.closePath();
        ctx.fill();
      }
      // Air > Bone (Air is higher on screen -> yAir < yBone)
      else if (yAir0 < yBone0 - 0.5 || yAir1 < yBone1 - 0.5) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)'; // amber-500/25
        ctx.beginPath();
        ctx.moveTo(x0, yBone0);
        ctx.lineTo(x1, yBone1);
        ctx.lineTo(x1, yAir1);
        ctx.lineTo(x0, yAir0);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private renderAmbientCurveFills(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    if (this.options.showBoneCurve) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x < w; x++) {
        ctx.lineTo(x, this.smoothedBoneY[x]);
      }
      ctx.lineTo(w - 1, h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.05)';
      ctx.fill();
    }
    if (this.options.showAirCurve) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x < w; x++) {
        ctx.lineTo(x, this.smoothedAirY[x]);
      }
      ctx.lineTo(w - 1, h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
      ctx.fill();
    }
    ctx.restore();
  }

  private renderCurve(
    ctx: CanvasRenderingContext2D,
    curveY: Float32Array,
    w: number,
    color: string,
    lineWidth: number,
    glow: boolean
  ): void {
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
    }

    ctx.beginPath();
    ctx.moveTo(0, curveY[0]);
    for (let x = 1; x < w; x++) {
      ctx.lineTo(x, curveY[x]);
    }
    ctx.stroke();
    ctx.restore();
  }

  private renderDifferentialMode(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const centerY = h / 2;

    // 0dB Center Reference Line
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)'; // slate-400
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([4, 4]);
    }
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([]);
    }
    ctx.restore();

    // Plot Differential Delta Curve: deltaDb = boneDb - rawDb (+15dB to -15dB)
    ctx.save();
    const maxScaleDeltaDb = 15;

    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const freq = xToFrequency(x, w, this.options.minFrequency, this.options.maxFrequency);
      const rawDb = interpolateMagnitude(this.rawFreqData, freq, this.sampleRate, this.fftSize, this.options.minDecibels);
      const boneDb = interpolateMagnitude(this.boneFreqData, freq, this.sampleRate, this.fftSize, this.options.minDecibels);
      const deltaDb = boneDb - rawDb;

      const y = centerY - (deltaDb / maxScaleDeltaDb) * (h / 2.5);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#06b6d4'; // cyan-500
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
  }

  private renderGapOnlyMode(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const xLowStart = frequencyToX(50, w, this.options.minFrequency, this.options.maxFrequency);
    const xLowEnd = frequencyToX(300, w, this.options.minFrequency, this.options.maxFrequency);
    const xHighStart = frequencyToX(4000, w, this.options.minFrequency, this.options.maxFrequency);
    const xHighEnd = frequencyToX(16000, w, this.options.minFrequency, this.options.maxFrequency);

    ctx.save();
    // Highlight Cranial Bone Boost Band (50-300Hz)
    const lowGrad = ctx.createLinearGradient(xLowStart, 0, xLowEnd, 0);
    lowGrad.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
    lowGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.30)');
    lowGrad.addColorStop(1, 'rgba(6, 182, 212, 0.05)');
    ctx.fillStyle = lowGrad;
    ctx.fillRect(xLowStart, 0, Math.max(1, xLowEnd - xLowStart), h);

    // Highlight Skull Tissue Rolloff Band (>4kHz)
    const highGrad = ctx.createLinearGradient(xHighStart, 0, xHighEnd, 0);
    highGrad.addColorStop(0, 'rgba(244, 63, 94, 0.05)');
    highGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.25)');
    highGrad.addColorStop(1, 'rgba(244, 63, 94, 0.05)');
    ctx.fillStyle = highGrad;
    ctx.fillRect(xHighStart, 0, Math.max(1, xHighEnd - xHighStart), h);
    ctx.restore();

    this.renderOverlayMode(ctx, w, h);
  }

  private renderAnnotations(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // 1. Scan for Max Cranial Bone Boost (50Hz - 400Hz)
    let maxBoostDb = 0;
    let boostFreq = 180;
    let boostX = 0;
    let boostY = 0;

    const x50 = Math.floor(frequencyToX(50, w, this.options.minFrequency, this.options.maxFrequency));
    const x400 = Math.ceil(frequencyToX(400, w, this.options.minFrequency, this.options.maxFrequency));

    for (let x = x50; x <= x400 && x < w; x++) {
      const airY = this.smoothedAirY[x];
      const boneY = this.smoothedBoneY[x];
      const deltaPx = airY - boneY; // positive when bone is higher than air

      if (deltaPx > 6 && boneY < h - 15) {
        const deltaDb = (deltaPx / h) * (this.options.maxDecibels - this.options.minDecibels);
        if (deltaDb > maxBoostDb) {
          maxBoostDb = deltaDb;
          boostFreq = xToFrequency(x, w, this.options.minFrequency, this.options.maxFrequency);
          boostX = x;
          boostY = boneY;
        }
      }
    }

    // 2. Scan for Max Skull Tissue Damping (2500Hz - 8000Hz)
    let maxDampDb = 0;
    let dampFreq = 5000;
    let dampX = 0;
    let dampY = 0;

    const x2500 = Math.floor(frequencyToX(2500, w, this.options.minFrequency, this.options.maxFrequency));
    const x8000 = Math.ceil(frequencyToX(8000, w, this.options.minFrequency, this.options.maxFrequency));

    for (let x = x2500; x <= x8000 && x < w; x++) {
      const airY = this.smoothedAirY[x];
      const boneY = this.smoothedBoneY[x];
      const deltaPx = boneY - airY; // positive when air is higher than bone

      if (deltaPx > 6 && airY < h - 15) {
        const deltaDb = (deltaPx / h) * (this.options.maxDecibels - this.options.minDecibels);
        if (deltaDb > maxDampDb) {
          maxDampDb = deltaDb;
          dampFreq = xToFrequency(x, w, this.options.minFrequency, this.options.maxFrequency);
          dampX = x;
          dampY = airY;
        }
      }
    }

    // 3. Update Badge State & Interpolation
    this.updateBadgeState(this.boostBadge, maxBoostDb >= 1.5, boostX, boostY, maxBoostDb, boostFreq);
    this.updateBadgeState(this.dampBadge, maxDampDb >= 1.5, dampX, dampY, maxDampDb, dampFreq);

    // 4. Draw Badges
    const formatter: VisualizerLabelFormatter =
      this.options.labelFormatter || ((_key: string, defaultText: string) => defaultText);

    if (this.boostBadge.alpha > 0.05) {
      const dbStr = `+${this.boostBadge.valueDb.toFixed(1)}`;
      const freqStr = `${Math.round(this.boostBadge.freq)}Hz`;
      const defaultText = `Cranial Boost: ${dbStr}dB @ ${freqStr}`;
      const badgeText = formatter('visualizer.cranialBoost', defaultText, {
        db: dbStr,
        freq: freqStr,
      });

      this.drawBadge(
        ctx,
        this.boostBadge,
        badgeText,
        '#06b6d4',
        'rgba(8, 51, 68, 0.90)',
        'rgba(6, 182, 212, 0.80)',
        -28,
        w
      );
    }

    if (this.dampBadge.alpha > 0.05) {
      const freqLabel =
        this.dampBadge.freq >= 1000
          ? `${(this.dampBadge.freq / 1000).toFixed(1)}kHz`
          : `${Math.round(this.dampBadge.freq)}Hz`;
      const dbStr = `-${this.dampBadge.valueDb.toFixed(1)}`;
      const defaultText = `Tissue Damping: ${dbStr}dB @ ${freqLabel}`;
      const badgeText = formatter('visualizer.tissueDamping', defaultText, {
        db: dbStr,
        freq: freqLabel,
      });

      this.drawBadge(
        ctx,
        this.dampBadge,
        badgeText,
        '#f59e0b',
        'rgba(69, 26, 3, 0.90)',
        'rgba(245, 158, 11, 0.80)',
        -28,
        w
      );
    }
  }

  private updateBadgeState(
    badge: BadgeState,
    targetVisible: boolean,
    targetX: number,
    targetY: number,
    valueDb: number,
    freq: number
  ): void {
    const smooth = 0.2;
    if (targetVisible) {
      badge.visible = true;
      badge.alpha += (1.0 - badge.alpha) * smooth;
      badge.x += (targetX - badge.x) * smooth;
      badge.y += (targetY - badge.y) * smooth;
      badge.valueDb += (valueDb - badge.valueDb) * smooth;
      badge.freq += (freq - badge.freq) * smooth;
    } else {
      badge.alpha += (0.0 - badge.alpha) * 0.1;
      if (badge.alpha < 0.02) {
        badge.visible = false;
        badge.alpha = 0;
      }
    }
  }

  private drawBadge(
    ctx: CanvasRenderingContext2D,
    badge: BadgeState,
    text: string,
    accentColor: string,
    bgColor: string,
    borderColor: string,
    yOffset: number,
    w: number
  ): void {
    ctx.save();
    ctx.globalAlpha = Math.min(1.0, Math.max(0.0, badge.alpha));

    // Target Dot
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(badge.x, badge.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Leader Line
    const badgeY = Math.max(16, badge.y + yOffset);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(badge.x, badge.y);
    ctx.lineTo(badge.x, badgeY + 10);
    ctx.stroke();

    // Pill Box
    ctx.font = 'bold 9px monospace, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const boxW = Math.min(textWidth + 14, Math.max(40, w - 8));
    const boxH = 18;
    const boxX = Math.max(4, Math.min(w - boxW - 4, badge.x - boxW / 2));
    const boxY = badgeY - boxH / 2;

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Text
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxX + boxW / 2, boxY + boxH / 2);
    ctx.restore();
  }

  private renderHoverInspection(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.hoverX === null || this.hoverX < 0 || this.hoverX > w) return;

    const freq = xToFrequency(this.hoverX, w, this.options.minFrequency, this.options.maxFrequency);
    const rawDb = interpolateMagnitude(this.rawFreqData, freq, this.sampleRate, this.fftSize, this.options.minDecibels);
    const boneDb = interpolateMagnitude(this.boneFreqData, freq, this.sampleRate, this.fftSize, this.options.minDecibels);
    const deltaDb = boneDb - rawDb;

    const yRaw = dbToY(rawDb, h, this.options.minDecibels, this.options.maxDecibels);
    const yBone = dbToY(boneDb, h, this.options.minDecibels, this.options.maxDecibels);

    // Vertical Cursor Crosshair Line
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([3, 3]);
    }
    ctx.beginPath();
    ctx.moveTo(this.hoverX, 0);
    ctx.lineTo(this.hoverX, h);
    ctx.stroke();

    // Intersection Dots
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([]);
    }
    // Air Dot (Sky Blue)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(this.hoverX, yRaw, 4, 0, Math.PI * 2);
    ctx.fill();

    // Bone Dot (Amber)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(this.hoverX, yBone, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.onCursorInspect) {
      this.onCursorInspect({
        freq,
        rawDb,
        boneDb,
        deltaDb,
        x: this.hoverX,
        yRaw,
        yBone,
      });
    }
  }

  public getCursorInspectionData(): CursorInspectionData | null {
    if (this.hoverX === null || this.width <= 0 || this.height <= 0) return null;
    const freq = xToFrequency(this.hoverX, this.width, this.options.minFrequency, this.options.maxFrequency);
    const rawDb = interpolateMagnitude(this.rawFreqData, freq, this.sampleRate, this.fftSize, this.options.minDecibels);
    const boneDb = interpolateMagnitude(this.boneFreqData, freq, this.sampleRate, this.fftSize, this.options.minDecibels);
    const deltaDb = boneDb - rawDb;
    return {
      freq,
      rawDb,
      boneDb,
      deltaDb,
      x: this.hoverX,
      yRaw: dbToY(rawDb, this.height, this.options.minDecibels, this.options.maxDecibels),
      yBone: dbToY(boneDb, this.height, this.options.minDecibels, this.options.maxDecibels),
    };
  }

  private dispatchMetrics(): void {
    if (!this.onMetricsUpdate) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this.lastMetricsTime === 0 || now - this.lastMetricsTime > 100) {
      this.lastMetricsTime = now;
      const metrics = calculateSpectralGapMetrics(
        this.rawFreqData,
        this.boneFreqData,
        this.sampleRate,
        this.fftSize
      );
      this.onMetricsUpdate(metrics);
    }
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.stop();
    this.rawAnalyser = null;
    this.processedAnalyser = null;
    this.ctx = null;
  }
}
