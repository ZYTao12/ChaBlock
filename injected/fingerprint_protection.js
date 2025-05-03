(function() {
  const fingerprintingAPIs = {
    canvas: false,
    webgl: false,
    audio: false
  };

  // Canvas API Detection
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  HTMLCanvasElement.prototype.toDataURL = function() {
    fingerprintingAPIs.canvas = true;
    window.postMessage({ type: 'FINGERPRINT_DETECTED', api: 'canvas' }, '*');
    return originalToDataURL.apply(this, arguments);
  };

  CanvasRenderingContext2D.prototype.getImageData = function() {
    fingerprintingAPIs.canvas = true;
    window.postMessage({ type: 'FINGERPRINT_DETECTED', api: 'canvas' }, '*');
    return originalGetImageData.apply(this, arguments);
  };

  // WebGL Detection
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(contextType) {
    if (contextType === 'webgl' || contextType === 'experimental-webgl') {
      fingerprintingAPIs.webgl = true;
      window.postMessage({ type: 'FINGERPRINT_DETECTED', api: 'webgl' }, '*');
    }
    return originalGetContext.apply(this, arguments);
  };
})(); 