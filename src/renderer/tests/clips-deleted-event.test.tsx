import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('ClipsDeleted Event Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify that custom event can be dispatched and listened for', () => {
    const eventHandler = vi.fn();

    // Add event listener
    window.addEventListener('clipsDeleted', eventHandler);

    // Dispatch the event
    window.dispatchEvent(new CustomEvent('clipsDeleted'));

    // Verify the handler was called
    expect(eventHandler).toHaveBeenCalledTimes(1);

    // Clean up
    window.removeEventListener('clipsDeleted', eventHandler);
  });

  it('should verify that multiple listeners can receive the same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    // Add multiple event listeners
    window.addEventListener('clipsDeleted', handler1);
    window.addEventListener('clipsDeleted', handler2);

    // Dispatch the event
    window.dispatchEvent(new CustomEvent('clipsDeleted'));

    // Verify both handlers were called
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);

    // Clean up
    window.removeEventListener('clipsDeleted', handler1);
    window.removeEventListener('clipsDeleted', handler2);
  });

  it('should verify that removed listeners do not receive events', () => {
    const eventHandler = vi.fn();

    // Add event listener
    window.addEventListener('clipsDeleted', eventHandler);

    // Remove event listener
    window.removeEventListener('clipsDeleted', eventHandler);

    // Dispatch the event
    window.dispatchEvent(new CustomEvent('clipsDeleted'));

    // Verify the handler was NOT called
    expect(eventHandler).not.toHaveBeenCalled();
  });
});
