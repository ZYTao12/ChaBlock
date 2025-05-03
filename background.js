import { trackerArray } from './blocklist/blocklist.js';

let blockedCount = 0;
let thirdPartyRequests = {};
let fingerprintingAPIs = {};
let trackerBlockCount = {};

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
    const tabId = info.request.tabId;
    if (tabId > 0) {
      trackerBlockCount[tabId] = (trackerBlockCount[tabId] || 0) + 1;
      calculatePrivacyScore(tabId);
    }
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

async function calculatePrivacyScore(tabId) {
  // Get tab information first
  const tab = await chrome.tabs.get(tabId);
  if (!tab || !tab.url) return 100; // Return perfect score for invalid/empty tabs

  // Get all relevant data
  const requests = thirdPartyRequests[tabId] || 0;
  const cookies = await chrome.cookies.getAll({});
  const apis = fingerprintingAPIs[tabId] || { canvas: false, webgl: false, audio: false };
  const blockedTrackers = trackerBlockCount[tabId] || 0;

  // Start with a perfect score of 100
  let score = 100;

  // Third-party requests: -1 point each, max -30 points
  const requestPenalty = Math.min(30, requests);
  score -= requestPenalty;

  // Third-party cookies: -2 points each, max -30 points
  const tabUrl = new URL(tab.url);
  const thirdPartyCookies = cookies.filter(cookie => {
    const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
    return !cookieDomain.includes(tabUrl.hostname);
  });
  const cookiePenalty = Math.min(30, thirdPartyCookies.length * 2);
  score -= cookiePenalty;

  // Fingerprinting APIs: -10 points each, max -30 points
  const activeAPIs = Object.values(apis).filter(Boolean).length;
  const apiPenalty = Math.min(30, activeAPIs * 10);
  score -= apiPenalty;

  // Add bonus points for blocked trackers: +2 points each, max +20 points
  const trackerBonus = Math.min(20, blockedTrackers * 2);
  score += trackerBonus;

  // Ensure score stays within 0-100 range
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  // Store the score and detailed breakdown
  await chrome.storage.local.set({
    [`privacyScore_${tabId}`]: finalScore,
    [`privacyScoreDetails_${tabId}`]: {
      requests,
      thirdPartyCookies: thirdPartyCookies.length,
      apis: activeAPIs,
      blockedTrackers,
      penalties: {
        requests: requestPenalty,
        cookies: cookiePenalty,
        apis: apiPenalty
      },
      bonus: trackerBonus
    }
  });

  return finalScore;
}

// Add this listener to track third-party requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId > 0) {  // Ignore requests not associated with tabs
      const tabId = details.tabId;
      if (!thirdPartyRequests[tabId]) {
        thirdPartyRequests[tabId] = 0;
      }
      
      // Check if request is third-party
      const requestUrl = new URL(details.url);
      chrome.tabs.get(tabId, (tab) => {
        if (tab && tab.url) {
          const tabUrl = new URL(tab.url);
          if (requestUrl.hostname !== tabUrl.hostname) {
            thirdPartyRequests[tabId]++;
          }
        }
      });
    }
    return { cancel: false };
  },
  { urls: ["<all_urls>"] }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FINGERPRINT_DETECTED' && sender.tab) {
    const tabId = sender.tab.id;
    fingerprintingAPIs[tabId] = fingerprintingAPIs[tabId] || {};
    fingerprintingAPIs[tabId][message.api] = true;
    calculatePrivacyScore(tabId);
  }
});

// Clean up data when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete thirdPartyRequests[tabId];
  delete fingerprintingAPIs[tabId];
  delete trackerBlockCount[tabId];
});