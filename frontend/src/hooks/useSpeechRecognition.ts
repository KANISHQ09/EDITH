'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  incidentId: string;
  speakerName?: string;
  speakerRole?: string;
  onTranscriptReceived?: (text: string) => void;
}

export function useSpeechRecognition({
  incidentId,
  speakerName = 'Alex Chen',
  speakerRole = 'INCIDENT_COMMANDER',
  onTranscriptReceived,
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastTranscript, setLastTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

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
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = async (event: any) => {
      const results = event.results;
      const latestResult = results[results.length - 1];
      if (latestResult.isFinal) {
        const text = latestResult[0].transcript.trim();
        if (text) {
          setLastTranscript(text);
          onTranscriptReceived?.(text);

          // Submit to backend
          try {
            await fetch(`/api/v1/incidents/${incidentId}/utterances`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: text,
                speakerName,
                speakerRole,
              }),
            });
          } catch (err) {
            console.error('Failed to post speech utterance:', err);
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      // Don't crash on 'no-speech' or 'aborted'
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[Speech Recognition] Error:', event.error);
      }
    };

    recognition.onend = () => {
      // If user intended to keep listening, restart
      if (recognitionRef.current && isListening) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [incidentId, speakerName, speakerRole, onTranscriptReceived, isListening]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition could not start:', err);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    lastTranscript,
    startListening,
    stopListening,
    toggleListening,
  };
}
