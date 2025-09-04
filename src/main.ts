import ZoomVideo, { Processor, VideoClient } from "@zoom/videosdk";
import { flattenAudioData, floatTo16BitPCM, generateSignature, PCM16ToFloat32Array, playAudioBuffer, playAudioFromInt16Array } from "./utils";
import "./style.css";
import { z } from 'zod';
import { RealtimeAgent, RealtimeSession, OpenAIRealtimeWebSocket } from '@openai/agents-realtime';

// You should sign your JWT with a backend service in a production use-case
const sdkKey = import.meta.env.VITE_SDK_KEY as string;
const sdkSecret = import.meta.env.VITE_SDK_SECRET as string;

const topic = "TestOne";
const role = 1;
const username = `User-${String(new Date().getTime()).slice(6)}`;
let processor: Processor;
let client: typeof VideoClient;

const startCall = async () => {
  const apiKey = ``;
  const connection = new OpenAIRealtimeWebSocket({
    useInsecureApiKey: true,
  });
  connection.on('*', (event) => {
    console.log(event);
  });
  connection.connect({
    apiKey: apiKey,
    model: 'gpt-4o-mini-realtime-preview',
    initialSessionConfig: {
      instructions: 'Speak like a pirate',
      voice: 'marin',
      modalities: ['audio'],
      inputAudioFormat: 'pcm16',
      outputAudioFormat: 'pcm16',
    },
  });
  connection.on('audio', (e) => {
    console.log(e)
    // put stuff as it comes in a buffer -> queue
    // keep playing the buffer as it consolidates


    // const playContext = new AudioContext(); // New context for playback
    // const sampleRate = playContext.sampleRate / 2;
    // // event.data is a chunk of PCM16 audio
    // const uint8Array = new Uint8Array(e.data);
    // const float32Array = PCM16ToFloat32Array(uint8Array);

    // // Step 1: Create an AudioBuffer
    // const audioBuffer = playContext.createBuffer(1, float32Array.length, sampleRate);

    // // Step 2: Copy the Float32Array data into the AudioBuffer
    // audioBuffer.copyToChannel(float32Array, 0);

    // // Step 3: Create an AudioBufferSourceNode and set its buffer
    // const bufferSource = playContext.createBufferSource();
    // bufferSource.onended = () => {
    //   playContext.close();
    // };
    // bufferSource.buffer = audioBuffer;

    // // Step 4: Connect to destination (output speakers) and start playback
    // bufferSource.connect(playContext.destination);
    // bufferSource.start();
    // console.log('Playback started');
  }
  );

  // const agent = new RealtimeAgent({
  //   name: 'agent',
  //   instructions: 'You are an agent',
  //   // tools: [getWeatherTool],
  // });


  // // Automatically configures audio input/output — start talking
  // const session = new RealtimeSession(agent);

  // session.on('transport_event', (event) => {
  //   // this logs the events coming directly from the Realtime API server
  //   console.log(event);
  // });
  // await session.connect({ apiKey });

  // if (!OpenAIKey) {
  //   alert('Please provide your OpenAI API key');
  //   return;
  // }
  // let isRecording = false;

  // const OAIclient = new RealtimeClient({
  //   apiKey: OpenAIKey,
  //   dangerouslyAllowAPIKeyInBrowser: true,
  // });
  // OAIclient.updateSession({ instructions: 'You are a great, upbeat friend. Answer in English.' });
  // OAIclient.updateSession({ voice: 'alloy' });
  // OAIclient.updateSession({
  //   turn_detection: { type: 'server_vad' }, // or 'server_vad'
  //   input_audio_transcription: { model: 'whisper-1' },
  // });

  // client.on('conversation.updated', (event: any) => {
  //   const { item } = event;
  //   console.log(item);
  //   if (item.status === 'completed') {
  //     console.log(item);
  //     if (item.role === 'assistant') {
  //       if (item.formatted.audio) {
  //         playAudioFromInt16Array(item.formatted.audio);
  //       }
  //     }
  //   }
  // });
  // await client.connect();


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
    // console.log({ pcm })
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

// import { RealtimeClient } from '../openai-realtime-api-beta';
// import { base64EncodeAudio, flattenAudioData, playAudioFromInt16Array } from './utils';
// import ZoomVideoSDK from '@zoom/videosdk';
// import './style.css';

// const recordButton = document.getElementById('start') as HTMLButtonElement;
// const input = document.getElementById('input') as HTMLInputElement;
// const initButton = document.getElementById('init') as HTMLButtonElement;

// initButton.addEventListener('click', async () => {
//   const OpenAIKey = input.value || import.meta.env.VITE_OPENAI_API_KEY;
//   if (!OpenAIKey) {
//     alert('Please provide your OpenAI API key');
//     return;
//   }
//   initButton.innerText = 'Initializing...';
//   initButton.disabled = true;
//   input.disabled = true;

//   let isRecording = false;

//   const client = new RealtimeClient({
//     apiKey: OpenAIKey,
//     dangerouslyAllowAPIKeyInBrowser: true,
//   });
//   client.updateSession({ instructions: 'You are a great, upbeat friend. Answer in English.' });
//   client.updateSession({ voice: 'alloy' });
//   client.updateSession({
//     turn_detection: { type: 'server_vad' }, // or 'server_vad'
//     input_audio_transcription: { model: 'whisper-1' },
//   });

//   client.on('conversation.updated', (event: any) => {
//     const { item } = event;
//     console.log(item);
//     if (item.status === 'completed') {
//       console.log(item);
//       if (item.role === 'assistant') {
//         if (item.formatted.audio) {
//           playAudioFromInt16Array(item.formatted.audio);
//         }
//       }
//     }
//   });
//   await client.connect();

//   // const zoomClient = ZoomVideoSDK.createClient();
//   const micTrack = ZoomVideoSDK.createLocalAudioTrack();
//   await micTrack.start();

//   recordButton.innerText = 'Start Recording';
//   recordButton.disabled = false;

//   let stream: MediaStream;
//   let audioData: Float32Array[] = []; // To store the recorded audio data chunks
//   let audioContext: AudioContext;
//   let mediaStreamSource: MediaStreamAudioSourceNode;
//   let workletNode: AudioWorkletNode;

//   recordButton.addEventListener('click', async () => {
//     if (!isRecording) {
//       recordButton.innerText = 'Stop Recording';
//       isRecording = true;
//       audioData = []; // Reset the audio data array
//       audioContext = new AudioContext();
//       //@ts-expect-error typedef
//       stream = micTrack.audioStream
//       console.log(stream);
//       await audioContext.audioWorklet.addModule('worklet-processor.js');
//       mediaStreamSource = audioContext.createMediaStreamSource(stream);
//       workletNode = new AudioWorkletNode(audioContext, 'recorder-worklet');
//       mediaStreamSource.connect(workletNode);
//       workletNode.connect(audioContext.destination);
//       workletNode.port.onmessage = function (event) {
//         if (!isRecording) return;
//         audioData.push(new Float32Array(event.data));
//       };
//     } else {
//       recordButton.innerText = 'Start Recording';
//       isRecording = false;

//       mediaStreamSource.disconnect();
//       workletNode.disconnect();
//       audioContext.close();

//       const recordedAudio = flattenAudioData(audioData);
//       // playAudioBuffer(recordedAudio);
//       const base64buffer = base64EncodeAudio(recordedAudio);
//       // decodeAndPlay(base64buffer);
//       client.sendUserMessageContent([{ type: 'input_audio', audio: base64buffer }]);
//     }
//   });
// });
