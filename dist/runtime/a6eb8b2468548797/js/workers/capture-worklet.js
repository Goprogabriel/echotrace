/* Self-contained AudioWorklet: receives only the selected media element, never microphone audio. */
class LocalPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super(); this.buffer = new Float32Array(4096); this.offset = 0; this.active = false;
    this.port.onmessage = e => {
      if (e.data === 'start') this.active = true;
      if (e.data === 'flush') { this.active = false; this.flush(); this.port.postMessage('flushed'); }
    };
  }
  flush() {
    if (this.offset) { const out = this.buffer.slice(0, this.offset); this.port.postMessage(out, [out.buffer]); this.offset = 0; }
  }
  process(inputs, outputs) {
    for (const output of outputs) for (const channel of output) channel.fill(0);
    const channels = inputs[0];
    if (!this.active || !channels?.length) return true;
    // Keep the strongest channel in this block; never cancel opposite-polarity stereo.
    let input = channels[0], bestEnergy = -1;
    for (const channel of channels) {
      let energy = 0; for (const sample of channel) energy += sample * sample;
      if (energy > bestEnergy) { input = channel; bestEnergy = energy; }
    }
    for (let i = 0; i < input.length; i++) { this.buffer[this.offset++] = input[i]; if (this.offset === this.buffer.length) this.flush(); }
    return true;
  }
}
registerProcessor('local-pcm-capture', LocalPcmCapture);
