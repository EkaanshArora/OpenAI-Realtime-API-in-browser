import ZoomVideo, { Processor, VideoClient } from "@zoom/videosdk";
import { floatTo16BitPCM, generateSignature, PCM16ToFloat32Array } from "./utils";
import "./style.css";
import { OpenAIRealtimeWebSocket } from '@openai/agents-realtime';

// You should sign your JWT with a backend service in a production use-case
const sdkKey = import.meta.env.VITE_SDK_KEY as string;
const sdkSecret = import.meta.env.VITE_SDK_SECRET as string;

const topic = "TestOne";
const role = 1;
const username = `User-${String(Date.now()).slice(6)}`;
let processor: Processor;
let client: typeof VideoClient;
let audioContext: AudioContext | null = null;
let audioQueue: AudioBuffer[] = [];
let isPlaying = false;

const playNextAudio = () => {
  if (audioQueue.length === 0 || !audioContext) {
    isPlaying = false;
    return;
  }

  isPlaying = true;
  const audioBuffer = audioQueue.shift();
  if (!audioBuffer) return;

  const bufferSource = audioContext.createBufferSource();
  bufferSource.buffer = audioBuffer;
  bufferSource.connect(audioContext.destination);

  bufferSource.onended = () => {
    // Play the next audio in the queue
    playNextAudio();
  };

  bufferSource.start();
  console.log('Playing audio chunk, queue length:', audioQueue.length);
};

const startCall = async () => {
  const apiKey = ``;
  const connection = new OpenAIRealtimeWebSocket({
    useInsecureApiKey: true,
  });
  connection.on('*', (event) => {
    console.log(event);
  });
  // connection.on('audio', (e) => {
  //   console.log(e)
  // })
  connection.on('audio', (e) => {
    console.log(e)

    // Initialize audio context if it doesn't exist
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    // Resume audio context if it's suspended (required for user interaction)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const sampleRate = audioContext.sampleRate / 2;
    // event.data is a chunk of PCM16 audio
    const uint8Array = new Uint8Array(e.data);
    const float32Array = PCM16ToFloat32Array(uint8Array);

    // Create an AudioBuffer and add it to the queue
    const audioBuffer = audioContext.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.copyToChannel(float32Array, 0);

    // Add to queue
    audioQueue.push(audioBuffer);
    console.log('Audio chunk added to queue, queue length:', audioQueue.length);

    // Start playing if not already playing
    if (!isPlaying) {
      playNextAudio();
    }
  });

  connection.connect({
    apiKey: apiKey,
    model: 'gpt-4o-mini-realtime-preview',
    initialSessionConfig: {
      turnDetection: {
        type: 'server_vad',
      },
      instructions: 'Help like an agent',
      voice: 'marin',
      modalities: ['audio'],
      inputAudioFormat: 'pcm16',
      outputAudioFormat: 'pcm16',
    },
  });





  client = ZoomVideo.createClient();
  await client.init("en-US", "Global", { patchJsMedia: true });
  const token = generateSignature(topic, role, sdkKey, sdkSecret);
  await client.join(topic, token, username);
  const mediaStream = client.getMediaStream();
  await mediaStream.startAudio({ originalSound: true, backgroundNoiseSuppression: false });
  await mediaStream.startVideo();
  processor = await mediaStream.createProcessor({
    type: "audio",
    name: "recorder-worklet",
    url: window.location.origin + "/worklet-processor.js",
  });
  await mediaStream.addProcessor(processor); // Add a processor
  processor.port.onmessage = (e => {
    // console.log("raw", e.data);
    // const flat = flattenAudioData(e.data)
    // console.log({ flat })
    const pcm = floatTo16BitPCM(e.data)
    console.log({ pcm })
    connection.sendAudio(pcm);
  })
};

const leaveCall = async () => {
  const mediaStream = client.getMediaStream();
  // mediaStream.removeProcessor(processor);
  for (const user of client.getAllUser()) {
    const element = await mediaStream.detachVideo(user.userId);
    Array.isArray(element) ? element.forEach((el) => el.remove()) : element.remove();
  }
  await client.leave();
  await ZoomVideo.destroyClient();

  // Clean up audio context and queue
  if (audioContext) {
    await audioContext.close();
    audioContext = null;
  }
  audioQueue = [];
  isPlaying = false;
}

// UI Logic
const startBtn = document.querySelector("#start-btn") as HTMLButtonElement;
const stopBtn = document.querySelector("#stop-btn") as HTMLButtonElement;
const recordBtn = document.querySelector("#toggle-video-btn") as HTMLButtonElement;

startBtn.addEventListener("click", async () => {
  if (!sdkKey || !sdkSecret) {
    alert("Please enter SDK Key and SDK Secret in the .env file");
    return;
  }
  startBtn.innerHTML = "Connecting...";
  startBtn.disabled = true;
  await startCall();
  startBtn.innerHTML = "Connected";
  startBtn.style.display = "none";
  stopBtn.style.display = "block";
  recordBtn.style.display = "block";
});

stopBtn.addEventListener("click", async () => {
  recordBtn.style.display = "none";
  await leaveCall();
  stopBtn.style.display = "none";
  startBtn.style.display = "block";
  startBtn.innerHTML = "Join";
  startBtn.disabled = false;
});