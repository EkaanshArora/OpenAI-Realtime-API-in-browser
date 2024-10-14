import { RealtimeClient } from '@openai/realtime-api-beta';
import { base64EncodeAudio, flattenAudioData, playAudioFromInt16Array } from './utils';
import ZoomVideoSDK from '@zoom/videosdk';
import './style.css';

const recordButton = document.getElementById('start') as HTMLButtonElement;
const input = document.getElementById('input') as HTMLInputElement;
const initButton = document.getElementById('init') as HTMLButtonElement;

initButton.addEventListener('click', async () => {
  const OpenAIKey = input.value || import.meta.env.VITE_OPENAI_API_KEY;
  if (!OpenAIKey) {
    alert('Please provide your OpenAI API key');
    return;
  }
  initButton.innerText = 'Initializing...';
  initButton.disabled = true;
  input.disabled = true;

  let isRecording = false;

  const client = new RealtimeClient({
    apiKey: OpenAIKey,
    dangerouslyAllowAPIKeyInBrowser: true,
  });
  client.updateSession({ instructions: 'You are a great, upbeat friend. Answer in English.' });
  client.updateSession({ voice: 'alloy' });
  client.updateSession({
    turn_detection: { type: 'server_vad' }, // or 'server_vad'
    input_audio_transcription: { model: 'whisper-1' },
  });

  client.on('conversation.updated', (event: any) => {
    const { item } = event;
    console.log(item);
    if (item.status === 'completed') {
      console.log(item);
      if (item.role === 'assistant') {
        if (item.formatted.audio) {
          playAudioFromInt16Array(item.formatted.audio);
        }
      }
    }
  });
  await client.connect();

  // const zoomClient = ZoomVideoSDK.createClient();
  const micTrack = ZoomVideoSDK.createLocalAudioTrack();
  await micTrack.start();

  recordButton.innerText = 'Start Recording';
  recordButton.disabled = false;

  let stream: MediaStream;
  let audioData: Float32Array[] = []; // To store the recorded audio data chunks
  let audioContext: AudioContext;
  let mediaStreamSource: MediaStreamAudioSourceNode;
  let workletNode: AudioWorkletNode;

  recordButton.addEventListener('click', async () => {
    if (!isRecording) {
      recordButton.innerText = 'Stop Recording';
      isRecording = true;
      audioData = []; // Reset the audio data array
      audioContext = new AudioContext();
      //@ts-expect-error typedef
      stream = micTrack.audioStream
      console.log(stream);
      await audioContext.audioWorklet.addModule('worklet-processor.js');
      mediaStreamSource = audioContext.createMediaStreamSource(stream);
      workletNode = new AudioWorkletNode(audioContext, 'recorder-worklet');
      mediaStreamSource.connect(workletNode);
      workletNode.connect(audioContext.destination);
      workletNode.port.onmessage = function (event) {
        if (!isRecording) return;
        audioData.push(new Float32Array(event.data));
      };
    } else {
      recordButton.innerText = 'Start Recording';
      isRecording = false;

      mediaStreamSource.disconnect();
      workletNode.disconnect();
      audioContext.close();

      const recordedAudio = flattenAudioData(audioData);
      // playAudioBuffer(recordedAudio);
      const base64buffer = base64EncodeAudio(recordedAudio);
      // decodeAndPlay(base64buffer);
      client.sendUserMessageContent([{ type: 'input_audio', audio: base64buffer }]);
    }
  });
});
