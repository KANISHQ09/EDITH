'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useIncidentStore } from '@/stores/incidentStore';

interface UseSpeechRecognitionOptions {
  incidentId?: string;
  speakerName?: string;
  speakerRole?: string;
}

export function useSpeechRecognition({
  incidentId,
  speakerName = 'Alex Chen',
  speakerRole = 'INCIDENT_COMMANDER',
}: UseSpeechRecognitionOptions = {}) {
  const {
    isSpeechListening,
    setIsSpeechListening,
    interimTranscript,
    setInterimTranscript,
    submitUtterance,
    speechLanguage,
    userName,
    userRole,
  } = useIncidentStore();

  const [isSupported, setIsSupported] = useState(true);
  const [lastTranscript, setLastTranscript] = useState('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(isSpeechListening);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const restartTimerRef = useRef<any>(null);

  const activeSpeakerName = userName || speakerName || 'Incident Commander';
  const activeSpeakerRole = userRole || speakerRole || 'INCIDENT_COMMANDER';

  useEffect(() => {
    isListeningRef.current = isSpeechListening;
  }, [isSpeechListening]);

  // Audio level monitoring using Web Audio API
  const startAudioMonitoring = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current || !isListeningRef.current) {
          setAudioLevel(0);
          return;
        }
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.warn('[Audio Level] Microphone monitor error:', err);
    }
  }, []);

  const stopAudioMonitoring = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Initialize SpeechRecognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // Standard English for accurate technical terminology recognition
    recognition.lang = speechLanguage || 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalSpeech = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const transcriptText = item[0]?.transcript || '';
        if (item.isFinal) {
          finalSpeech += transcriptText;
        } else {
          interim += transcriptText;
        }
      }

      if (interim) {
        setInterimTranscript(interim.trim());
      }

      if (finalSpeech.trim()) {
        const finalTrimmed = finalSpeech.trim();
        setInterimTranscript('');
        setLastTranscript(finalTrimmed);

        // Submit utterance to store and real backend
        submitUtterance(finalTrimmed, activeSpeakerName, activeSpeakerRole);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionError('Microphone permission denied. Please allow microphone access in your browser address bar.');
        setIsSpeechListening(false);
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[Speech Recognition] Notice:', event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if store still says listening
      if (isListeningRef.current && recognitionRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch (err: any) {
              if (err.name !== 'InvalidStateError') {
                console.warn('[Speech Recognition] restart failed', err);
              }
            }
          }
        }, 150);
      } else {
        setInterimTranscript('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [speechLanguage, activeSpeakerName, activeSpeakerRole, setIsSpeechListening, setInterimTranscript, submitUtterance]);

  // Synchronize when isSpeechListening changes
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isSpeechListening) {
      setPermissionError(null);
      startAudioMonitoring();
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        if (err.name !== 'InvalidStateError') {
          console.warn('[Speech Recognition] start error:', err);
        }
      }
    } else {
      stopAudioMonitoring();
      setInterimTranscript('');
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, [isSpeechListening, startAudioMonitoring, stopAudioMonitoring, setInterimTranscript]);

  const startListening = useCallback(() => {
    setIsSpeechListening(true);
  }, [setIsSpeechListening]);

  const stopListening = useCallback(() => {
    setIsSpeechListening(false);
  }, [setIsSpeechListening]);

  const toggleListening = useCallback(() => {
    setIsSpeechListening(!isSpeechListening);
  }, [isSpeechListening, setIsSpeechListening]);

  return {
    isListening: isSpeechListening,
    isSupported,
    lastTranscript,
    interimTranscript,
    permissionError,
    audioLevel,
    startListening,
    stopListening,
    toggleListening,
  };
}
