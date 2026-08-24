/**
 * VocalMirror — Challenger 2 Vulnerability Reproductions (Milestone 2)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useAudioStudio } from '../../src/hooks/useAudioStudio';
import { installWebAudioMocks, MediaStreamMock, MediaStreamTrackMock } from '../mocks/webAudioMock';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderAudioStudioHook() {
  const result: { current: ReturnType<typeof useAudioStudio> | null } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  function TestHarness() {
    result.current = useAudioStudio();
    return null;
  }

  act(() => {
    root.render(React.createElement(TestHarness));
  });

  return {
    result,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('Challenger 2 Empirical Bug Demonstrations', () => {
  beforeEach(() => {
    installWebAudioMocks(globalThis);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('BUG 1: startRecording starts recording in background if tab is hidden while getUserMedia is pending', async () => {
    const { result, unmount } = renderAudioStudioHook();
    const gumDeferred = deferred<any>();

    navigator.mediaDevices.getUserMedia = () => {
      return gumDeferred.promise;
    };

    // 1. User clicks record
    let startPromise = result.current!.startRecording();

    // 2. Allow microtasks to reach getUserMedia
    await new Promise((r) => setTimeout(r, 10));

    // 3. User switches tabs (document becomes hidden while getUserMedia is pending)
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // 4. getUserMedia resolves while document is hidden
    const track = new MediaStreamTrackMock();
    const stream = new MediaStreamMock([track]);

    await act(async () => {
      gumDeferred.resolve(stream);
      await startPromise;
    });

    console.log('BUG 1 Check - isRecording while hidden:', result.current!.isRecording);
    console.log('BUG 1 Check - track readyState:', track.readyState);

    // If recording started in hidden state:
    expect(result.current!.isRecording).toBe(false);
    expect(track.readyState).toBe('ended');

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    unmount();
  });

  it('BUG 2: startPlayback starts ghost playback if stop() is called while engine.resume() is pending', async () => {
    const { result, unmount } = renderAudioStudioHook();

    await act(async () => {
      await result.current!.loadDemoAudio('male_baritone');
    });

    const engine = result.current!.engine!;
    const resumeDeferred = deferred<void>();
    const origResume = engine.resume.bind(engine);
    engine.resume = () => {
      return resumeDeferred.promise.then(() => origResume());
    };

    // 1. User calls play()
    let playPromise = result.current!.play();

    // 2. Allow microtask to reach engine.resume()
    await new Promise((r) => setTimeout(r, 10));

    // 3. User immediately clicks stop() while play() is pending resume
    act(() => {
      result.current!.stop();
    });

    expect(result.current!.isPlaying).toBe(false);

    // 4. engine.resume() now resolves
    await act(async () => {
      resumeDeferred.resolve();
      await playPromise;
    });

    console.log('BUG 2 Check - isPlaying after stop() was called during resume():', result.current!.isPlaying);

    // If isPlaying is true, user stopped playback but audio started anyway (ghost playback race condition)
    expect(result.current!.isPlaying).toBe(false);

    unmount();
  });
});

  it('BUG 3: cancelRecording/clearAudio during decodeAudioData in stopRecording still sets audioBuffer', async () => {
    const { result, unmount } = renderAudioStudioHook();

    // 1. Start recording
    await act(async () => {
      await result.current!.startRecording();
    });
    expect(result.current!.isRecording).toBe(true);

    const engine = result.current!.engine!;
    const decodeDeferred = deferred<AudioBuffer>();
    engine.getContext().decodeAudioData = () => {
      return decodeDeferred.promise;
    };

    // 2. Stop recording (initiates decodeAudioData)
    let stopPromise = result.current!.stopRecording();

    // Allow microtask to enter decodeAudioData
    await new Promise((r) => setTimeout(r, 10));

    // 3. User cancels/clears audio while decoding
    act(() => {
      result.current!.clearAudio();
    });

    expect(result.current!.audioBuffer).toBeNull();
    expect(result.current!.audioSource).toBe('NONE');

    // 4. decodeAudioData resolves with a dummy buffer
    const mockDecoded = engine.getContext().createBuffer(1, 4800, 48000);
    await act(async () => {
      decodeDeferred.resolve(mockDecoded as any);
      await stopPromise;
    });

    console.log('BUG 3 Check - audioSource after clearAudio during decode:', result.current!.audioSource);
    console.log('BUG 3 Check - audioBuffer after clearAudio during decode:', result.current!.audioBuffer !== null);

    // If audioBuffer is not null and audioSource is MIC, it desynced and overwrote the user's clearAudio action
    expect(result.current!.audioBuffer).toBeNull();
    expect(result.current!.audioSource).toBe('NONE');

    unmount();
  });
