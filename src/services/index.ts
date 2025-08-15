// Main service exports - provides backward compatibility and unified access
import { clipsService } from './clips/clipsService';
import { searchService } from './search/searchService';
import { tagsService } from './tags/tagsService';
import { favoritesService } from './favorites/favoritesService';
import { appsService } from './apps/appsService';

export { clipsService } from './clips/clipsService';
export { searchService } from './search/searchService';
export { tagsService } from './tags/tagsService';
export { favoritesService } from './favorites/favoritesService';
export { appsService } from './apps/appsService';

export * from './shared/types';
export { http } from './shared/http';

// Backward compatibility: Export the original clipService interface
export const clipService = {
  // Core clips operations
  ...clipsService,

  // Search operations
  ...searchService,

  // Tags operations
  ...tagsService,

  // Favorites operations
  ...favoritesService,

  // Apps operations
  ...appsService,
};
