'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useIncidentStore } from '@/stores/incidentStore';

interface UseSpeechRecognitionOptions {
  incidentId: string;
  speakerName?: string;
  speakerRole?: string;
}

export function useSpeechRecognition({
  incidentId,
  speakerName = 'Alex Chen',
  speakerRole = 'INCIDENT_COMMANDER',
}: UseSpeechRecognitionOptions) {
  const {
    isSpeechListening,
    setIsSpeechListening,
    interimTranscript,
    setInterimTranscript,
    submitUtterance,
  } = useIncidentStore();

  const [isSupported, setIsSupported] = useState(true);
  const [lastTranscript, setLastTranscript] = useState('');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(isSpeechListening);

  useEffect(() => {
    isListeningRef.current = isSpeechListening;
  }, [isSpeechListening]);

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
    recognition.interimResults = true; // Enables live streaming words as you speak!
    recognition.lang = 'en-US';

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

        // Submit utterance to store and backend
        submitUtterance(finalTrimmed, speakerName, speakerRole);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionError('Microphone permission denied. Please allow microphone access in your browser.');
        setIsSpeechListening(false);
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[Speech Recognition] Error:', event.error);
      }
    };

    recognition.onend = () => {
      // If user intended to keep listening, auto-restart continuous stream
      if (recognitionRef.current && isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setIsSpeechListening(false);
        }
      } else {
        setIsSpeechListening(false);
        setInterimTranscript('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [incidentId, speakerName, speakerRole, setIsSpeechListening, setInterimTranscript, submitUtterance]);

  const startListening = useCallback(() => {
    setPermissionError(null);
    if (recognitionRef.current && !isSpeechListening) {
      try {
        recognitionRef.current.start();
        setIsSpeechListening(true);
      } catch (err: any) {
        // If already started, just update state
        if (err?.name === 'InvalidStateError') {
          setIsSpeechListening(true);
        } else {
          console.warn('Speech recognition could not start:', err);
        }
      }
    }
  }, [isSpeechListening, setIsSpeechListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isSpeechListening) {
      setIsSpeechListening(false);
      setInterimTranscript('');
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, [isSpeechListening, setIsSpeechListening, setInterimTranscript]);

  const toggleListening = useCallback(() => {
    if (isSpeechListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isSpeechListening, startListening, stopListening]);

  return {
    isListening: isSpeechListening,
    isSupported,
    lastTranscript,
    interimTranscript,
    permissionError,
    startListening,
    stopListening,
    toggleListening,
  };
}
