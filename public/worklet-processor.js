/** @import { AudioProcessor } from '@zoom/videosdk' */
class RecorderWorkletProcessor extends AudioProcessor {
  constructor(port, options) {
    super(port, options);
    port.addEventListener("message", (e) => {
      if (e.data.cmd === "update_watermark_image") {
        this.watermarkImage = e.data.image;
      }
    });
    this.buffer = [];
    this.bufferSize = 512;
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
      // if channelData is all 0, return true
      if (channelData.every((x) => x === 0)) {
        return true;
      } else {
        // store in a buffer till it is full
        this.buffer.push(...channelData);
        // console.log("buffer", this.buffer);
        if (this.buffer.length >= this.bufferSize) {
          this.port.postMessage(this.buffer);
          this.buffer = [];
          // console.log("channelData", channelData);
        }
      }
    }
    return true;
  }
}

registerProcessor("recorder-worklet", RecorderWorkletProcessor);
