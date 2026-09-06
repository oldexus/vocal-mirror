/**
 * VocalMirror — Custom Anatomical Preset Save & Management Modal
 * 
 * Allows users to store, name, and annotate custom 16-parameter DSP profiles.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Sparkles, Check } from 'lucide-react';
import { DSPParameters } from '../types/audio';
import { useTranslation } from '../i18n';

export interface CustomPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParams: DSPParameters;
  onSavePreset: (data: {
    name: string;
    tag?: string;
    description?: string;
    params: DSPParameters;
  }) => void;
}

export const CustomPresetModal: React.FC<CustomPresetModalProps> = ({
  isOpen,
  onClose,
  currentParams,
  onSavePreset,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTag('CUSTOM');
      setDescription('');
      setSavedSuccess(false);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.code === 'Escape') && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'Custom Acoustic Profile';
    onSavePreset({
      name: finalName,
      tag: tag.trim() || 'CUSTOM',
      description: description.trim() || 'User calibrated physiological DSP profile.',
      params: { ...currentParams },
    });
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in"
      data-testid="custom-preset-modal"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              {t('customPresets.modalTitle')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {savedSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2 text-emerald-400">
            <Check className="h-10 w-10 animate-bounce" />
            <p className="text-sm font-bold">Preset Saved Successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Name Input */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-300">
                {t('customPresets.nameLabel')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('customPresets.namePlaceholder')}
                required
                maxLength={50}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Tag Input */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-300">
                {t('customPresets.tagLabel')}
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder={t('customPresets.tagPlaceholder')}
                maxLength={16}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 uppercase font-mono"
              />
            </div>

            {/* Description Input */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-300">
                {t('customPresets.descLabel')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('customPresets.descPlaceholder')}
                rows={3}
                maxLength={200}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                {t('customPresets.cancelAction')}
              </button>
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition-colors shadow-md"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{t('customPresets.saveAction')}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
