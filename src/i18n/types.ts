/**
 * VocalMirror — i18n Core Types
 * 
 * Type definitions for bilingual localization (English / Japanese).
 */

export type Language = 'en' | 'ja';

export interface TranslationDictionary {
  app: {
    title: string;
    versionBadge: string;
    subtitle: string;
    footer: {
      tagline: string;
      latencyBadge: string;
      webAudioBadge: string;
    };
  };
  header: {
    status: {
      recording: string;
      playback: string;
      dspReady: string;
      standby: string;
    };
    latency: string;
    sampleRate: string;
    headphonesRecommended: string;
    guideButton: string;
    helpAria: string;
    helpTitle: string;
    languageToggle: string;
  };
  controls: {
    recordStart: string;
    recordStop: string;
    recordStartAria: string;
    recordStopAria: string;
    play: string;
    pause: string;
    playAria: string;
    pauseAria: string;
    loop: string;
    loopAria: string;
    export: string;
    exportAria: string;
    exportTitle: string;
    loadDemo: string;
    loadDemoAria: string;
    demoDropdownHeader: string;
    reset: string;
    resetAria: string;
    resetTitle: string;
    timelineAria: string;
    sources: {
      mic: string;
      sample: string;
      buffer: string;
      none: string;
    };
  };
  modes: {
    header: {
      title: string;
      badge: string;
      shortcutHint: string;
    };
    raw: {
      name: string;
      subtitle: string;
      acousticTag: string;
      description: string;
    };
    internal_sim: {
      name: string;
      subtitle: string;
      acousticTag: string;
      description: string;
    };
    compensated: {
      name: string;
      subtitle: string;
      acousticTag: string;
      description: string;
    };
    status: {
      active: string;
      clickToAudition: string;
      crossfade: string;
    };
  };
  presets: {
    header: {
      title: string;
      customBadge: string;
      resetButton: string;
      resetAria: string;
      selectAria: string;
    };
    items: {
      natural_standard: {
        name: string;
        tag: string;
        description: string;
      };
      deep_chest_male: {
        name: string;
        tag: string;
        description: string;
      };
      bright_cranial_female: {
        name: string;
        tag: string;
        description: string;
      };
      intense_confrontation: {
        name: string;
        tag: string;
        description: string;
      };
    };
  };
  parameters: {
    header: {
      title: string;
      subtitle: string;
      showAdvanced: string;
      hideAdvanced: string;
      resetAll: string;
    };
    sections: {
      chest: {
        title: string;
        subtitle: string;
      };
      cavity: {
        title: string;
        subtitle: string;
      };
    };
    labels: {
      lowShelfGain: string;
      lowShelfFreq: string;
      mandibleResGain: string;
      mandibleResFreq: string;
      mandibleResQ: string;
      sinusResGain: string;
      sinusResFreq: string;
      sinusResQ: string;
      antiResGain: string;
      antiResFreq: string;
      antiResQ: string;
      tissueCutoffFreq: string;
      tissueCutoffQ: string;
      highShelfGain: string;
      highShelfFreq: string;
      masterGain: string;
    };
    descriptions: {
      lowShelfGain: string;
      lowShelfFreq: string;
      mandibleResGain: string;
      mandibleResFreq: string;
      mandibleResQ: string;
      sinusResGain: string;
      sinusResFreq: string;
      sinusResQ: string;
      antiResGain: string;
      antiResFreq: string;
      antiResQ: string;
      tissueCutoffFreq: string;
      tissueCutoffQ: string;
      highShelfGain: string;
      highShelfFreq: string;
      masterGain: string;
    };
    row: {
      descAria: string;
      resetAria: string;
      resetTitle: string;
    };
  };
  analyzer: {
    title: string;
    subtitle: string;
    modes: {
      overlay: string;
      differential: string;
      gapOnly: string;
    };
    canvasAria: string;
    cursor: {
      air: string;
      bone: string;
      gap: string;
    };
    metrics: {
      lowBoost: {
        title: string;
        range: string;
        atFreq: string;
        desc: string;
      };
      tissueRolloff: {
        title: string;
        range: string;
        desc: string;
      };
      vci: {
        title: string;
        unit: string;
        max: string;
        desc: string;
      };
    };
    legend: {
      air: string;
      bone: string;
      gap: string;
      fft: string;
      fps: string;
    };
  };
  visualizer: {
    cranialBoost: string;
    tissueDamping: string;
  };
  guidance: {
    header: {
      title: string;
      badge: string;
      subtitle: string;
      toggleOpen: string;
      toggleClose: string;
      toggleAria: string;
    };
    overview: {
      title: string;
      subtitle: string;
      summary: string;
      bonePath: {
        title: string;
        anatomy: string;
        physics: string;
        impact: string;
      };
      airPath: {
        title: string;
        anatomy: string;
        physics: string;
        impact: string;
      };
      mechanism: {
        title: string;
        psychologicalAspect: string;
        resolutionStrategy: string;
      };
      table: {
        title: string;
        colBand: string;
        colRange: string;
        colSource: string;
        colShift: string;
        bands: {
          subBass: {
            name: string;
            range: string;
            source: string;
            role: string;
            delta: string;
          };
          mandible: {
            name: string;
            range: string;
            source: string;
            role: string;
            delta: string;
          };
          formants: {
            name: string;
            range: string;
            source: string;
            role: string;
            delta: string;
          };
          singers: {
            name: string;
            range: string;
            source: string;
            role: string;
            delta: string;
          };
          sibilance: {
            name: string;
            range: string;
            source: string;
            role: string;
            delta: string;
          };
        };
      };
    };
    cards: {
      bone_conduction_illusion: {
        title: string;
        japaneseTitle: string;
        category: string;
        categoryLabel: string;
        targetFrequency: string;
        targetBandName: string;
        tagline: string;
        scientificExplanation: string;
        anatomicalDetail: string;
        exercise: {
          name: string;
          objective: string;
          step1: string;
          step2: string;
          step3: string;
          step4: string;
          proTip: string;
        };
        studio: {
          sliderTip: string;
          actionLabel: string;
        };
        keyTakeaway: string;
      };
      chest_mask_resonance: {
        title: string;
        japaneseTitle: string;
        category: string;
        categoryLabel: string;
        targetFrequency: string;
        targetBandName: string;
        tagline: string;
        scientificExplanation: string;
        anatomicalDetail: string;
        exercise: {
          name: string;
          objective: string;
          step1: string;
          step2: string;
          step3: string;
          step4: string;
          proTip: string;
        };
        studio: {
          sliderTip: string;
          actionLabel: string;
        };
        keyTakeaway: string;
      };
      singers_formant: {
        title: string;
        japaneseTitle: string;
        category: string;
        categoryLabel: string;
        targetFrequency: string;
        targetBandName: string;
        tagline: string;
        scientificExplanation: string;
        anatomicalDetail: string;
        exercise: {
          name: string;
          objective: string;
          step1: string;
          step2: string;
          step3: string;
          step4: string;
          proTip: string;
        };
        studio: {
          sliderTip: string;
          actionLabel: string;
        };
        keyTakeaway: string;
      };
      mic_proximity_bridging: {
        title: string;
        japaneseTitle: string;
        category: string;
        categoryLabel: string;
        targetFrequency: string;
        targetBandName: string;
        tagline: string;
        scientificExplanation: string;
        anatomicalDetail: string;
        exercise: {
          name: string;
          objective: string;
          step1: string;
          step2: string;
          step3: string;
          step4: string;
          proTip: string;
        };
        studio: {
          sliderTip: string;
          actionLabel: string;
        };
        keyTakeaway: string;
      };
    };
    ui: {
      mechanismTitle: string;
      exerciseTitle: string;
      proTipLabel: string;
      acousticTipLabel: string;
      keyInsightLabel: string;
      targetModeLabel: string;
      switchToMode: string;
      activeInStudio: string;
    };
  };
  export: {
    title: string;
    subtitle: string;
    closeAria: string;
    audioLoaded: string;
    noAudio: string;
    channelMono: string;
    channelStereo: string;
    profileSelect: string;
    modes: {
      internal: {
        title: string;
        desc: string;
      };
      raw: {
        title: string;
        desc: string;
      };
      compensated: {
        title: string;
        desc: string;
      };
      all: {
        title: string;
        desc: string;
      };
    };
    bitDepth: {
      label: string;
      pcm16: string;
      float32: string;
    };
    filename: {
      label: string;
      placeholder: string;
    };
    warnings: {
      noAudioBuffer: string;
    };
    errors: {
      noBuffer: string;
      failed: string;
    };
    status: {
      rendering: string;
      completed: string;
    };
    buttons: {
      cancel: string;
      rendering: string;
      download: string;
    };
  };
  help: {
    title: string;
    closeAria: string;
    closeButton: string;
    sections: {
      transport: string;
      listening: string;
    };
    shortcuts: {
      playPause: string;
      recordStop: string;
      toggleLoop: string;
      help: string;
      modeA: string;
      modeB: string;
      modeC: string;
    };
    tip: {
      label: string;
      text: string;
    };
  };
  errors: {
    micPermissionDenied: string;
    micAccessFailed: string;
    micNotSupported: string;
    decodeFailed: string;
    demoLoadFailed: string;
    playbackFailed: string;
    contextResumeFailed: string;
  };
  samples: {
    male_baritone: {
      name: string;
      description: string;
    };
    female_alto: {
      name: string;
      description: string;
    };
    tenor_vowel_ah: {
      name: string;
      description: string;
    };
  };
}

export type TranslationKey = string;
