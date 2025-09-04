import ZoomVideo, { Processor, VideoClient } from "@zoom/videosdk";
import { generateSignature } from "./utils";
import "./style.css";
import { z } from 'zod';
import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents-realtime';

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

  const agent = new RealtimeAgent({
    name: 'agent',
    instructions: 'You are an agent',
    // tools: [getWeatherTool],
  });

  // Automatically configures audio input/output — start talking
  const session = new RealtimeSession(agent);

  session.on('transport_event', (event) => {
    // this logs the events coming directly from the Realtime API server
    console.log(event);
  });
  await session.connect({ apiKey });

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
  // await client.init("en-US", "Global", { patchJsMedia: true });
  // const token = generateSignature(topic, role, sdkKey, sdkSecret);
  // await client.join(topic, token, username);
  // const mediaStream = client.getMediaStream();
  // await mediaStream.startAudio({ originalSound: true, backgroundNoiseSuppression: false });
  // await mediaStream.startVideo();
  // processor = await mediaStream.createProcessor({
  //   type: "audio",
  //   name: "recorder-worklet",
  //   url: window.location.origin + "/worklet-processor.js",
  // });
  // await mediaStream.addProcessor(processor); // Add a processor
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
