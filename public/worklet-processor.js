/** @import { AudioProcessor } from '@zoom/videosdk' */
class RecorderWorkletProcessor extends AudioProcessor {
  constructor(port, options) {
    super(port, options);
    port.addEventListener('message', (e) => {
      if (e.data.cmd === 'update_watermark_image') {
        this.watermarkImage = e.data.image;
      }
    });

    this.bufferSize = 11025;
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
