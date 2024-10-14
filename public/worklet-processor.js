class RecorderWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 128;
    this.noiseThreshold = 0.02; // Adjust this threshold as needed
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];

      // Apply a simple noise gate
      for (let i = 0; i < channelData.length; i++) {
        if (Math.abs(channelData[i]) < this.noiseThreshold) {
          channelData[i] = 0; // Mute the audio below the threshold
        }
      }

      this.port.postMessage(channelData);
    }
    return true;
  }
}

registerProcessor("recorder-worklet", RecorderWorkletProcessor);
