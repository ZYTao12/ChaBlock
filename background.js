import { trackerArray } from './blocklist/blocklist.js';

let blockedCount = 0;

async function updateDynamicRules() {
  // Remove existing rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRules.map(rule => rule.id)
  });

  // Create rules from tracker patterns
  const rules = trackerArray.map((pattern, index) => {
    // Convert pattern from wildcard format (*://*.example.com/*) to declarativeNetRequest format
    const domain = pattern
      .replace('*://*', '') // Remove protocol wildcard
      .replace('/*', '') // Remove path wildcard
      .replace('.', '\\.') // Escape dots
      .replace('*', '.*'); // Convert remaining wildcards to regex

    return {
      id: index + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        regexFilter: domain,
        resourceTypes: [
          'stylesheet',
          'script',
          'image',
          'xmlhttprequest',
          'sub_frame',
          'main_frame',
          'other'
        ]
      }
    };
  });

  // Add rules in batches to avoid hitting API limits
  const BATCH_SIZE = 100;
  for (let i = 0; i < rules.length; i += BATCH_SIZE) {
    const batch = rules.slice(i, i + BATCH_SIZE);
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: batch
      });
      console.log(`Added batch of ${batch.length} rules (${i + batch.length} total)`);
    } catch (error) {
      console.error('Error adding rules batch:', error);
    }
  }

  const finalRules = await chrome.declarativeNetRequest.getDynamicRules();
  console.log(`Final number of active rules: ${finalRules.length}`);
}

// Initialize rules when extension loads
updateDynamicRules();

// Track blocked requests
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(
  (info) => {
    blockedCount++;
    chrome.storage.local.set({ blockedCount: blockedCount });
    console.log('Blocked tracker:', info.request.url);
  }
);

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_BLOCKED_COUNT') {
    sendResponse({ count: blockedCount });
  }
  if (message.type === 'AUDIO_DETECTED' && sender.tab) {
    chrome.storage.local.set({
      ['audioDetected_' + sender.tab.id]: true
    });
  }
});
