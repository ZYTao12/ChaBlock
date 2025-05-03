// Inject this script to override AudioContext
(function() {
  const originalGetChannelData = AudioBuffer.prototype.getChannelData;
  const originalCopyFromChannel = AudioBuffer.prototype.copyFromChannel;
  
  // Notify when AudioContext is used
  function notifyAudioContextUsage() {
    window.postMessage({ type: 'AUDIO_CONTEXT_DETECTED' }, '*');
  }

  // Function to add controlled randomization
  function addNoise(array) {
    const noise = 1e-4; // Small noise value
    for (let i = 0; i < array.length; i++) {
      array[i] = array[i] + (Math.random() - 0.5) * noise;
    }
    return array;
  }

  // Override getChannelData
  AudioBuffer.prototype.getChannelData = function(channel) {
    notifyAudioContextUsage();
    const originalData = originalGetChannelData.call(this, channel);
    return addNoise(originalData);
  };

  // Override copyFromChannel
  AudioBuffer.prototype.copyFromChannel = function(destination, channelNumber, startInChannel) {
    notifyAudioContextUsage();
    originalCopyFromChannel.call(this, destination, channelNumber, startInChannel);
    addNoise(destination);
  };

  // Monitor AudioContext creation
  const audioContexts = ['AudioContext', 'webkitAudioContext'];
  audioContexts.forEach(contextType => {
    if (window[contextType]) {
      const original = window[contextType];
      window[contextType] = function() {
        notifyAudioContextUsage();
        return new original();
      };
    }
  });
})();
