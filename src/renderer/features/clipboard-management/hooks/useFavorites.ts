import { useState } from "react";
import { ClipModel } from "../../../../models/clip";
import { clipService } from "../../../../services/clipService";

export function useFavorites() {
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<number, boolean>>({});

  const toggleFavoriteClip = async (clip: ClipModel, onUpdate?: (clips: ClipModel[]) => void) => {
    const newFavoriteState = !clip.IsFavorite;

    // Store optimistic update
    setOptimisticUpdates(prev => ({ ...prev, [clip.Id]: newFavoriteState }));

    try {
      if (newFavoriteState) {
        await clipService.addFavorite(clip.Id);
      } else {
        await clipService.removeFavorite(clip.Id);
      }

      // Clear optimistic update on success
      setOptimisticUpdates(prev => {
        const { [clip.Id]: _, ...rest } = prev;
        return rest;
      });
    } catch (e) {
      console.error('Failed to toggle favorite', e);
      // Clear optimistic update on error
      setOptimisticUpdates(prev => {
        const { [clip.Id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const getFavoriteState = (clip: ClipModel): boolean => {
    return optimisticUpdates[clip.Id] ?? clip.IsFavorite;
  };

  return {
    toggleFavoriteClip,
    getFavoriteState,
  };
}
