import MPEGDecoderWASM from "./emscripten-build.js";

export default class MPEGDecoderWebWorker extends Worker {
  static getWebworkerURL() {
    const MPEGDecoder = `(${MPEGDecoderWASM.toString()})()`;

    const webworkerSourceCode = `'use strict';(${((MPEGDecoder) => {
      // We're in a Web Worker
      let decoder = new MPEGDecoder();

      const detachBuffers = (buffer) =>
        Array.isArray(buffer)
          ? buffer.map((buffer) => new Uint8Array(buffer))
          : new Uint8Array(buffer);

      self.onmessage = (msg) => {
        decoder.ready.then(() => {
          switch (msg.data.command) {
            case "ready":
              self.postMessage({
                command: "ready",
              });
              break;
            case "free":
              decoder.free();
              self.postMessage({
                command: "free",
              });
              break;
            case "reset":
              decoder.free();
              decoder = new MPEGDecoder();
              self.postMessage({
                command: "reset",
              });
              break;
            case "decode":
            case "decodeFrame":
            case "decodeFrames":
              const { channelData, samplesDecoded, sampleRate } = decoder[
                msg.data.command
              ](detachBuffers(msg.data.mpegData));

              self.postMessage(
                {
                  command: msg.data.command,
                  channelData,
                  samplesDecoded,
                  sampleRate,
                },
                // The "transferList" parameter transfers ownership of channel data to main thread,
                // which avoids copying memory.
                channelData.map((channel) => channel.buffer)
              );
              break;
            default:
              this.console.error(
                "Unknown command sent to worker: " + msg.data.command
              );
          }
        });
      };
    }).toString()})(${MPEGDecoder})`;

    return URL.createObjectURL(
      new Blob([webworkerSourceCode], { type: "text/javascript" })
    );
  }

  constructor() {
    super(MPEGDecoderWebWorker.getWebworkerURL());
  }

  async _postToDecoder(command, mpegData) {
    return new Promise((resolve) => {
      this.postMessage({
        command,
        mpegData,
      });

      this.onmessage = (message) => {
        if (message.data.command === command) resolve(message.data);
      };
    });
  }

  terminate() {
    this.free().finally(() => {
      super.terminate();
    });
  }

  get ready() {
    return this._postToDecoder("ready");
  }

  async free() {
    await this._postToDecoder("free");
  }

  async reset() {
    await this._postToDecoder("reset");
  }

  async decode(data) {
    return this._postToDecoder("decode", data);
  }

  async decodeFrame(data) {
    return this._postToDecoder("decodeFrame", data);
  }

  async decodeFrames(data) {
    return this._postToDecoder("decodeFrames", data);
  }
}
