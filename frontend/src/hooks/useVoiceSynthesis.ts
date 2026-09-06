'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useIncidentStore } from '@/stores/incidentStore';

function sanitizeForSpeech(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^(\s*Q\s*:\s*.*?\n+)/i, '') // remove Q: "..." question repeats
    .replace(/^(\s*(A|Answer)\s*:\s*)/i, '') // remove A: or Answer: prefixes
    .replace(/^(\s*\*\*A:\*\*\s*)/i, '')
    .replace(/^(\s*\*\*Answer:\*\*\s*)/i, '')
    .replace(/[`*_#~>]/g, '') // remove markdown formatting symbols
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // remove markdown link URLs
    .replace(/\s+/g, ' ')
    .trim();
}

export function useVoiceSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const isCancelledRef = useRef(false);
  const { incident, speechLanguage } = useIncidentStore();
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setIsSupported(true);

      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          voicesRef.current = available;
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;

      return () => {
        if (synthRef.current) {
          synthRef.current.cancel();
        }
      };
    }
  }, []);

  const getBestVoice = useCallback((targetLang: string): SpeechSynthesisVoice | null => {
    const all = voicesRef.current.length > 0
      ? voicesRef.current
      : (synthRef.current ? synthRef.current.getVoices() : []);

    if (!all || all.length === 0) return null;

    if (targetLang === 'hi-IN') {
      const hindi = all.find(
        (v) => v.lang.toLowerCase().includes('hi') || v.name.toLowerCase().includes('swara') || v.name.toLowerCase().includes('madhur')
      );
      if (hindi) return hindi;
    }

    // High quality priority list for ultra-realistic natural AI voice (EDITH persona)
    const preferredVoices = [
      'microsoft jenny online (natural)',
      'microsoft aria online (natural)',
      'microsoft sonia online (natural)',
      'microsoft guy online (natural)',
      'google uk english female',
      'google us english',
      'samantha',
      'karen',
      'daniel',
    ];

    for (const pref of preferredVoices) {
      const match = all.find((v) => v.name.toLowerCase().includes(pref));
      if (match) return match;
    }

    // Any natural/online English voice
    const naturalVoice = all.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online'))
    );
    if (naturalVoice) return naturalVoice;

    // Any Google English voice
    const googleVoice = all.find((v) => v.lang.startsWith('en') && v.name.includes('Google'));
    if (googleVoice) return googleVoice;

    // Any English voice
    const englishVoice = all.find((v) => v.lang.startsWith('en'));
    return englishVoice || all[0];
  }, []);

  const speakWithElevenLabs = async (text: string, apiKey: string, voiceId: string): Promise<boolean> => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      setIsSpeaking(true);
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || '21m00Tcm4TlvDq8ikWAM'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!res.ok) {
        console.warn('ElevenLabs API returned error, falling back to Web Speech:', res.status);
        return false;
      }

      const audioBlob = await res.blob();
      if (isCancelledRef.current) {
        setIsSpeaking(false);
        return true;
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      await audio.play();
      return true;
    } catch (err) {
      console.warn('ElevenLabs playback failed, falling back:', err);
      return false;
    }
  };

  const speak = useCallback(async (text: string, customLang?: string) => {
    // Cancel previous utterance immediately
    isCancelledRef.current = true;
    if (synthRef.current) synthRef.current.cancel();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    activeUtterancesRef.current = [];

    const cleanText = sanitizeForSpeech(text);
    if (!cleanText) {
      setIsSpeaking(false);
      return;
    }

    isCancelledRef.current = false;

    // Check for user-configured ElevenLabs API Key
    const elevenKey =
      (typeof window !== 'undefined' && localStorage.getItem('edith_elevenlabs_api_key')) ||
      (incident?.settings as any)?.integrations?.elevenLabsApiKey ||
      null;

    const elevenVoiceId =
      (typeof window !== 'undefined' && localStorage.getItem('edith_elevenlabs_voice_id')) ||
      (incident?.settings as any)?.integrations?.elevenLabsVoiceId ||
      '21m00Tcm4TlvDq8ikWAM';

    if (elevenKey && elevenKey.trim()) {
      const success = await speakWithElevenLabs(cleanText, elevenKey.trim(), elevenVoiceId.trim());
      if (success) return;
    }

    if (!synthRef.current) {
      setIsSpeaking(false);
      return;
    }

    const targetLang = customLang || speechLanguage || 'en-US';
    const selectedVoice = getBestVoice(targetLang);

    // Break text into sentences to prevent Chromium SpeechSynthesis 15s freeze bug & fluctuation
    const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
    let currentIndex = 0;

    setIsSpeaking(true);

    const speakNextSentence = () => {
      if (isCancelledRef.current || !synthRef.current || currentIndex >= sentences.length) {
        setIsSpeaking(false);
        activeUtterancesRef.current = [];
        return;
      }

      const sentenceText = sentences[currentIndex].trim();
      if (!sentenceText) {
        currentIndex++;
        speakNextSentence();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentenceText);
      // Retain in ref to prevent V8 GC from killing utterance mid-speech
      activeUtterancesRef.current = [utterance];

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = targetLang;
      }

      // Smooth, natural pacing
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        if (!isCancelledRef.current) {
          currentIndex++;
          speakNextSentence();
        }
      };

      utterance.onerror = (e) => {
        // If canceled explicitly, don't treat as failure
        if (e.error === 'interrupted' || e.error === 'canceled') {
          return;
        }
        setIsSpeaking(false);
        activeUtterancesRef.current = [];
      };

      synthRef.current.speak(utterance);
    };

    speakNextSentence();
  }, [speechLanguage, getBestVoice, incident?.settings]);

  const stop = useCallback(() => {
    isCancelledRef.current = true;
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    activeUtterancesRef.current = [];
    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    isSupported,
    speak,
    stop,
  };
}

