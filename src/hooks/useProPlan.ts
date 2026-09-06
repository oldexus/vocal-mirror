/**
 * VocalMirror — useProPlan Hook
 * 
 * Provides reactive access to Pro license status, pricing modal visibility,
 * and custom anatomical DSP preset management.
 */

import { useState, useEffect, useCallback } from 'react';
import { LicenseRecord, CustomAcousticPreset, PlanTier } from '../types/licensing';
import { DSPParameters } from '../types/audio';
import {
  getStoredLicense,
  activateWithKey,
  activateDemoPro,
  deactivatePro,
  checkUrlForActivation,
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  exportCustomPresetsJson,
  importCustomPresetsJson,
} from '../utils/licenseManager';

export interface UseProPlanReturn {
  isPro: boolean;
  tier: PlanTier;
  licenseRecord: LicenseRecord;
  isPricingOpen: boolean;
  isCustomPresetModalOpen: boolean;
  customPresets: CustomAcousticPreset[];
  openPricing: () => void;
  closePricing: () => void;
  openCustomPresetModal: () => void;
  closeCustomPresetModal: () => void;
  activateKey: (key: string) => { success: boolean; message?: string };
  activateDemo: () => void;
  deactivate: () => void;
  savePreset: (data: { name: string; tag?: string; description?: string; params: DSPParameters }) => CustomAcousticPreset;
  deletePreset: (id: string) => void;
  exportPresets: () => string;
  importPresets: (jsonStr: string) => { success: boolean; count: number; error?: string };
  refreshPresets: () => void;
}

export function useProPlan(): UseProPlanReturn {
  const [licenseRecord, setLicenseRecord] = useState<LicenseRecord>(() => getStoredLicense());
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);
  const [isCustomPresetModalOpen, setIsCustomPresetModalOpen] = useState<boolean>(false);
  const [customPresets, setCustomPresets] = useState<CustomAcousticPreset[]>(() => getCustomPresets());

  // Check URL parameters upon initial mount (e.g. checkout return)
  useEffect(() => {
    const activatedFromUrl = checkUrlForActivation();
    if (activatedFromUrl) {
      setLicenseRecord(getStoredLicense());
    }
  }, []);

  const openPricing = useCallback(() => setIsPricingOpen(true), []);
  const closePricing = useCallback(() => setIsPricingOpen(false), []);

  const openCustomPresetModal = useCallback(() => setIsCustomPresetModalOpen(true), []);
  const closeCustomPresetModal = useCallback(() => setIsCustomPresetModalOpen(false), []);

  const activateKey = useCallback((key: string) => {
    const result = activateWithKey(key);
    if (result.success && result.record) {
      setLicenseRecord(result.record);
    }
    return result;
  }, []);

  const activateDemo = useCallback(() => {
    const record = activateDemoPro();
    setLicenseRecord(record);
  }, []);

  const deactivate = useCallback(() => {
    deactivatePro();
    setLicenseRecord(getStoredLicense());
  }, []);

  const refreshPresets = useCallback(() => {
    setCustomPresets(getCustomPresets());
  }, []);

  const handleSavePreset = useCallback(
    (data: { name: string; tag?: string; description?: string; params: DSPParameters }) => {
      const saved = saveCustomPreset(data);
      refreshPresets();
      return saved;
    },
    [refreshPresets]
  );

  const handleDeletePreset = useCallback(
    (id: string) => {
      deleteCustomPreset(id);
      refreshPresets();
    },
    [refreshPresets]
  );

  const handleExportPresets = useCallback(() => {
    return exportCustomPresetsJson();
  }, []);

  const handleImportPresets = useCallback(
    (jsonStr: string) => {
      const res = importCustomPresetsJson(jsonStr);
      if (res.success) {
        refreshPresets();
      }
      return res;
    },
    [refreshPresets]
  );

  return {
    isPro: licenseRecord.isPro,
    tier: licenseRecord.tier,
    licenseRecord,
    isPricingOpen,
    isCustomPresetModalOpen,
    customPresets,
    openPricing,
    closePricing,
    openCustomPresetModal,
    closeCustomPresetModal,
    activateKey,
    activateDemo,
    deactivate,
    savePreset: handleSavePreset,
    deletePreset: handleDeletePreset,
    exportPresets: handleExportPresets,
    importPresets: handleImportPresets,
    refreshPresets,
  };
}
