"use client";
import { createContext, useContext, useState, useRef, useEffect } from "react";
import { useSettings } from "./SettingsContext";
import { getSoakingPlaylist, markWordSoaked } from "@/app/actions/englishActions";

const BrainSoakingContext = createContext();

export function BrainSoakingProvider({ children }) {
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cache, setCache] = useState({});
  const [currentAction, setCurrentAction] = useState("");
  const { settings } = useSettings();

  const isPlayingRef = useRef(false);
  const audioRef = useRef(null);
  const timerRefs = useRef([]);
  const activeProcessRef = useRef(false);

  const clearAllTimers = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const wait = (ms) => new Promise(resolve => {
    const timer = setTimeout(resolve, ms);
    timerRefs.current.push(timer);
  });

  const playAudioBase64 = (base64) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      audioRef.current = audio;
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play().catch(reject);
    });
  };

  const preloadTrack = async (index) => {
    if (index >= playlist.length) return; 
    const track = playlist[index];
    if (!track || cache[track.id]) return;

    setCache(prev => ({ ...prev, [track.id]: { fetching: true } }));
    try {
      const sentenceRes = await fetch("http://localhost:8000/api/playlist/generate-sentence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: track.text, meaning: track.meaning })
      });
      const { sentence } = await sentenceRes.json();

      const wordTtsRes = await fetch("http://localhost:8000/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: track.text })
      });
      const wordTts = await wordTtsRes.json();

      const spellingText = track.text.toUpperCase().split('').join(' - ');
      const spellingTtsRes = await fetch("http://localhost:8000/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: spellingText, speed: 0.8 })
      });
      const spellingTts = await spellingTtsRes.json();

      let explanationAudio = null;
      if (track.explanation) {
        const expTtsRes = await fetch("http://localhost:8000/api/tts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: track.explanation, speed: 1.1 })
        });
        const expTts = await expTtsRes.json();
        explanationAudio = expTts.audio_base64;
      }

      const sentenceTtsRes = await fetch("http://localhost:8000/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentence })
      });
      const sentenceTts = await sentenceTtsRes.json();

      setCache(prev => ({
        ...prev,
        [track.id]: { fetching: false, sentence, wordAudio: wordTts.audio_base64, spellingAudio: spellingTts.audio_base64, explanationAudio, sentenceAudio: sentenceTts.audio_base64 }
      }));
    } catch (e) {
      console.error("Failed to preload track", index, e);
      setCache(prev => ({ ...prev, [playlist[index]?.id]: { fetching: false, error: true } }));
    }
  };

  useEffect(() => {
    if (playlist.length > 0) {
      preloadTrack(currentIndex);
      preloadTrack(currentIndex + 1);
    }
  }, [currentIndex, playlist]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const runTrackEngine = async (index, trackData) => {
    activeProcessRef.current = true;
    if (!isPlayingRef.current) { activeProcessRef.current = false; return; }

    setCurrentAction("word");
    try { await playAudioBase64(trackData.wordAudio); } catch (e) { }
    if (!isPlayingRef.current) { activeProcessRef.current = false; return; }

    setCurrentAction("pause");
    await wait(settings?.english?.pauseBeforeSpelling ?? 500);
    if (!isPlayingRef.current) { activeProcessRef.current = false; return; }

    if (trackData.spellingAudio) {
      setCurrentAction("spelling");
      try { await playAudioBase64(trackData.spellingAudio); } catch (e) { }
      if (!isPlayingRef.current) { activeProcessRef.current = false; return; }

      setCurrentAction("pause");
      await wait(settings?.english?.pauseAfterSpelling ?? 500);
      if (!isPlayingRef.current) { activeProcessRef.current = false; return; }
    }

    setCurrentAction("word_repeat");
    try { await playAudioBase64(trackData.wordAudio); } catch (e) { }
    if (!isPlayingRef.current) { activeProcessRef.current = false; return; }

    setCurrentAction("pause");
    await wait(settings?.english?.pauseAfterWord ?? 1000);
    if (!isPlayingRef.current) { activeProcessRef.current = false; return; }

    if (trackData.explanationAudio) {
      setCurrentAction("meaning");
      try { await playAudioBase64(trackData.explanationAudio); } catch (e) { }
      if (!isPlayingRef.current) { activeProcessRef.current = false; return; }

      setCurrentAction("pause");
      await wait(settings?.english?.pauseAfterMeaning ?? 1000);
      if (!isPlayingRef.current) { activeProcessRef.current = false; return; }
    }

    setCurrentAction("sentence");
    try { await playAudioBase64(trackData.sentenceAudio); } catch (e) { }
    if (!isPlayingRef.current) { activeProcessRef.current = false; return; }

    // Mark the word as soaked in the background
    const track = playlist[index];
    if (track && track.id) {
      markWordSoaked(track.id).catch(err => console.error("Failed to mark soaked", err));
    }

    setCurrentAction("pause");
    await wait(settings?.english?.pauseAfterSentence ?? 2000);
    activeProcessRef.current = false;

    if (isPlayingRef.current) {
      setCurrentIndex(prev => (prev + 1) % playlist.length);
    }
  };

  useEffect(() => {
    if (isPlaying && !activeProcessRef.current && playlist.length > 0) {
      const track = playlist[currentIndex];
      const trackData = track ? cache[track.id] : null;
      if (trackData && !trackData.fetching) {
        if (!trackData.error) {
          runTrackEngine(currentIndex, trackData);
        } else {
          setCurrentIndex(prev => (prev + 1) % playlist.length);
        }
      } else {
        setCurrentAction("loading");
      }
    }
  }, [isPlaying, currentIndex, cache, playlist]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && playlist.length > 0) {
      const currentTrack = playlist[currentIndex];
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack?.text || "Brain Soaking",
        artist: "CSES AI",
        album: "English Playlist"
      });
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('nexttrack', () => handleSkip());
    }
  }, [currentIndex, playlist]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      clearAllTimers();
    } else {
      setIsPlaying(true);
    }
  };

  const handleSkip = () => {
    clearAllTimers();
    activeProcessRef.current = false;
    if (playlist.length > 0) {
      setCurrentIndex((currentIndex + 1) % playlist.length);
    }
  };

  const handleQuit = () => {
    setIsPlaying(false);
    clearAllTimers();
    activeProcessRef.current = false;
    setPlaylist([]);
    setCache({});
    setCurrentIndex(0);
    setCurrentAction("");
  };

  const initializePlaylist = async () => {
    if (playlist.length === 0) {
      const count = settings?.english?.soakingWordsCount || 50;
      const res = await getSoakingPlaylist(count);
      if (res.success && res.playlist.length > 0) {
        setPlaylist(res.playlist);
        setCache({});
        setCurrentIndex(0);
        // Wait for preload to settle before auto-playing
        setTimeout(() => {
          setIsPlaying(true);
        }, 500);
      } else {
        console.error("Failed to load soaking playlist", res.error);
      }
    }
  };

  return (
    <BrainSoakingContext.Provider value={{
      playlist, isPlaying, currentIndex, cache, currentAction,
      handlePlayPause, handleSkip, handleQuit, initializePlaylist
    }}>
      {children}
    </BrainSoakingContext.Provider>
  );
}

export function useBrainSoaking() {
  return useContext(BrainSoakingContext);
}
