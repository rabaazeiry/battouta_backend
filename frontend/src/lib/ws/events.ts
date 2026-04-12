// Must mirror backend/src/ws/events.js
export const WS_EVENTS = {
  SCRAPING_STARTED: 'scraping:started',
  SCRAPING_PROGRESS: 'scraping:progress',
  SCRAPING_COMPLETE: 'scraping:complete',
  SCRAPING_FAILED: 'scraping:failed',
  RESEARCH_PROGRESS: 'research:progress',
  CLASSIFICATION_COMPLETE: 'classification:complete',
  NOTIFICATION: 'notification',
  JOIN: 'join',
  LEAVE: 'leave',
  PING: 'ping'
} as const;

export type ScrapingProgress = {
  projectId: string;
  step: string;
  pct: number;
  competitorId?: string;
  message?: string;
  at: number;
};
