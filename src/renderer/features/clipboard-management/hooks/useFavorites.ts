import { useState, useCallback } from "react";
import { ClipModel } from "../../../../models/clip";
import { favoritesService } from "../../../../services/favorites/favoritesService";

export function useFavorites() {
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<number, boolean>>({});

  const toggleFavoriteClip = async (clip: ClipModel, onUpdate?: (clips: ClipModel[]) => void) => {
    const newFavoriteState = !clip.IsFavorite;

    // Store optimistic update
    setOptimisticUpdates(prev => ({ ...prev, [clip.Id]: newFavoriteState }));

    try {
      if (newFavoriteState) {
        await favoritesService.addFavorite(clip.Id);
      } else {
        await favoritesService.removeFavorite(clip.Id);
      }

      // Don't clear optimistic update immediately - let it persist until backend state is synced

      // Safety timeout: clear optimistic update after 10 seconds if not cleared by sync
      setTimeout(() => {
        setOptimisticUpdates(prev => {
          if (prev[clip.Id] !== undefined) {
            const { [clip.Id]: _, ...rest } = prev;
            return rest;
          }
          return prev;
        });
      }, 10000);
    } catch (e) {
      console.error('Failed to toggle favorite', e);
      // Clear optimistic update immediately on error
      setOptimisticUpdates(prev => {
        const { [clip.Id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const getFavoriteState = (clip: ClipModel): boolean => {
    return optimisticUpdates[clip.Id] ?? clip.IsFavorite;
  };

  // Function to clear optimistic updates when backend state is synchronized
  const clearOptimisticUpdate = useCallback((clipId: number) => {
    setOptimisticUpdates(prev => {
      const { [clipId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Function to sync optimistic updates with fresh clip data
  const syncWithClips = useCallback((clips: ClipModel[]) => {
    setOptimisticUpdates(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      // Clear optimistic updates where the backend state now matches the optimistic state
      for (const clipId in updated) {
        const clip = clips.find(c => c.Id === parseInt(clipId));
        if (clip && clip.IsFavorite === updated[clipId]) {
          delete updated[clipId];
          hasChanges = true;
        }
      }

      return hasChanges ? updated : prev;
    });
  }, []);

  return {
    toggleFavoriteClip,
    getFavoriteState,
    clearOptimisticUpdate,
    syncWithClips,
  };
}
