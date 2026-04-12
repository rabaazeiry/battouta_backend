// backend/src/ws/events.js
// Canonical event names used by Socket.IO. Keep in sync with frontend.

module.exports = {
  // Server -> Client
  SCRAPING_STARTED:       'scraping:started',
  SCRAPING_PROGRESS:      'scraping:progress',
  SCRAPING_COMPLETE:      'scraping:complete',
  SCRAPING_FAILED:        'scraping:failed',
  RESEARCH_PROGRESS:      'research:progress',
  CLASSIFICATION_COMPLETE:'classification:complete',
  NOTIFICATION:           'notification',

  // Client -> Server
  JOIN:  'join',
  LEAVE: 'leave',
  PING:  'ping'
};
