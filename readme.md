# OpenAI Realtime API (in browser demo)

Use the [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) directly from the browser.

```
Browser -> Mediastream -> Worklet -> AudioBuffer -> Float32Array -> Float32Array[] (AudioBuffers) -> Float32Array (flattened) -> PCM16 ArrayBuffer -> Uint8Array -> base64 -> OpenAI API
```

Does not implement streaming buffers but it should be possible.

```bash
$ git clone --recurse-submodules https://github.com/EkaanshArora/OpenAI-Realtime-API-in-browser   
$ bun i
$ bun dev
```