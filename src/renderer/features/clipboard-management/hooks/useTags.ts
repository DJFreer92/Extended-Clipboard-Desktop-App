import { useState, useCallback, useEffect } from "react";
import { ClipModel } from "../../../../models/clip";
import { tagsService } from "../../../../services/tags/tagsService";

type TagOptimisticUpdate = {
  clipId: number;
  tagName: string;
  operation: 'add' | 'remove';
  timestamp: number;
};

export function useTags() {
  const [optimisticUpdates, setOptimisticUpdates] = useState<TagOptimisticUpdate[]>([]);

  // Apply optimistic updates to clips
  const applyOptimisticUpdates = useCallback((clips: ClipModel[]): ClipModel[] => {
    if (optimisticUpdates.length === 0) return clips;

    return clips.map(clip => {
      const clipUpdates = optimisticUpdates.filter(update => update.clipId === clip.Id);
      if (clipUpdates.length === 0) return clip;

      let tags = [...(clip.Tags || [])];

      // Sort updates by timestamp to apply them in order
      clipUpdates.sort((a, b) => a.timestamp - b.timestamp);

      for (const update of clipUpdates) {
        if (update.operation === 'add') {
          if (!tags.includes(update.tagName)) {
            tags.push(update.tagName);
          }
        } else if (update.operation === 'remove') {
          tags = tags.filter(tag => tag !== update.tagName);
        }
      }

      return {
        ...clip,
        Tags: tags
      };
    });
  }, [optimisticUpdates]);

  // Add a tag optimistically
  const addTagOptimistic = useCallback(async (clipId: number, tagName: string): Promise<boolean> => {
    const timestamp = Date.now();

    // Add optimistic update
    setOptimisticUpdates(prev => [
      ...prev,
      { clipId, tagName, operation: 'add', timestamp }
    ]);

    try {
      await tagsService.addClipTag(clipId, tagName);

      // Remove the optimistic update after success
      setOptimisticUpdates(prev =>
        prev.filter(update =>
          !(update.clipId === clipId && update.tagName === tagName && update.operation === 'add' && update.timestamp === timestamp)
        )
      );

      return true;
    } catch (error) {
      console.error('Failed to add tag:', error);

      // Remove the failed optimistic update
      setOptimisticUpdates(prev =>
        prev.filter(update =>
          !(update.clipId === clipId && update.tagName === tagName && update.operation === 'add' && update.timestamp === timestamp)
        )
      );

      return false;
    }
  }, []);

  // Remove a tag optimistically
  const removeTagOptimistic = useCallback(async (clipId: number, tagName: string): Promise<boolean> => {
    const timestamp = Date.now();

    // Add optimistic update
    setOptimisticUpdates(prev => [
      ...prev,
      { clipId, tagName, operation: 'remove', timestamp }
    ]);

    try {
      // Get tag ID and remove
      const tags = await tagsService.getAllTags();
      const tag = tags.find((t: any) => t.name === tagName);
      if (!tag) {
        console.warn('Tag not found:', tagName);
        return false;
      }

      await tagsService.removeClipTag(clipId, tag.id);

      // Remove the optimistic update after success
      setOptimisticUpdates(prev =>
        prev.filter(update =>
          !(update.clipId === clipId && update.tagName === tagName && update.operation === 'remove' && update.timestamp === timestamp)
        )
      );

      return true;
    } catch (error) {
      console.error('Failed to remove tag:', error);

      // Remove the failed optimistic update
      setOptimisticUpdates(prev =>
        prev.filter(update =>
          !(update.clipId === clipId && update.tagName === tagName && update.operation === 'remove' && update.timestamp === timestamp)
        )
      );

      return false;
    }
  }, []);

  // Clean up stale optimistic updates
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const STALE_THRESHOLD = 30000; // 30 seconds

      setOptimisticUpdates(prev =>
        prev.filter(update => now - update.timestamp < STALE_THRESHOLD)
      );
    }, 10000); // Check every 10 seconds

    return () => clearInterval(cleanup);
  }, []);

  // Sync with clips when they change - remove optimistic updates for clips that are confirmed to have the expected state
  const syncWithClips = useCallback((clips: ClipModel[]) => {
    setOptimisticUpdates(prev =>
      prev.filter(update => {
        const clip = clips.find(c => c.Id === update.clipId);
        if (!clip) return true; // Keep update if clip not found

        const currentTags = clip.Tags || [];

        if (update.operation === 'add') {
          // If the tag is already in the clip, we can remove this optimistic update
          return !currentTags.includes(update.tagName);
        } else if (update.operation === 'remove') {
          // If the tag is not in the clip, we can remove this optimistic update
          return currentTags.includes(update.tagName);
        }

        return true;
      })
    );
  }, []);

  return {
    applyOptimisticUpdates,
    addTagOptimistic,
    removeTagOptimistic,
    syncWithClips,
    hasOptimisticUpdates: optimisticUpdates.length > 0
  };
}
