// STT
function convertToFloat32(int16Array: Int16Array) {
  let float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768; // Normalize to range -1.0 to 1.0
  }
  return float32Array;
}

function playAudioFromInt16Array(int16Array: Int16Array, sampleRate = 24000) {
  const audioContext = new AudioContext();
  const float32Array = convertToFloat32(int16Array);

  // Create an AudioBuffer with 1 channel (mono), and the sample rate
  const audioBuffer = audioContext.createBuffer(1, float32Array.length, sampleRate);

  // Copy the Float32Array data into the buffer's channel
  audioBuffer.copyToChannel(float32Array, 0);

  // Create an AudioBufferSourceNode to play the buffer
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);

  // Start playing the audio
  source.start();
}

// TTS
// Converts Float32Array of audio data to PCM16 ArrayBuffer
function floatTo16BitPCM(float32Array: Float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

// Converts a Float32Array to base64-encoded PCM16 data
function base64EncodeAudio(float32Array: Float32Array) {
  const arrayBuffer = floatTo16BitPCM(float32Array);
  let binary = '';
  let bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000; // 32KB chunk size
  for (let i = 0; i < bytes.length; i += chunkSize) {
    let chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}
// Helper function to flatten the audio data array
function flattenAudioData(audioDataChunks) {
  // Calculate the total length of the combined audio data
  const totalLength = audioDataChunks.reduce((total, chunk) => total + chunk.length, 0);

  // Create a new Float32Array to hold the combined audio data
  const result = new Float32Array(totalLength);

  let offset = 0;
  for (const chunk of audioDataChunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

export { playAudioFromInt16Array, base64EncodeAudio, floatTo16BitPCM, convertToFloat32, flattenAudioData };

// Utility to play the recorded audio from Float32Array
function playAudioBuffer(float32Array) {
  const playContext = new AudioContext(); // New context for playback
  const sampleRate = playContext.sampleRate;

  // Step 1: Create an AudioBuffer
  const audioBuffer = playContext.createBuffer(1, float32Array.length, sampleRate);

  // Step 2: Copy the Float32Array data into the AudioBuffer
  audioBuffer.copyToChannel(float32Array, 0);

  // Step 3: Create an AudioBufferSourceNode and set its buffer
  const bufferSource = playContext.createBufferSource();
  bufferSource.onended = () => {
    playContext.close();
  };
  bufferSource.buffer = audioBuffer;

  // Step 4: Connect to destination (output speakers) and start playback
  bufferSource.connect(playContext.destination);
  bufferSource.start();


  console.log('Playback started');
}
// Helper function to decode Base64 to Uint8Array
function base64DecodeAudio(base64String) {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

// Convert PCM 16-bit back to Float32Array
function PCM16ToFloat32Array(uint8Array) {
  const float32Array = new Float32Array(uint8Array.length / 2);
  const dataView = new DataView(uint8Array.buffer);

  for (let i = 0; i < float32Array.length; i++) {
    const int16 = dataView.getInt16(i * 2, true); // little-endian
    float32Array[i] = int16 / 0x8000; // Convert back to float32 [-1, 1]
  }

  return float32Array;
}

// Play the decoded Float32Array as audio using the Web Audio API
function playDecodedAudio(float32Array) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Create an AudioBuffer for 1 channel (mono) audio
  const audioBuffer = audioContext.createBuffer(1, float32Array.length, audioContext.sampleRate);

  // Copy the float32Array data into the AudioBuffer's first channel
  audioBuffer.copyToChannel(float32Array, 0, 0);

  // Create a buffer source node to play the audio
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);

  // Start playing the audio
  source.start(0);
}

// Example usage: decode, convert and play
function decodeAndPlay(base64Audio) {
  const uint8Array = base64DecodeAudio(base64Audio);
  const float32Array = PCM16ToFloat32Array(uint8Array);
  playDecodedAudio(float32Array);
}