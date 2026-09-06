import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Keyboard,
  Headphones,
  AlertTriangle,
} from 'lucide-react';
import { StudioHeader } from './components/StudioHeader';
import { AudioControls } from './components/AudioControls';
import { ModeSelector } from './components/ModeSelector';
import { PresetSelector } from './components/PresetSelector';
import { ParameterSliders } from './components/ParameterSliders';
import { SpectralGapAnalyzer } from './components/SpectralGapAnalyzer';
import { GuidanceCards } from './components/GuidanceCards';
import { ExportModal } from './components/ExportModal';
import { PricingModal } from './components/PricingModal';
import { CustomPresetModal } from './components/CustomPresetModal';
import { VoiceConfrontationHero } from './components/VoiceConfrontationHero';
import { useAudioStudio } from './hooks/useAudioStudio';
import { useProPlan } from './hooks/useProPlan';
import { LanguageProvider, useTranslation } from './i18n';

const StudioMain: React.FC = () => {
  const { t } = useTranslation();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const studio = useAudioStudio();
  const proPlan = useProPlan();

  // Global Keyboard Shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Avoid firing shortcuts when interacting with input elements
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Handle numbers 1, 2, 3 via either e.key or e.code
      if (e.key === '1' || e.code === 'Digit1') {
        e.preventDefault();
        studio.setMode('RAW');
        return;
      }
      if (e.key === '2' || e.code === 'Digit2') {
        e.preventDefault();
        studio.setMode('INTERNAL_SIM');
        return;
      }
      if (e.key === '3' || e.code === 'Digit3') {
        e.preventDefault();
        studio.setMode('COMPENSATED');
        return;
      }

      // Handle Space
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        studio.togglePlay();
        return;
      }

      // Handle R
      if (e.key === 'r' || e.key === 'R' || e.code === 'KeyR') {
        e.preventDefault();
        if (studio.isRecording) {
          studio.stopRecording();
        } else {
          studio.startRecording();
        }
        return;
      }

      // Handle L
      if (e.key === 'l' || e.key === 'L' || e.code === 'KeyL') {
        e.preventDefault();
        studio.toggleLoop();
        return;
      }

      // Handle Export (E)
      if (e.key === 'e' || e.key === 'E' || e.code === 'KeyE') {
        e.preventDefault();
        setIsExportOpen((prev) => !prev);
        return;
      }

      // Handle Pricing / Pro (P)
      if (e.key === 'p' || e.key === 'P' || e.code === 'KeyP') {
        e.preventDefault();
        proPlan.openPricing();
        return;
      }

      // Handle Help (H or ?)
      if (e.key === 'h' || e.key === 'H' || e.key === '?' || e.code === 'KeyH') {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
        return;
      }

      // Handle Escape
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (isHelpOpen) {
          e.preventDefault();
          setIsHelpOpen(false);
        }
        if (isExportOpen) {
          e.preventDefault();
          setIsExportOpen(false);
        }
        if (proPlan.isPricingOpen) {
          e.preventDefault();
          proPlan.closePricing();
        }
        if (proPlan.isCustomPresetModalOpen) {
          e.preventDefault();
          proPlan.closeCustomPresetModal();
        }
        return;
      }
    },
    [studio, isHelpOpen, isExportOpen, proPlan]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950 font-sans flex flex-col justify-between">
      {/* 1. Header Navigation */}
      <StudioHeader
        contextState={studio.contextState}
        isRecording={studio.isRecording}
        isPlaying={studio.isPlaying}
        activeMode={studio.mode}
        latencyMs={studio.latencyMs}
        sampleRate={studio.sampleRate}
        onOpenHelp={() => setIsHelpOpen(true)}
        isPro={proPlan.isPro}
        onOpenPricing={proPlan.openPricing}
      />

      {/* 2. Main Studio Viewport */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Voice Confrontation Educational & Value Proposition Hero Banner */}
        <VoiceConfrontationHero
          onOpenGuidance={() => {
            const el = document.getElementById('guidance-cards-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onOpenPricing={proPlan.openPricing}
          isPro={proPlan.isPro}
        />

        {/* Error Alert Banner */}
        {studio.error && (
          <div className="flex items-center space-x-3 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-rose-200 shadow-lg">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            <div className="flex-1 text-sm font-medium">{studio.error}</div>
          </div>
        )}

        {/* Hero Transport Bar */}
        <AudioControls
          isRecording={studio.isRecording}
          isPlaying={studio.isPlaying}
          isLooping={studio.isLooping}
          hasAudio={studio.hasAudio}
          currentTime={studio.currentTime}
          duration={studio.duration}
          audioSourceType={studio.audioSourceType}
          recordingDuration={studio.recordingDuration}
          onStartRecording={studio.startRecording}
          onStopRecording={studio.stopRecording}
          onTogglePlay={studio.togglePlay}
          onToggleLoop={studio.toggleLoop}
          onSeek={studio.seek}
          onLoadDemo={studio.loadDemoAudio}
          onClearAudio={studio.clearAudio}
          onOpenExport={() => setIsExportOpen(true)}
        />

        {/* Centerpiece A/B/C Perceptual Listening Switcher */}
        <ModeSelector
          activeMode={studio.mode}
          onModeChange={studio.setMode}
          isPlaying={studio.isPlaying}
        />

        {/* 2-Column Responsive Workspace Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (Width 7/12): Calibrator Sliders & Presets */}
          <div className="space-y-6 lg:col-span-7">
            <PresetSelector
              currentPreset={studio.currentPreset}
              onSelectPreset={studio.setPreset}
              onResetToDefault={studio.resetAllParams}
              customPresets={proPlan.customPresets}
              onSelectCustomPreset={(preset) => studio.updateParameters(preset.params)}
              onOpenSaveCustomPreset={proPlan.openCustomPresetModal}
              onDeleteCustomPreset={proPlan.deletePreset}
              onExportPresets={() => {
                const json = proPlan.exportPresets();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vocalmirror_custom_presets_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              onImportPresets={proPlan.importPresets}
              isPro={proPlan.isPro}
              onOpenPricing={proPlan.openPricing}
            />

            <ParameterSliders
              params={studio.params}
              onChangeParam={studio.updateParam}
              onResetParam={studio.resetParam}
              onResetAll={studio.resetAllParams}
              isPro={proPlan.isPro}
              onOpenPricing={proPlan.openPricing}
            />
          </div>

          {/* Right Column (Width 5/12): Spectral Visualizer & Psychoacoustic Guidance Cards */}
          <div className="space-y-6 lg:col-span-5">
            {/* Visualizer Container (Milestone 3 SpectralGapAnalyzer) */}
            <SpectralGapAnalyzer
              rawAnalyser={studio.rawAnalyser}
              processedAnalyser={studio.processedAnalyser}
              isPlaying={studio.isPlaying}
              isRecording={studio.isRecording}
              sampleRate={studio.sampleRate}
            />

            {/* Psychoacoustic Guidance Module (Milestone 4 GuidanceCards) */}
            <div id="guidance-cards-section">
              <GuidanceCards
                activeMode={studio.mode}
                currentMode={studio.mode}
                activePreset={studio.currentPreset}
                onSelectMode={studio.setMode}
                onSelectPreset={studio.setPreset}
                onApplyPreset={studio.setPreset}
                isPro={proPlan.isPro}
                onOpenPricing={proPlan.openPricing}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Export Modal Dialog */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        audioBuffer={studio.audioBuffer}
        currentMode={studio.mode}
        params={studio.params}
        currentParams={studio.params}
        sampleRate={studio.sampleRate}
        isPro={proPlan.isPro}
        onOpenPricing={proPlan.openPricing}
      />

      {/* Pro Pricing & Checkout Modal */}
      <PricingModal
        isOpen={proPlan.isPricingOpen}
        onClose={proPlan.closePricing}
        proPlan={proPlan}
      />

      {/* Custom Anatomical Preset Modal */}
      <CustomPresetModal
        isOpen={proPlan.isCustomPresetModalOpen}
        onClose={proPlan.closeCustomPresetModal}
        currentParams={studio.params}
        onSavePreset={proPlan.savePreset}
      />

      {/* 3. Studio Footer */}
      <footer
        className="border-t border-slate-800/80 bg-slate-950/90 px-4 py-4 text-center text-xs text-slate-500"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <p>
            {t('app.footer.tagline')}
          </p>
          <div className="flex items-center space-x-4">
            <span className="font-mono font-semibold text-cyan-400/90">{t('app.versionBadge')}</span>
            <span>&bull;</span>
            <span className="font-mono text-slate-400">{t('app.footer.latencyBadge')}</span>
            <span>&bull;</span>
            <span className="font-mono text-slate-400">{t('app.footer.webAudioBadge')}</span>
          </div>
        </div>
      </footer>

      {/* 4. Keyboard Shortcuts & User Guide Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Keyboard className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  {t('help.title')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                aria-label={t('help.closeAria')}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div>
                <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px] mb-2 text-cyan-400">
                  {t('help.sections.transport')}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2 border border-slate-800">
                    <span>{t('help.shortcuts.playPause')}</span>
                    <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-cyan-300 font-bold">Space</kbd>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2 border border-slate-800">
                    <span>{t('help.shortcuts.recordStop')}</span>
                    <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-rose-300 font-bold">R</kbd>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2 border border-slate-800">
                    <span>{t('help.shortcuts.toggleLoop')}</span>
                    <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-cyan-300 font-bold">L</kbd>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2 border border-slate-800">
                    <span>{t('help.shortcuts.help')}</span>
                    <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-cyan-300 font-bold">H / ?</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 uppercase tracking-wider text-[11px] mb-2 text-amber-400">
                  {t('help.sections.listening')}
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2 border border-slate-800">
                    <span>{t('help.shortcuts.modeA')}</span>
                    <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-sky-300 font-bold">1</kbd>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2 border border-slate-800">
                    <span>{t('help.shortcuts.modeB')}</span>
                    <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-amber-300 font-bold">2</kbd>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2 border border-slate-800">
                    <span>{t('help.shortcuts.modeC')}</span>
                    <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-emerald-300 font-bold">3</kbd>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/30 p-3 flex items-start space-x-2 text-indigo-200">
                <Headphones className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Tip:</strong> {t('help.tip.text')}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              >
                {t('help.closeButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <StudioMain />
    </LanguageProvider>
  );
};

export default App;
