const trackerArray = [
  '*://*.doubleclick.net/*',
  '*://*.google-analytics.com/*',
  '*://*.gstatic.com/*',
  '*://*.google.com/*',
  '*://*.facebook.com/*',
  '*://*.googlesyndication.com/*',
  '*://*.facebook.net/*',
  '*://*.googleadservices.com/*',
  '*://*.fonts.googleapis.com/*',
  '*://*.scorecardresearch.com/*',
  '*://*.adnxs.com/*',
  '*://*.twitter.com/*',
  '*://*.fbcdn.net/*',
  // '*://*.ajax.googleapis.com/*', // blocking this breaks many websites
  '*://*.yahoo.com/*',
  '*://*.rubiconproject.com/*',
  '*://*.openx.net/*',
  '*://*.googletagservices.com/*',
  '*://*.mathtag.com/*',
  '*://*.advertising.com/*',
];

const trackerSet = new Set(trackerArray);

export {trackerArray, trackerSet};