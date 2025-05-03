document.addEventListener('DOMContentLoaded', function() {
  const protectionToggle = document.getElementById('fingerprintProtection');
  const audioDetection = document.getElementById('audioDetection');
  const blockedCount = document.getElementById('blockedCount');

  // Load saved settings
  chrome.storage.local.get(['fingerprintProtection'], function(result) {
    protectionToggle.checked = result.fingerprintProtection || false;
  });

  // Get current tab to check for AudioContext detection
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.storage.local.get(['audioDetected_' + tabs[0].id], function(result) {
      if (result['audioDetected_' + tabs[0].id]) {
        audioDetection.style.display = 'block';
      }
    });
  });

  // Update blocked count
  chrome.storage.local.get(['blockedCount'], function(result) {
    blockedCount.textContent = result.blockedCount || 0;
  });

  // Handle toggle changes
  protectionToggle.addEventListener('change', function() {
    const isEnabled = protectionToggle.checked;
    chrome.storage.local.set({fingerprintProtection: isEnabled});
    
    // Notify content script of the change
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'fingerprintProtectionChanged',
        enabled: isEnabled
      });
    });
  });

  // Add this to update the counter
  chrome.declarativeNetRequest.getMatchedRules({}, function(result) {
    const blockedCount = document.getElementById('blockedCount');
    blockedCount.textContent = result.rulesMatchedSoFar || 0;
  });

  // Cookie management
  const cookieCount = document.getElementById('cookieCount');
  const showCookieDomains = document.getElementById('showCookieDomains');
  const cookieDomainList = document.getElementById('cookieDomainList');
  const clearCookies = document.getElementById('clearCookies');
  const clearConfirmation = document.getElementById('clearConfirmation');

  // Get current tab's cookies
  chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
    const currentTab = tabs[0];
    const url = new URL(currentTab.url);
    // Get eTLD+1 (registrable domain) - simplified version
    const mainDomain = url.hostname.split('.').slice(-2).join('.');
    console.log('Main domain:', mainDomain);

    try {
      // Get all cookies without filtering
      const allCookies = await chrome.cookies.getAll({});
      console.log('Total cookies found:', allCookies.length);
      
      const thirdPartyCookies = allCookies.filter(cookie => {
        // Remove leading dot and get registrable domain for cookie
        const cookieDomain = cookie.domain.startsWith('.') ? 
          cookie.domain.slice(1) : cookie.domain;
        const cookieRegistrableDomain = cookieDomain.split('.').slice(-2).join('.');
        
        const isThirdParty = cookieRegistrableDomain !== mainDomain;
        
        if (isThirdParty) {
          console.log('Third-party cookie found:', {
            domain: cookieDomain,
            registrableDomain: cookieRegistrableDomain,
            name: cookie.name,
            path: cookie.path,
            mainDomain: mainDomain
          });
        }
        return isThirdParty;
      });

      console.log('Third-party cookies found:', thirdPartyCookies.length);

      // Update cookie count
      cookieCount.textContent = 
        `This browser session serves ${thirdPartyCookies.length} third-party cookies`;

      // Show cookie domains
      showCookieDomains.addEventListener('click', async function(e) {
        e.preventDefault();
        
        // Get current tab
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        const currentTab = tabs[0];
        const url = new URL(currentTab.url);
        const mainDomain = url.hostname.split('.').slice(-2).join('.');

        try {
          // Get fresh cookie data
          const allCookies = await chrome.cookies.getAll({});
          const thirdPartyCookies = allCookies.filter(cookie => {
            const cookieDomain = cookie.domain.startsWith('.') ? 
              cookie.domain.slice(1) : cookie.domain;
            const cookieRegistrableDomain = cookieDomain.split('.').slice(-2).join('.');
            return cookieRegistrableDomain !== mainDomain;
          });

          // Toggle display and update content
          if (cookieDomainList.style.display === 'none') {
            const uniqueDomains = [...new Set(thirdPartyCookies.map(c => 
              c.domain.startsWith('.') ? c.domain.slice(1) : c.domain
            ))];
            cookieDomainList.innerHTML = uniqueDomains
              .map(domain => `<div>${domain}</div>`)
              .join('');
            cookieDomainList.style.display = 'block';
            
            // Update cookie count while we're at it
            cookieCount.textContent = 
              `This browser session serves ${thirdPartyCookies.length} third-party cookies`;
          } else {
            cookieDomainList.style.display = 'none';
          }
        } catch (error) {
          console.error('Error fetching cookie data:', error);
          cookieDomainList.innerHTML = '<div class="error">Error fetching cookie data</div>';
        }
      });

      // Clear cookies
      clearCookies.addEventListener('click', async function() {
        console.log('Starting cookie removal process...');
        let successCount = 0;
        let errorCount = 0;

        for (const cookie of thirdPartyCookies) {
          try {
            // Remove leading dot for URL construction
            const cookieDomain = cookie.domain.startsWith('.') ? 
              cookie.domain.slice(1) : cookie.domain;
            
            console.log('Attempting to remove cookie:', {
              name: cookie.name,
              domain: cookieDomain,
              path: cookie.path
            });

            await chrome.cookies.remove({
              url: `http${cookie.secure ? 's' : ''}://${cookieDomain}/`,
              name: cookie.name,
              storeId: cookie.storeId
            });
            
            successCount++;
            console.log(`Successfully removed cookie: ${cookie.name}`);
          } catch (error) {
            errorCount++;
            console.error('Failed to remove cookie:', {
              cookie: cookie.name,
              domain: cookie.domain,
              error: error.message
            });
          }
        }

        console.log('Cookie removal completed:', {
          total: thirdPartyCookies.length,
          success: successCount,
          errors: errorCount
        });

        // Update UI
        cookieCount.textContent = 'This website serves 0 third-party cookies';
        cookieDomainList.style.display = 'none';
        clearConfirmation.style.display = 'block';
        
        setTimeout(() => {
          clearConfirmation.style.display = 'none';
        }, 3000);
      });
    } catch (error) {
      console.error('Error in cookie management:', error);
      cookieCount.textContent = 'Error detecting cookies';
    }
  });

  function updatePrivacyScore() {
    chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
      const tabId = tabs[0].id;
      const result = await chrome.storage.local.get([
        `privacyScore_${tabId}`,
        `privacyScoreDetails_${tabId}`
      ]);
      const score = result[`privacyScore_${tabId}`] ?? 100;
      const details = result[`privacyScoreDetails_${tabId}`];
      
      const privacyScore = document.getElementById('privacyScore');
      const scoreDetails = document.getElementById('scoreDetails');
      const blockedCount = document.getElementById('blockedCount');
      
      // Update blocked count from details
      if (details && details.blockedTrackers) {
        blockedCount.textContent = details.blockedTrackers;
      }
      
      privacyScore.textContent = `Privacy Score: ${Math.round(score)}/100`;
      
      // Update score styling and message
      if (score >= 80) {
        privacyScore.className = 'score-good';
        scoreDetails.textContent = 'This site has excellent privacy practices';
      } else if (score >= 60) {
        privacyScore.className = 'score-moderate';
        scoreDetails.textContent = 'This site has moderate privacy concerns';
      } else {
        privacyScore.className = 'score-poor';
        scoreDetails.textContent = 'This site has significant privacy issues';
      }
    });
  }

  // Call updatePrivacyScore initially and after relevant actions
  updatePrivacyScore();

  // Add to existing cookie clear listener
  clearCookies.addEventListener('click', async function() {
    // Existing cookie clearing code...
    updatePrivacyScore();
  });

  // Add to existing protection toggle listener
  protectionToggle.addEventListener('change', function() {
    // Existing toggle code...
    updatePrivacyScore();
  });
});