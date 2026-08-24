/**
 * VocalMirror — Psychoacoustic Guidance & Vocal Training Content
 * 
 * Comprehensive educational content explaining the physiology of Voice Confrontation,
 * anatomical acoustic pathways, and actionable vocal acoustic training exercises.
 */

import { ListeningMode, PhysiologicalPresetKey } from '../types/audio';

export interface FrequencyBandInfo {
  band: string;
  rangeHz: string;
  anatomicalSource: string;
  perceptualRole: string;
  boneVsAirDelta: string;
}

export interface PsychoacousticOverview {
  title: string;
  subtitle: string;
  summary: string;
  boneConductionPath: {
    title: string;
    anatomy: string;
    physics: string;
    perceptualImpact: string;
  };
  airConductionPath: {
    title: string;
    anatomy: string;
    physics: string;
    perceptualImpact: string;
  };
  confrontationMechanism: {
    title: string;
    psychologicalAspect: string;
    resolutionStrategy: string;
  };
  frequencyBands: FrequencyBandInfo[];
}

export interface VocalTrainingCard {
  id: string;
  indexNumber: string; // '01', '02', '03', '04'
  title: string;
  japaneseTitle: string;
  category: 'Psychoacoustics' | 'Resonance' | 'Projection' | 'Engineering' | 'physics' | 'psychology' | 'technique' | 'tips';
  categoryLabel?: string;
  badgeColor: string;
  targetFrequency: string; // e.g. '50 - 300 Hz'
  targetBandName: string;
  tagline: string;
  scientificExplanation: string;
  anatomicalDetail: string;
  practicalExercise: {
    name: string;
    objective: string;
    steps: string[];
    proTip: string;
  };
  studioIntegration: {
    recommendedMode: ListeningMode;
    recommendedPreset: PhysiologicalPresetKey;
    sliderTip: string;
    actionLabel: string;
  };
  keyTakeaway: string;
}

export interface GuidanceItem {
  id: string;
  category: 'physics' | 'psychology' | 'technique' | 'tips';
  categoryLabel: string;
  title: string;
  shortSummary: string;
  expandedContent: {
    description: string;
    keyPoints: string[];
    acousticTip?: string;
    actionPreset?: PhysiologicalPresetKey;
    actionLabel?: string;
  };
  iconName?: string;
}

export const PSYCHOACOUSTIC_OVERVIEW: PsychoacousticOverview = {
  title: 'The Physics of Voice Confrontation',
  subtitle: 'Why Your Recorded Voice Sounds Unfamiliar & How to Bridge the Acoustic Gap',
  summary:
    'Voice Confrontation is not an auditory defect—it is a fundamental physical divergence between the dual internal pathways (cranial bone + air) and the external recording pathway (air only).',
  boneConductionPath: {
    title: 'Internal Bone Conduction Pathway (骨伝導伝達系)',
    anatomy: 'Vocal Folds -> Thyroid Cartilage -> Mandible & Temporal Bones -> Cochlea Fluid',
    physics:
      'Cranial bone mass and viscoelastic tissues act as a low-pass acoustic resonator, boosting 50-300 Hz by +6 to +14 dB while damping frequencies above 3.5 kHz by -12 dB.',
    perceptualImpact:
      'Creates the deep, resonant, warm vocal tone you perceive internally throughout your daily life.',
  },
  airConductionPath: {
    title: 'External Air Conduction Pathway (気導音伝達系)',
    anatomy:
      'Vocal Tract -> Mouth & Lips -> Room Acoustics -> Microphone / Ear Canal -> Tympanic Membrane',
    physics:
      'Sound radiates through air with a +6 dB/octave high-frequency radiation boost, preserving full vowel formants (F1-F4) and sharp sibilants (4-8 kHz).',
    perceptualImpact:
      'The objective, clear acoustic wave captured by recording microphones and heard by everyone around you.',
  },
  confrontationMechanism: {
    title: 'The Psychoacoustic Conflict (音声対峙のメカニズム)',
    psychologicalAspect:
      "Because your brain's internal self-image is calibrated to [Bone + Air], hearing [Air Only] in a recording creates a sudden loss of perceived bass, making your voice sound surprisingly thin or high-pitched.",
    resolutionStrategy:
      'By training vocal tract resonance (Chest & Mask Placement) and understanding microphone proximity, you can project natural acoustic warmth into air conduction.',
  },
  frequencyBands: [
    {
      band: 'Sub-Bass & Laryngeal',
      rangeHz: '50 - 150 Hz',
      anatomicalSource: 'Thyroid cartilage vibration & subglottal pressure',
      perceptualRole: 'Fundamental pitch power & foundation weight',
      boneVsAirDelta: '+8 to +12 dB Bone Conduction Dominance',
    },
    {
      band: 'Mandibular Resonance',
      rangeHz: '150 - 350 Hz',
      anatomicalSource: 'Lower jawbone (Mandible) mechanical oscillation',
      perceptualRole: 'Warmth, chest resonance, voice fullness',
      boneVsAirDelta: '+6 to +10 dB Bone Conduction Dominance',
    },
    {
      band: 'Vocal Tract Formants',
      rangeHz: '400 - 2500 Hz',
      anatomicalSource: 'Pharyngeal and oral cavity vowel shaping (F1, F2)',
      perceptualRole: "Vowel identification ('Ah', 'Ee', 'Oh') & clarity",
      boneVsAirDelta: 'Balanced (0 to -2 dB difference)',
    },
    {
      band: "Singer's Formant & Ring",
      rangeHz: '2800 - 3500 Hz',
      anatomicalSource: 'Epilaryngeal tube resonance clustering (F3-F5)',
      perceptualRole: 'Projection, acoustic carry, metallic brilliance',
      boneVsAirDelta: '+4 to +8 dB Air Conduction Dominance',
    },
    {
      band: 'Sibilance & Air Clarity',
      rangeHz: '4000 - 12000 Hz',
      anatomicalSource: 'Teeth, tongue-tip fricatives, lip radiation slope',
      perceptualRole: "Consonant articulation ('S', 'T', 'Sh') & air breath",
      boneVsAirDelta: '+8 to +14 dB Air Conduction Dominance (Heavy Bone Damping)',
    },
  ],
};

export const VOCAL_TRAINING_CARDS: VocalTrainingCard[] = [
  {
    id: 'bone_conduction_illusion',
    indexNumber: '01',
    title: 'The Bone Conduction Illusion',
    japaneseTitle: '骨伝導の錯覚（なぜ録音は薄く聴こえるのか）',
    category: 'Psychoacoustics',
    categoryLabel: 'Physics / Bone Conduction',
    badgeColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    targetFrequency: '50 - 300 Hz',
    targetBandName: 'Cranial Bone Resonance Boost',
    tagline: 'Your skull adds +10dB of bass that no one else can hear.',
    scientificExplanation:
      'The human skull is a natural acoustic filter. When you speak, the dense bone surrounding your cochlea transmits low frequencies directly to your inner ear with up to +12dB of mechanical amplification. The air around you never receives this bass boost.',
    anatomicalDetail:
      'Temporal bone transmission bypasses the tympanic membrane entirely, delivering low-frequency fundamental harmonics straight to the basilar membrane.',
    practicalExercise: {
      name: 'The Occlusion Test & Ear-Cup Method',
      objective: 'Isolate pure bone conduction to perceive the acoustic filter contrast.',
      steps: [
        'Cup both palms firmly over your ears to eliminate external air conduction.',
        'Hum a continuous pitch at your natural speaking tone (feel the booming skull vibration).',
        "Release your hands while continuing to hum—notice how the sound immediately 'thins out'.",
        'Accept that the open sound is the genuine physical acoustic wave reaching your audience.',
      ],
      proTip:
        'Listen to Mode B in VocalMirror with good headphones—this is the exact skull EQ curve your brain expects.',
    },
    studioIntegration: {
      recommendedMode: 'INTERNAL_SIM',
      recommendedPreset: 'intense_confrontation',
      sliderTip:
        'Set Low-Shelf Boost to +10dB and Mandible Resonance to 200Hz to experience full skull coloration.',
      actionLabel: 'Simulate Internal Bone Sound',
    },
    keyTakeaway:
      'Your recorded voice is not deficient; it is simply the uncolored truth of air conduction.',
  },
  {
    id: 'chest_mask_resonance',
    indexNumber: '02',
    title: 'Chest Resonance & Mask Placement',
    japaneseTitle: '胸声とマスク共鳴（気導音に自然な温かみを宿す）',
    category: 'Resonance',
    categoryLabel: 'Technique / Resonance',
    badgeColor: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
    targetFrequency: '200 - 500 Hz',
    targetBandName: 'First Formant (F1) & Pharyngeal Cavity',
    tagline: 'Channel warmth into the air without straining your vocal folds.',
    scientificExplanation:
      'You cannot transmit bone conduction through the room, but you CAN reinforce low-mid frequencies (200-400Hz) in air conduction by lowering the larynx slightly and directing airflow into the hard palate and facial mask.',
    anatomicalDetail:
      'Expanding the pharyngeal space lowers the first formant (F1), creating warm body resonance while forward facial vibrations prevent vocal fatigue.',
    practicalExercise: {
      name: 'Sirening & Forward Mask Humming',
      objective:
        'Shift acoustic energy from pressed throat constriction into resonant facial chambers.',
      steps: [
        'Gently place your fingertips on the bridge of your nose and upper lips.',
        "Produce a soft 'Mmm...' hum until you feel distinct buzzing vibrations under your fingertips.",
        "Without changing the buzzing sensation, slowly morph 'Mmm' into an open 'Mmm-Ahhh'.",
        'Maintain that forward sensation to project full-bodied low-mid acoustic warmth into the air.',
      ],
      proTip:
        'Keep the back of your neck relaxed and jaw unclenched to maximize pharyngeal volume.',
    },
    studioIntegration: {
      recommendedMode: 'COMPENSATED',
      recommendedPreset: 'deep_chest_male',
      sliderTip:
        'Use Mode C (Compensated) to hear how a 250Hz resonance boost enhances external projection.',
      actionLabel: 'Try Compensated Tone',
    },
    keyTakeaway:
      'True vocal warmth in air conduction comes from relaxed pharyngeal expansion, not forced throat pressing.',
  },
  {
    id: 'singers_formant',
    indexNumber: '03',
    title: "The Singer's Formant",
    japaneseTitle: 'シンガーズ・フォルマント（力まない 3kHz の響きと明瞭度）',
    category: 'Projection',
    categoryLabel: 'Psychology / Confrontation',
    badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    targetFrequency: '2.8 - 3.5 kHz',
    targetBandName: 'Epilaryngeal Resonance Cluster',
    tagline: 'Cut through background noise with effortless 3kHz acoustic carry.',
    scientificExplanation:
      'Human outer ear canals naturally amplify sound around 3kHz. Professional vocalists and voice actors cluster their 3rd, 4th, and 5th formants into a tight 2.8-3.4kHz acoustic peak. This allows voices to ring clearly over loud backgrounds without pushing volume.',
    anatomicalDetail:
      'Narrowing the epilaryngeal tube (aryepiglottic sphincter) relative to the wide pharynx acts as an impedance-matching acoustic horn.',
    practicalExercise: {
      name: 'The Twang & Ring Resonance Drill',
      objective: 'Isolate epilaryngeal narrowing for bright acoustic projection.',
      steps: [
        "Imitate a playful duck cackle or a bright brassy 'Nyah-Nyah' sound at medium pitch.",
        'Notice the bright, laser-like metallic resonance in the roof of your mouth.',
        "Now speak a normal sentence while keeping 10% of that 'ring' embedded in your tone.",
        'Observe how your voice gains instant clarity and presence without shouting.',
      ],
      proTip:
        'Check the Spectral Gap Analyzer in Mode A—look for a distinct energy hump between 2.8kHz and 3.5kHz.',
    },
    studioIntegration: {
      recommendedMode: 'RAW',
      recommendedPreset: 'bright_cranial_female',
      sliderTip:
        'Notice on the visualizer how bone conduction heavily damps 3kHz, making air conduction sound much crisper.',
      actionLabel: 'Inspect 3kHz Air Clarity',
    },
    keyTakeaway:
      'Acoustic brilliance at 3kHz is an impedance trick of the vocal tract, requiring zero muscular strain.',
  },
  {
    id: 'mic_proximity_bridging',
    indexNumber: '04',
    title: 'Microphone Proximity & Acoustic Bridging',
    japaneseTitle: 'マイク近接効果と音響ブリッジング（録音技術の最適化）',
    category: 'Engineering',
    categoryLabel: 'Pro Tips / Acoustics',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    targetFrequency: '50 - 200 Hz',
    targetBandName: 'Velocity Gradient Low-End Boost',
    tagline: 'Harness directional mic physics to capture internal-like intimacy.',
    scientificExplanation:
      'Directional microphones (cardioid / figure-8) naturally boost low frequencies (<200Hz) when the sound source is close (2-8cm). This physics phenomenon—the Proximity Effect—allows you to record an external audio track that closely mimics your internal perceived bass.',
    anatomicalDetail:
      'Spherical wave curvature at close distances increases the pressure gradient across the microphone diaphragm, adding +6 to +15dB of rich bass naturally.',
    practicalExercise: {
      name: 'The 3-Distance Proximity Calibration',
      objective: 'Map the acoustic difference of microphone distance.',
      steps: [
        'Position 1 (30cm): Record a sentence—sounds neutral, thin, and room-ambient.',
        'Position 2 (15cm): Record the same sentence—studio vocal standard balance.',
        'Position 3 (4-5cm with pop filter): Record again—deep, radio-host intimacy with heavy bass.',
        'Play all three in VocalMirror to discover your ideal physical acoustic balance.',
      ],
      proTip:
        "Always use a pop filter when working within 5cm to prevent plosive 'P' and 'B' air blasts.",
    },
    studioIntegration: {
      recommendedMode: 'INTERNAL_SIM',
      recommendedPreset: 'natural_standard',
      sliderTip:
        'A 5cm proximity recording naturally bridges 80% of the bone-conduction gap without post-processing.',
      actionLabel: 'Compare with Mic Baseline',
    },
    keyTakeaway:
      'Microphone placement is acoustic EQ: move closer for warmth, pull back for clarity.',
  },
];

export const DEFAULT_GUIDANCE_ITEMS: GuidanceItem[] = [
  {
    id: 'bone_conduction_illusion',
    category: 'physics',
    categoryLabel: 'Physics / Bone Conduction',
    title: 'The Bone Conduction Illusion',
    shortSummary: 'Why your skull adds +10dB of bass that microphones never capture.',
    expandedContent: {
      description:
        'The human skull acts as a mechanical low-pass resonator, boosting 50-300Hz by up to +12dB straight into the inner ear.',
      keyPoints: [
        'Bone conduction bypasses the eardrum, directly vibrating the cochlea.',
        'Air conduction radiates outward with high-frequency emphasis.',
        'Voice Confrontation happens because your brain misses the internal low-end.',
      ],
      acousticTip: 'Use Mode B to simulate your familiar internal skull resonance.',
      actionPreset: 'intense_confrontation',
      actionLabel: 'Apply Bone Preset',
    },
  },
  {
    id: 'chest_mask_resonance',
    category: 'technique',
    categoryLabel: 'Technique / Resonance',
    title: 'Chest Resonance & Mask Placement',
    shortSummary: 'Project natural acoustic warmth into air conduction without straining.',
    expandedContent: {
      description:
        'Expanding pharyngeal space lowers F1 formant frequency, adding external body warmth.',
      keyPoints: [
        'Gentle forward humming places resonance in the facial mask.',
        'Relaxing the larynx prevents vocal fatigue.',
        'Creates full-bodied acoustic energy for external listeners.',
      ],
      acousticTip: 'Try Mode C to hear compensated external tone.',
      actionPreset: 'deep_chest_male',
      actionLabel: 'Apply Chest Preset',
    },
  },
  {
    id: 'singers_formant',
    category: 'psychology',
    categoryLabel: 'Psychology / Confrontation',
    title: "The Singer's Formant (3kHz Peak)",
    shortSummary: 'Effortless projection and presence through acoustic horn narrowing.',
    expandedContent: {
      description:
        'Clustering formants F3-F5 around 2.8-3.4kHz allows voices to cut through background noise.',
      keyPoints: [
        'Matches human ear canal natural amplification at 3kHz.',
        'Gives brilliance and carry without muscular volume pushing.',
        'Easily inspected on the Spectral Gap Analyzer.',
      ],
      acousticTip: 'Compare Mode A with Mode B to see high-frequency dampening.',
      actionPreset: 'bright_cranial_female',
      actionLabel: 'Apply Bright Preset',
    },
  },
  {
    id: 'mic_proximity_bridging',
    category: 'tips',
    categoryLabel: 'Pro Tips / Acoustics',
    title: 'Microphone Proximity Effect',
    shortSummary: 'Use distance physics to naturally bridge the bone conduction gap.',
    expandedContent: {
      description:
        'Directional microphones boost low frequencies at 2-8cm distance due to spherical wave curvature.',
      keyPoints: [
        'Moving closer to the mic adds +6 to +15dB of rich low-end.',
        'Calibrate distance between 5cm and 30cm to find optimal balance.',
        'Use pop filter to eliminate plosives when close.',
      ],
      acousticTip: 'Close-mic recordings naturally match your internal perceived bass.',
      actionPreset: 'natural_standard',
      actionLabel: 'Apply Standard Preset',
    },
  },
];
