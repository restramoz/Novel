import { create } from "zustand";

export type LoopMode = "none" | "all" | "one";

export interface Track {
  id: string;
  title: string;
  file_url: string;
  novel_id?: string;
}

interface MusicState {
  tracks:       Track[];
  currentIndex: number;
  isPlaying:    boolean;
  loopMode:     LoopMode;
  novelId:      string | null;

  setTracks:   (tracks: Track[], novelId: string) => void;
  play:        (index: number) => void;
  togglePlay:  () => void;
  next:        () => void;
  prev:        () => void;
  setLoopMode: (mode: LoopMode) => void;
}

export const useMusicStore = create<MusicState>((set, get) => ({
  tracks:       [],
  currentIndex: 0,
  isPlaying:    false,
  loopMode:     "none",
  novelId:      null,

  setTracks: (tracks, novelId) => {
    const prev = get();

    if (tracks.length === 0) {
      // No tracks — stop everything
      set({ tracks: [], currentIndex: 0, isPlaying: false, novelId });
      return;
    }

    if (prev.novelId === novelId) {
      // Same novel — update track list but DON'T touch currentIndex or isPlaying
      // (user might be mid-playback, just a track was added/removed)
      const clampedIndex = Math.min(prev.currentIndex, tracks.length - 1);

      // If a new track was just added (list grew) and nothing was playing, auto-play the new one
      const wasEmpty   = prev.tracks.length === 0;
      const newTrack   = tracks.length > prev.tracks.length;

      if (wasEmpty) {
        // First track ever added — load it, don't auto-play (let user decide)
        set({ tracks, currentIndex: 0, novelId });
      } else if (newTrack && !prev.isPlaying) {
        // Additional track added and nothing was playing — switch to new track but don't force play
        set({ tracks, currentIndex: tracks.length - 1, novelId });
      } else {
        // Normal update — preserve state
        set({ tracks, currentIndex: clampedIndex, novelId });
      }
    } else {
      // Different novel — reset player
      set({ tracks, currentIndex: 0, isPlaying: false, novelId });
    }
  },

  play: (index) => {
    const { tracks } = get();
    if (index < 0 || index >= tracks.length) return;
    set({ currentIndex: index, isPlaying: true });
  },

  togglePlay: () => {
    const { isPlaying, tracks } = get();
    if (tracks.length === 0) return;
    set({ isPlaying: !isPlaying });
  },

  next: () => {
    const { tracks, currentIndex, loopMode } = get();
    if (tracks.length === 0) return;

    if (loopMode === "all" || currentIndex < tracks.length - 1) {
      const nextIndex = (currentIndex + 1) % tracks.length;
      set({ currentIndex: nextIndex, isPlaying: true });
    } else {
      // End of list, no loop — stop
      set({ isPlaying: false });
    }
  },

  prev: () => {
    const { tracks, currentIndex } = get();
    if (tracks.length === 0) return;
    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    set({ currentIndex: prevIndex, isPlaying: true });
  },

  setLoopMode: (mode) => set({ loopMode: mode }),
}));
