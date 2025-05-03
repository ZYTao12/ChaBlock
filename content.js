// Listen for AudioContext usage
function injectAudioProtection() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected/audio_protection.js');
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
}

// Monitor for AudioContext creation
const observer = new MutationObserver(() => {
  if (document.querySelector('audio') || 
      document.createElement('audio').constructor.toString().includes('AudioContext')) {
    chrome.runtime.sendMessage({
      type: 'AUDIO_DETECTED'
    });
    observer.disconnect();
  }
});

// Check protection status and initialize
chrome.storage.local.get(['fingerprintProtection'], function(result) {
  if (result.fingerprintProtection) {
    injectAudioProtection();
  }
});

// Listen for protection toggle changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'fingerprintProtectionChanged') {
    if (message.enabled) {
      injectAudioProtection();
    } else {
      location.reload(); // Reload to restore original behavior
    }
  }
});

// Listen for messages from injected script
window.addEventListener('message', function(event) {
  if (event.data.type === 'AUDIO_CONTEXT_DETECTED') {
    chrome.runtime.sendMessage({
      type: 'AUDIO_DETECTED'
    });
  }
});

// Start observing
observer.observe(document, {
  childList: true,
  subtree: true
});
