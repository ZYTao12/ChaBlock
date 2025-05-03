# ChaBlock

**ChaBlock** is a privacy-preserving Chrome extension designed to block trackers, mitigate fingerprinting, manage third-party cookies, and provide real-time insights into site-specific privacy risks.

## Features

- **Tracker Blocking**  
  ChaBlock uses a list-based blocking approach, targeting the top 20 most prevalent third-party tracking domains identified by Englehardt and Narayanan in their large-scale OpenWPM study. This concise list ensures effective blocking while maintaining speed and efficiency.

- **Fingerprinting Protection**  
  An optional fingerprint protection mode detects usage of known fingerprinting APIs. When the `AudioContext` API is invoked, ChaBlock alerts the user and injects a randomized fingerprint response to reduce identifiability.

- **Third-Party Cookie Management**  
  ChaBlock displays the number of third-party cookies set during a browsing session, identifies their source domains, and allows users to clear them with a single click.

- **Privacy Score**  
  The extension calculates a privacy score based on four factors:
  - Number of third-party requests
  - Number of third-party cookies
  - Use of fingerprinting APIs (Canvas, WebGL, AudioContext)
  - Number of trackers blocked

  The score is updated dynamically and presented with color-coded indicators: red (low), yellow (moderate), and green (high).

## Set-up

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" (top-right toggle).
4. Click **Load unpacked** and select the `privacy_extension` directory.

## Project Structure

<pre> 
privacy_extension/
├── background.js
├── content.js
├── fingerprint_protection.js
├── blocklist/
│   └── blocklist.js
├── injected/
│   ├── audio_protection.js
│   └── fingerprint_protection.js
├── popup/
│   ├── popup.js
│   ├── popup.html
│   └── popup.css
├── manifest.json
└── icons/
 </pre>

## Acknowledgments

- Tracker list based on:  
  Englehardt, S., & Narayanan, A. (2016). *Online tracking: A 1-million-site measurement and analysis*.  
- AI-generated code used in the project.

## License

MIT License
