(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@eshaz/web-worker')) :
  typeof define === 'function' && define.amd ? define(['exports', '@eshaz/web-worker'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["opus-decoder"] = {}, global.Worker));
})(this, (function (exports, NodeWorker) { 'use strict';

  function WASMAudioDecoderCommon() {
    // setup static methods
    const uint8Array = Uint8Array;
    const float32Array = Float32Array;

    if (!WASMAudioDecoderCommon.modules) {
      Object.defineProperties(WASMAudioDecoderCommon, {
        modules: {
          value: new WeakMap(),
        },

        setModule: {
          value(Ref, module) {
            WASMAudioDecoderCommon.modules.set(Ref, Promise.resolve(module));
          },
        },

        getModule: {
          value(Ref, wasmString) {
            let module = WASMAudioDecoderCommon.modules.get(Ref);

            if (!module) {
              if (!wasmString) {
                wasmString = Ref.wasm;
                module = WASMAudioDecoderCommon.inflateDynEncodeString(
                  wasmString
                ).then((data) => WebAssembly.compile(data));
              } else {
                module = WebAssembly.compile(
                  WASMAudioDecoderCommon.decodeDynString(wasmString)
                );
              }

              WASMAudioDecoderCommon.modules.set(Ref, module);
            }

            return module;
          },
        },

        concatFloat32: {
          value(buffers, length) {
            let ret = new float32Array(length),
              i = 0,
              offset = 0;

            while (i < buffers.length) {
              ret.set(buffers[i], offset);
              offset += buffers[i++].length;
            }

            return ret;
          },
        },

        getDecodedAudio: {
          value: (errors, channelData, samplesDecoded, sampleRate, bitDepth) => ({
            errors,
            channelData,
            samplesDecoded,
            sampleRate,
            bitDepth,
          }),
        },

        getDecodedAudioMultiChannel: {
          value(
            errors,
            input,
            channelsDecoded,
            samplesDecoded,
            sampleRate,
            bitDepth
          ) {
            let channelData = [],
              i,
              j;

            for (i = 0; i < channelsDecoded; i++) {
              const channel = [];
              for (j = 0; j < input.length; ) channel.push(input[j++][i] || []);
              channelData.push(
                WASMAudioDecoderCommon.concatFloat32(channel, samplesDecoded)
              );
            }

            return WASMAudioDecoderCommon.getDecodedAudio(
              errors,
              channelData,
              samplesDecoded,
              sampleRate,
              bitDepth
            );
          },
        },

        /*
         ******************
         * Compression Code
         ******************
         */

        crc32Table: {
          value: (() => {
            let crc32Table = new Int32Array(256),
              i,
              j,
              c;

            for (i = 0; i < 256; i++) {
              for (c = i << 24, j = 8; j > 0; --j)
                c = c & 0x80000000 ? (c << 1) ^ 0x04c11db7 : c << 1;
              crc32Table[i] = c;
            }
            return crc32Table;
          })(),
        },

        decodeDynString: {
          value(source) {
            let output = new uint8Array(source.length);
            let offset = parseInt(source.substring(11, 13), 16);
            let offsetReverse = 256 - offset;

            let crcIdx,
              escaped = false,
              byteIndex = 0,
              byte,
              i = 21,
              expectedCrc,
              resultCrc = 0xffffffff;

            while (i < source.length) {
              byte = source.charCodeAt(i++);

              if (byte === 61 && !escaped) {
                escaped = true;
                continue;
              }

              if (escaped) {
                escaped = false;
                byte -= 64;
              }

              output[byteIndex] =
                byte < offset && byte > 0 ? byte + offsetReverse : byte - offset;

              resultCrc =
                (resultCrc << 8) ^
                WASMAudioDecoderCommon.crc32Table[
                  ((resultCrc >> 24) ^ output[byteIndex++]) & 255
                ];
            }

            // expected crc
            for (crcIdx = 0; crcIdx <= 8; crcIdx += 2)
              expectedCrc |=
                parseInt(source.substring(13 + crcIdx, 15 + crcIdx), 16) <<
                (crcIdx * 4);

            if (expectedCrc !== resultCrc)
              throw new Error("WASM string decode failed crc32 validation");

            return output.subarray(0, byteIndex);
          },
        },

        inflateDynEncodeString: {
          value(source) {
            source = WASMAudioDecoderCommon.decodeDynString(source);

            return new Promise((resolve) => {
              // prettier-ignore
              const puffString = String.raw`dynEncode0114db91da9bu*ttt$#U¤¤U¤¤3yzzss|yusvuyÚ&4<054<,5T44^T44<(6U~J(44< ~A544U~6J0444545 444J0444J,4U4UÒ7U454U4Z4U4U^/6545T4T44BU~64CU~O4U54U~5 U5T4B4Z!4U~5U5U5T4U~6U4ZTU5U5T44~4O4U2ZTU5T44Z!4B6T44U~64B6U~O44U~4O4U~54U~5 44~C4~54U~5 44~5454U4B6Ub!444~UO4U~5 U54U4ZTU#44U$464<4~B6^4<444~U~B4U~54U544~544~U5 µUä#UJUè#5TT4U0ZTTUX5U5T4T4Uà#~4OU4U $~C4~54U~5 T44$6U\!TTT4UaT4<6T4<64<Z!44~4N4<U~5 4UZ!4U±_TU#44UU6UÔ~B$544$6U\!4U6U¤#~B44Uä#~B$~64<6_TU#444U~B~6~54<Y!44<_!T4Y!4<64~444~AN44<U~6J4U5 44J4U[!U#44UO4U~54U~5 U54 7U6844J44J 4UJ4UJ04VK(44<J44<J$4U´~54U~5 4U¤~5!TTT4U$5"U5TTTTTTT4U$"4VK,U54<(6U~64<$6_!4< 64~6A54A544U~6#J(U54A4U[!44J(44#~A4U6UUU[!4464~64_!4<64~54<6T4<4]TU5 T4Y!44~44~AN4U~54U~54U5 44J(44J UÄA!U5U#UôJU"UÔJU#UÔ"JU#U´"JT4U´ZTU5T4UôZTU5T4UDZTU5T4U$[T44~UO4U~5 UÔUô4U~U´$.U5T4UP[T4U~4~UO4U~5 U#<U#<4U~U2$.UÄUN 44 ~UO4U~5 44!~UO4U~5 4U~4~UO4U~5 44J44J(U5 44U¤~J@44Uä~J<44UD~J844U~J44U$54U$5U54U$54U1^4U1^!4U~54U~5U54U~6U4U^/65T4T4U$54U~4BU~4O4U54U~5 UU'464U'_/54UU~5T4T4U~4BU~UO4U54U~5 U54Uä~4U¤~4U~U'$!44~5U5T44\T44U<~$6U\!4U#aT4U~4U~4O4U~5 U5U5U5TTT4U$"4YTU5 4U4~C5U5 U5U5444$4~64~\TU5 4U~4U~5T4Y!44O4U~54U~54U5 4CYTU5 4Uä~4U¤~4U~4$6TU54U\!44Bæ4Bä~[!4U~4UD~4U~4U~4$6TU54U\!44B4B~[!44U<~4U4~$5 4U"U#$544"Y!454U^!44<J44<(J454U~84­UN!#%'+/37?GOWgw·×÷Uä;U9$%& !"#`;

              WASMAudioDecoderCommon.getModule(WASMAudioDecoderCommon, puffString)
                .then((wasm) => WebAssembly.instantiate(wasm, {}))
                .then(({ exports }) => {
                  // required for minifiers that mangle the __heap_base property
                  const instanceExports = new Map(Object.entries(exports));

                  const puff = instanceExports.get("puff");
                  const memory = instanceExports.get("memory")["buffer"];
                  const dataArray = new uint8Array(memory);
                  const heapView = new DataView(memory);

                  let heapPos = instanceExports.get("__heap_base");

                  // source length
                  const sourceLength = source.length;
                  const sourceLengthPtr = heapPos;
                  heapPos += 4;
                  heapView.setInt32(sourceLengthPtr, sourceLength, true);

                  // source data
                  const sourcePtr = heapPos;
                  heapPos += sourceLength;
                  dataArray.set(source, sourcePtr);

                  // destination length
                  const destLengthPtr = heapPos;
                  heapPos += 4;
                  heapView.setInt32(
                    destLengthPtr,
                    dataArray.byteLength - heapPos,
                    true
                  );

                  // destination data fills in the rest of the heap
                  puff(heapPos, destLengthPtr, sourcePtr, sourceLengthPtr);

                  resolve(
                    dataArray.slice(
                      heapPos,
                      heapPos + heapView.getInt32(destLengthPtr, true)
                    )
                  );
                });
            });
          },
        },
      });
    }

    Object.defineProperty(this, "wasm", {
      enumerable: true,
      get: () => this._wasm,
    });

    this.getOutputChannels = (outputData, channelsDecoded, samplesDecoded) => {
      let output = [],
        i = 0;

      while (i < channelsDecoded)
        output.push(
          outputData.slice(
            i * samplesDecoded,
            i++ * samplesDecoded + samplesDecoded
          )
        );

      return output;
    };

    this.allocateTypedArray = (len, TypedArray, setPointer = true) => {
      const ptr = this._wasm.malloc(TypedArray.BYTES_PER_ELEMENT * len);
      if (setPointer) this._pointers.add(ptr);

      return {
        ptr: ptr,
        len: len,
        buf: new TypedArray(this._wasm.HEAP, ptr, len),
      };
    };

    this.free = () => {
      this._pointers.forEach((ptr) => {
        this._wasm.free(ptr);
      });
      this._pointers.clear();
    };

    this.codeToString = (ptr) => {
      const characters = [],
        heap = new Uint8Array(this._wasm.HEAP);
      for (let character = heap[ptr]; character !== 0; character = heap[++ptr])
        characters.push(character);

      return String.fromCharCode.apply(null, characters);
    };

    this.addError = (
      errors,
      message,
      frameLength,
      frameNumber,
      inputBytes,
      outputSamples
    ) => {
      errors.push({
        message: message,
        frameLength: frameLength,
        frameNumber: frameNumber,
        inputBytes: inputBytes,
        outputSamples: outputSamples,
      });
    };

    this.instantiate = (_EmscriptenWASM, _module) => {
      if (_module) WASMAudioDecoderCommon.setModule(_EmscriptenWASM, _module);
      this._wasm = new _EmscriptenWASM(WASMAudioDecoderCommon).instantiate();
      this._pointers = new Set();

      return this._wasm.ready.then(() => this);
    };
  }

  const getWorker = () => globalThis.Worker || NodeWorker;

  class WASMAudioDecoderWorker extends getWorker() {
    constructor(options, name, Decoder, EmscriptenWASM) {
      if (!WASMAudioDecoderCommon.modules) new WASMAudioDecoderCommon();

      let source = WASMAudioDecoderCommon.modules.get(Decoder);

      if (!source) {
        let type = "text/javascript",
          isNode,
          webworkerSourceCode =
            "'use strict';" +
            // dependencies need to be manually resolved when stringifying this function
            `(${((_Decoder, _WASMAudioDecoderCommon, _EmscriptenWASM) => {
            // We're in a Web Worker

            // setup Promise that will be resolved once the WebAssembly Module is received
            let decoder,
              moduleResolve,
              modulePromise = new Promise((resolve) => {
                moduleResolve = resolve;
              });

            self.onmessage = ({ data: { id, command, data } }) => {
              let messagePromise = modulePromise,
                messagePayload = { id },
                transferList;

              if (command === "init") {
                Object.defineProperties(_Decoder, {
                  WASMAudioDecoderCommon: { value: _WASMAudioDecoderCommon },
                  EmscriptenWASM: { value: _EmscriptenWASM },
                  module: { value: data.module },
                  isWebWorker: { value: true },
                });

                decoder = new _Decoder(data.options);
                moduleResolve();
              } else if (command === "free") {
                decoder.free();
              } else if (command === "ready") {
                messagePromise = messagePromise.then(() => decoder.ready);
              } else if (command === "reset") {
                messagePromise = messagePromise.then(() => decoder.reset());
              } else {
                // "decode":
                // "decodeFrame":
                // "decodeFrames":
                Object.assign(
                  messagePayload,
                  decoder[command](
                    // detach buffers
                    Array.isArray(data)
                      ? data.map((data) => new Uint8Array(data))
                      : new Uint8Array(data)
                  )
                );
                // The "transferList" parameter transfers ownership of channel data to main thread,
                // which avoids copying memory.
                transferList = messagePayload.channelData
                  ? messagePayload.channelData.map((channel) => channel.buffer)
                  : [];
              }

              messagePromise.then(() =>
                self.postMessage(messagePayload, transferList)
              );
            };
          }).toString()})(${Decoder}, ${WASMAudioDecoderCommon}, ${EmscriptenWASM})`;

        try {
          isNode = typeof process.versions.node !== "undefined";
        } catch {}

        source = isNode
          ? `data:${type};base64,${Buffer.from(webworkerSourceCode).toString(
            "base64"
          )}`
          : URL.createObjectURL(new Blob([webworkerSourceCode], { type }));

        WASMAudioDecoderCommon.modules.set(Decoder, source);
      }

      super(source, { name });

      this._id = Number.MIN_SAFE_INTEGER;
      this._enqueuedOperations = new Map();

      this.onmessage = ({ data }) => {
        const { id, ...rest } = data;
        this._enqueuedOperations.get(id)(rest);
        this._enqueuedOperations.delete(id);
      };

      new EmscriptenWASM(WASMAudioDecoderCommon).getModule().then((module) => {
        this.postToDecoder("init", { module, options });
      });
    }

    async postToDecoder(command, data) {
      return new Promise((resolve) => {
        this.postMessage({
          command,
          id: this._id,
          data,
        });

        this._enqueuedOperations.set(this._id++, resolve);
      });
    }

    get ready() {
      return this.postToDecoder("ready");
    }

    async free() {
      await this.postToDecoder("free").finally(() => {
        this.terminate();
      });
    }

    async reset() {
      await this.postToDecoder("reset");
    }
  }

  const assignNames = (Class, name) => {
    Object.defineProperty(Class, "name", { value: name });
  };

  /* **************************************************
   * This file is auto-generated during the build process.
   * Any edits to this file will be overwritten.
   ****************************************************/

  function EmscriptenWASM(WASMAudioDecoderCommon) {

  function ready() {}

  function abort(what) {
   throw what;
  }

  for (var base64ReverseLookup = new Uint8Array(123), i = 25; i >= 0; --i) {
   base64ReverseLookup[48 + i] = 52 + i;
   base64ReverseLookup[65 + i] = i;
   base64ReverseLookup[97 + i] = 26 + i;
  }

  base64ReverseLookup[43] = 62;

  base64ReverseLookup[47] = 63;

  if (!EmscriptenWASM.wasm) Object.defineProperty(EmscriptenWASM, "wasm", {get: () => String.raw`dynEncode0159cc2cadd5ÍêÞî5i à=}^Hw#Tºñn¿¿9ñrxuQ«¢³Íé+c!1LuçJPðß^¼t¤aYQbT¦vî­qå V¿[n¶Ã~Vs^©Gä*7·
®ªÂ7ß
ê=}«¥ó×:J+Åÿ±jKy×ìY-ß¼©.HÑWöY+H}a¨¨âYY}])e-_1·{åjµ¯ËNgÇdÚÜ'y[î2ïáDjû{{_o@u¬þk±CÇGâqÓôôõµ¬4=}Û7WQR\þýå¬]f¬\,dö= hYwpjHh½Cöy ÷Çx!¤>Î¬dPÒÁç®)ÕíÇ5?TËlwkºEB/x8K=}J]n©4øùVÌIUgÊêQOG³ÇxÛA58É¨D¹Wa]k¡å#Ú#üïvÚåÓ[Nqf]sKÚ*8ÚWS)X \vvA=M*R@æ^½Í)FE//òWs=}6L|6ïðÎUÓìÕ[S¬"(_>JÐ¼$M÷WÊëÑ^)áYrJn9øm.	?QLÒÑ×ñ4Uo~NùìÃ	 F¾Elö?ÉkÒ@dÒfÏû@MÞÉçè<1+FGÂóBGªÔ|!/ã/¯!ÏÇÕv= öÏÆg¿?0p=}¡·çhðD %$%Aïòòòò"HTCíÓ½= O@åC-ú­.vË÷£È_^üp÷¡©Pº=Màg°ÚÙfyõçæùJ5)kÙ§Ü\jY^åp<Ïx<ÑÈ_L«2s	\T;±áÞ5,ng0_óµ *üv9jÆ3-3íY¾<ÐýDGü{<4&êD\û7ÄÎà^¨MçÁ¬ÄìÄ;[yk´?ÐD²SÐ!OÍ,yftÁ.l=}m'ð¼¡>gBva_K^´Ýÿ&;: ÷9¦·Ñ}ë¹?E	|WmQ´mÇXÊdßã%N8¬eX·d¦p8ìÝ"7\Z-»ÔD§ÇR¹l(6aQH~ñf= ÊÈqgü:$ÜfØ23ÅñºØñ_^÷^(ªØ©n6Y	=MÔ+1CÊqaÅfnÜXK°IY
Ò>9Æ°]ý6® #W4Ûà0Úï¾×\Ëæa\®»W{1i¼ìAyÚ¼éYÇ³/ÞæD,&§è¢Ì¢Ì_)âÏ)o%´-ç¦3?àÛ/12ýb×à5¡Þ±ÁZM&ôGto½äÛÐ}Nºûbj[8!­ÒÖ_¤$=}úk¿ÈÙ[ª³O7k¨ÅiM4Ìf	ÇÈýe8k¶A]Aãüê0%|dT'<çñ~ BNermÁ3i#CóiÒÌb´½£À4Öß]Ø)@÷ß¦Öòh°Jm*¿^GSëkG-Jôñ|>-­Çþd>Á^m1'» ·eNHvs¤4&À¶ù¤üxHS	¸\Þ­
­Êgþ3
¾lë©ÕÞæ-ª~²)Lh|íê¹*íê)e!¤|\éÑ=M¶Ë24$ÁYÕ¡cñ=})íEÌº"îÿuhl[[-ci~]ä«ÙDd^Û°¸\ö~	Û¢ðÖá1SPÛÐ¹õJ¹^ü8¶û= [tñÙ!Çòæ@OiÍ.&TÀ¶@?îùbLß±Ýëù¾èlCæÌ¬¼àjýþ]L%i¨Dm^pñhX÷}7Q]Õ[Xãw(½9D=Mÿ}ªþ¯Ì¡f×Õ	ë¶×¤$Ø²Öc
QésøM0\IJ¿ÓD-ßBê,+ÌTQý¶F3û·oñ1f6XÝ­krÝ¸±
2½à¤ó'pÄÒËeNø*ê{®§MÞXFd¥gÕhl«éNõ!m¯K4íKßÑ_fÑ 2ÔÆ4eI­pOÕc0¶7ÈD¦°­/ÞâóHd)Mó8dób+?Âaf_%Æ´U )ð¥þâò1ÆH¾Å§èz]åÂ5ç1Òê9Ý»BèøªÃE&ç0fìJú¦ìù"ZÃ	º=}øÄ¶³*¼0¹b¼b´/]eöÙì¥I¹q3t0íµ§ZâaØ³ïa=Mj)á&ÙRÉ¯UG£­G¾xc!%g0Boyów»£­N®O«IMÐ%Ù&Þ ç&¡>úû= °Â É²¢bÏT=Mm0D.pFù×¡üà= ®&þÅº´FBÁÆ¤mU	²´åî´4®¡­ëÓ­EÒ­Þ­{%ÛÔº"Ü¡$íZ5\ØÞïÅ V!÷9éûàgô.ïüÈââ= Ü 3Ó=U«áñUÌöÐº=M±YÉ1âr	" ¥1ø¼¯1ç¦"ÿ¹¯¹IÔâhl?yî¡4öòõMÌþ¦#ú/ÿ&3ý4_²ÓK[';pÇÜ!ãOí%¢Pn¬'Å¢Á;Â¾½ìØâüÐ4õ&¦â8oÓù$°iõL	°²êEu
z»Û²Ã¬ëm:n ñ;hS´¬"´/§ghª0ëµÖoaã~¸ÒsÖ= Å¾û|ì!ùébÁþFTy­kC)ÈÂÜ3eTÃº\1åF0h2'õñz|ç¸M
h:\,PÂÚóO)½4¦×vÆH_	E}+ ÍêÙÉ>¸>)zS|²7¥J]DÚ3æ§Nksq¢YxósÌ?ôTAí6U	º^<ÓÃ_C¤GÜ÷Sáî	çu§ÿkU¦¯ÖÖòÕm<;¥;vA{:Û?}2o©=Ml{O2?o?hê=}Ì·Q?ÈÓB;;a6M*×AJèR5#ëLèÓyÞÇ5«d' åªä·ÁÞ÷¥W&ÆÌqíT÷vÄÖîdª?fíõ1ü/Õmú·Vôù=MK¢1x«RZÞf¢iâfâ<ÌEã5û- =}5¾çI!ÜnÖYêSm{ú±ú8§^Y!oQ7kJ]«4â¥Ç8k¡¦]Ìé)¤#¬cRÇ2¼goÚúBË= PcZð\g<è¼1zFºÕ4wf»±¼aJXo1e7çË¨qoU¬câ¡¯^aúeôÔ©ôÑWï3Û´ër$zwá¥ín.î ´ùeáRëâëüºùò/7È³«Üë·¨Q
±¶Þù¿ÙÝ:{Øfe5\ÐjiÚÀ£X3-> §U1äu<Yý\aòQÀ´iÊ^ùÕfAÚtEÌ¤ÌëT	Ò+ÛÔéÓÃd²Ùù¤1Ý¡Äè5:ÝtÌÑVè^ú± øê#.eÝNLEzÔSA½¼¢\gLÅÝª\»ª#?åfß5¹ÀöSrìÜýR%8;ÈZ=Mq8ºi'&ÙÞ_èRÚ·{8ÂOsþ¶ÒOéf¯¢.¬¬ÓÇ^hj¡H
[ä^d¤g¸ÄnfcY~ÙÉçÔ¡a3ÁnzPñºôÓ Ðc-²Â,£SW©¯¤È"&°Uò
òEÌ;&46¢X¾\æöÙz{=MZý02FÈ(¥^æ6­ÛÞP¤ÿQïÙ¨òGÜ&ëWøP+ÖÉ5:h/â 7o>PS@Öl·"ökã|äëDâL¢¯qeOBÂÙãzeq·8_^C>Ë(å¼\¼,¥\(¹ 5;ù:£72ÆàhÿÈNÖæÁ¯7Ö/²Ö¨üÐrg ¿Ð©ááÀyª¹ê!Ù4qs9é®´æ¨L(ð£ÂÔ¡g*O-^ð4´Iàì ¬ImnPûgvC/üqH×'VDcÄ±Èø¿Na/a¨nV;@UÆ-Ñþ«(ã³t¬jÏÄOËÐxnT0Jó0¤GjM±#ÇAÔ½nf¼>>ãS×<®I%Q.î[w(<³][4aÙ=}ýNáUC = = Z¼[D:SyÉcý1g;ã¡ÙÐXÓè¦¨buBÚ÷½]	VØºíExãwöÏNãÅpK\ØÐ>*ÿ"ÓR¬¼iL µÓG½Æ¼ñ+drL;ÆìdÆ1Ðâ7]!Oöºj	XâE6ÔfGhÝ1;l¼ËVÐcú|ß0@ôTI·¹¬³ÝÆËMKÄ¬ìÚsNP]Xq7Óüâ¸ÌÆ/U£)c0ùG¼Aõi'õfTZ|HÂºü¨XÉôVr®2= 2M¦o'X<&Ô\v×6Â/ÿHùÈl÷ y¡Ö/®fæÆ5#ºÕËÙDãDÓÇ@ö&+Yç5öûfA«Q:iä£Iã]¯V|WH'Rdô¶cWuíB ¦ãÙ§OzªSÚXèêGy ÝÓ,¤g<©^&¨_y+¢*Ü¸ÝöÐx]^Ï7§0À4SeÙº°j5k¿mÐ<vh·Aë©!çkäu
ç§ y{ZàajþQîÒH>~>ÒVg¥u¢¸gFÕ;rJqBçBO«LçÐ4¦È0"eºC2|ð¦=MÄwÜ] 86M?ÏáWÉÌ£*wÜ,´Vükqq QþÓ´± ìdÅ)½?TþWåöµÌt¯0æÁud9íÏÒxXx$²W NãA ²Ú%a°½údÝÝ»Ð6³ÑÍ­ÂL×ë!ádlÌ%c7UµÏhAò<Ï=}¢_3êÉCÛW<}Y±ãÄg>xxX¾© [mOcgnµ¾$I§¦¡÷\90Zý>»©âwõôP\+ÐÙ.M{iÀOjLÝw©Gýa$Z>B78æ}c'LW)'\nº_ôªV¿isàac´upÔB<½è202bU×"ÔíÜÛ¨PóG¤°5|÷£gQÌigÌvUö·¦FOÛcç0N¸9IºEL5
¢\ÈÄ#LUð»\POÐ55U¼rg95@ôÈ'rûÄÑ¡óXÈG0+h\®=M¦6ó|èÝbðpK¡wúbæñ= }H½"Ù¸\ VQ½¿xÛËw Axö!Rò!jS¿cS|é¤PÈÃrø½?ÚÄ}BÚ[Ü0;NM¼ð}þÒ0ÙÄD ÷ûzëiÉùü¹¦'ðuQAj.Ëþ+¹K¶ù¥¯C1=MRU0&iL±¯r$ÉTr¸ÉÕfyù^Ó(y?ü2)¿ÕÅrÏèfï-4\ÐöµêEÕÍô¿í÷èÈ-Õê| ]$¿	Äÿñfìç<iôõ1ô·256= ðëyÇ¾-#òøèWL¡ß ¹©9æ@ññôü7ð¾¡^))RQê=}iÜ2¦5øØ³­ éÔ('ô¹HB b&O®[¡75V|°?gä¢ÍÁ¸'H3Lþzð£#þÐÔ4yJ÷L*ØèéÍ\Üiu#óuÿû>f¡³ÕÆÿQ6Áô´ÜOêYßK|/ëqÌd¤"6Äs¡¤ìánæQáözQ= )<á=}W¦z+ÛTRAì{}$´¡ïÀøáÇÐ¡Ëÿç;Yâ¸ad© ýÜSHÞàSPÙHÞm=}'!X×|¡?Â~¡7ýÌSá¡Õ¬	¹ÜÒ©à5¼".çeÊ6É0%kÀô:Nv"8f6ñvÂÐ_%Yµã½ÈJ´rÈCdÏL<v²Ðahòs{H¿¥á@üuRP|ÈèÊRVqÚàJnô¥ôÀô¸"­ïôUcû1æµöcõ®÷á±O¢ ô8Ómixå;iYOÂlehó³QI &ö2×= ¹bpdåñ.U³«Êï}X8à#Sz Ûh
ø¹= ÿNÎÅXYÈíÌýÎÓw+ù¶ß^¼Ò¦ÄspýE×,ÜÃ½_CNZ¼ä{¿ù= Ë__x=}ÇCr¥Õ¡¬",P¶+O41×+oØ  Õ©½ÜQß^a±çoÿceõýX'ó¸éHÌZ¶] M»@ßGéYãúh½ta¸Ó¡óHtDgùÆL¬ü¯wÁs£e-ëÚr3_F'(V3Á¸er³"ÕéÒË¡t*ÈæDèÓÂ¤ø8Yc¯ïçrd}°u^éiy­@\½I²À±YLDh­ßR5*Ê-¶Wv½ykE<Yg
Öã5þ{(:%Æ-çàÚ»ôXÕþ§«.l!%Q#1Ê½ð´¬ª±%xéìÝ"ô4aÈdr×h!
?¿+/Ø®%SÚè¸Ìc~Ë}!z&>ùaÝfèV0]ØLÝºlöÈJv¹VOum¤þËmhEê+¡­:ZÃu Sü(ê%Â(FcIñ/eïC,:¶x6¥=MXvAXä]ltÙ=}äÔ.OÎê­ZÖàý×ãg:íVÂhÔp­øQþ_UNw ¤ØVÏq5<>ÙÙVËGÒUnç8ÂßYXPü­OøÃ¾É	gtóà]Hhn	ùü>eÁÙx+µ)98KÜ Ê!äOØúí)Ùle5w"cÌÆeáö»½É²¶ ¾|,= WÚT\Z}Ó5ÔO¾YTÌ:Ûln\#¬"ÉË±?öe>{$Óù«OÁårØFG62(!/iqT1×/*'íåMÂ£O~3©¸æbvéÒ¬µ¿*±Z9Éa=Mx+mk¶ÍOµSePÏEýÿXºÄËìð+2Wù± S	}v·ç½ÇÿÕæÝÃx=}JÝAêö?!a¥JÕêb5?Ò8ÿ£µOÈöc¬§Z>J×ZfÎ -b:xÖ®"L®ÝÊfèõff±º¨G1®çuHÚ=}&©2Rç0òóõ5Â6=}&¿¯
Õ·=M^E¡ÈBÌrÄ1ò+3ÎÌ\'nÝ¼U©P^ÔkS2aÉLü&~ÚÇôóÙÒA;·ô®"¨à
2Ê³P®ñä­;eÊáóç*U¥lWÕøÙ­H­²é¶Q¨{¤Gõ
/jL8ÆZKáÂå=M¿¶ÝKY¸2ê¬¡[ÐðK«þé6¢"´¬	Îþ¾;*2å'ô:ç½¿P6ÿ!¥ìF=Mä°^.ËGßSPrJ¸»Ò¦§yg.îç5b1ôZnx°JiÆóîáÏ³Ú÷ÞEÅN×É°!#¾¼¢gmrÒ6ÁV[Ê²ü¿¿Ï¼dtY´ôóµùiÏcxÛþ-Ö(ÒÂá¹¦¯*¹º»
>Ô³SÈ^÷Å0õt¼¹ycÂåS&Yà K¨ÞA%qÕëÆ#VLU}#h¿Î\5ÛÉpKr ÿíw;|IõíÄþp= Ìã?²¦îY>³l&%¼_áÆì{ÆbAÌ¹2ùc»MÆûýfIàF§AXòçÞ÷DÑzè¢îbÐØfÖÔ_AJ©!Ýk§s@Â5@°5Â{@§¤GRÞz>%¡%Bq§uD×'o1]gK²cÈ·´í)}''Â= êk8?#rîÓÅvcsõ4©Çh!Ó¼#º6ëkàP
-TÙ&rTä±îÏØÿwBÖC	²ÿ©¢>!(OÎ¹$2UY"uVaAö5±>Dâ)-IPÒv
dnÒVa_ý.HKÝ«³Ìµâøc.£GÛç5v¶^ÊÕÇ¥ÔYîíuîÆL¢|É¯ò«~ ýóJ½k69l÷ãLµ{¬"D Mñ^yZf3Ñ¾ö:,vú8JÄS*ÇþÔ½3,%!m¡8ÊU>A×ì$ìe:bò% «^T
RñÜUÕÕXïå@óÍãI= Æa¿Å¬ËuåKrO[=Mä6eæNÇóÐ8èöíÇçi¡3Ñ²c&Òåyy¥ÈÞxv\­ãÊbplq¹|Y,C?í"ØÕ?¡)Õâ&â"#T{í
ªÒ÷ãiÅ4@i_þ$}5+¡¥r¿ØU×Lóvíh)Ú7ÕûÖOÖÀÄ¥°Õ5S uÞûA Æ%S ÿ©1BªÌëç¸á¾ar_¦Ä{pfåÈ!bÒç¥Ê;ì&O  qÀV/ø¤PÖ§¬Á®ÞúÀ èËn>bÊîGCH)~õ}WÜ÷h¤K|-ÏÌlWêÈ§vâ­)¿é8X>àÜÒLä¸L,ø.yº©kõâ©¬þc$¥cÑFLeÅ¸ÇG]ÎÅåSm&ìiVòN¸*ô?nðIq?mQÈW'ÏDó\Àïâ¦ÞÒxðLÇ#rk°Ðº}úV¼S?Å .|ÏKÇÈ	ÑYÁYù"µcû¡µ+M©,{¦¸Mô1¯sYEU7[o9¹YÐÈ;<"%?X'ËéîÝí"­Z?s®ã6ßç{Ñ½a'0j¬£tðiéDk!¾lî¾"ëÜÑWvY	g9Y7FYl/¹Óÿ¥È´¦§Ø3DðçØQXÄYïïÑÂnËzùá>UÊ¿þ§#?"öíìÞíç4n>ýìë=MïÛ§ói-Z{}Ã2ås ¦:x°/BÂòá^¸;Qê ÆêÕ7'>ÐÎò»©8/Á2:há³6ô ¬*;GYJ¼îXü º.|¨àX«Sp|ôRä[gûçÄéè6.ot1¬B÷««Ù=MóÚÀQiú sùcH{Ylà¦mãÞ]ì§|âõïÊþã7s¥ç540<ó)rP·,°-ÿN3¥
ðF6æÈ-ÿ¸^¹ûÒØv T%§3²Ú-È­ByËcß/Ï;d)%½« 5JÍQ:ú¦õZiÆÀê¹.mÞãpQbì¡¸DÏã2pÌ\Qÿ¶zø0y9b¤f#òlpÅË^y·	U³dRÞ_,lë&	¯/3e#÷Ø»X!=}ÅWÚ¢2U'?Hñ®÷µJºqSÐ³ö$ãl^ËZ3Jô¶ø×s¶öÿ,Í¶ÿLÍ¶ÿÍ?ÿV®\õÇoÌ-aÃ^ìÕK+¡w¬SVã0°MÞ²n ÂÉ?=Mç7ôèÒî¾Bb9 Ãô¼?ô|?Ê?¢¼Lmôêÿ¨róÀ1í?²\Luô5õÀìóp1?¶Å{Ìò¦¹Ñ¤U}WÀAÐÁ/¦'?j?õ"1¼k°b.Ì¾ØN ³Vr6äGCKÛökG-®$cîÊQ¶6Çq¤'³Pàô´;IRÕ´º65Ì6uÇ@ILo4jæ-(?÷*í¨¼.: ~ ô,&ú$ìòD/°ÓØÿ6¤]rDó oÄ÷CI.P½àGWµÌè?wH?Ëöñ6&ÀpÌô=}5#4
n(Øúx'Ht5=}Øª=M2õKD_Q
µÅâÆFÖ×*@]Æå	éNT{ Ì	böûíbÖ= ,ú~CYÔ®r³½!UTjËÍPG= È§gÇ5ÎgîJmh4õóEpQ°A= ü« Ô£~wwl³Ðá!kÈ$wfÒ»Û·o<0?ë¾3]N®BLcHçÁTÎ|%I¯çyàdD'TãôÚclpü&~0¼}Naº·çñOô<
¶{dYðbÐ>'S£¸ ( ¸^äØ= KÎ¶ÉÐ8§¤±©ýÄgèîýWáàa§¤*U)6¹G¦"N_Åh·CÍX¤ç¡ùÝ³1AÜB«älsÅ»d]¼.íÒ«ÏÔ
GÀD¯ªÅ³xÌü	  I5 «hÐ¹F¢äÚ^Û(lìÍ ³óÌÔ_ÏéºÆ»I+´­½ª»ñïcZ±}5ðVD]Mï$ ÀôÀcÇë;ü	ý·FÜÑÐ/ÜÿÏ= 0ØÈ-"Õ*¿.È3úÌ¸÷Ê/µ/xTÉq@¾¼«GLÒ=MoT-ôë*Üð6>Ê­¬?½Àÿâôa'¿×}.à/8ì¢m®dÙý<fÍ±;@= ÞSnîcà|n77fpÈÈqsÔ_XTDa= }ÃÕ²CaÑ2OpOäó¯ïÖKîíÜ¤+ .Ðp}n÷Ød·I=Mwìlo7J¢Ó"{¢ü¢SýB®¦+l¦+¢t¦+ ¢Âë7)}VñBÎ\¦NÿS­¬Ö+­xy.T¤;(âÁëoBë&|¼Ì'=}Å÷î°®þ" ÷L_¡(]ç(m7¨<Ô+©ráöÜr»ãÏÌ Íp²6FïÅÁ¯¸²%AµÒÙö^Ak
ÇG
Çg6ã7±ýæÇâ¨*Ääø;Á'ÜMUÿ@ã"R²Æ õ°Q¬vø÷&[ðB?ÕÓ
ñ*&>²%¦ø÷°pÌ6µùÌpÌ8 ó÷*MeÌéõöÀ ø*u&Ô¸ç&*ÿëL«*çSÉ_Ï0~ÄÀ ,­ë¬óÏ"3XÀF=}ç8CCGC÷÷óehÙ[yëyyªm¶ìmaµ£DYëË5ÐÄÔß^]Ju¢I7C/KF£9Á*Ð7P·ÕÔW§+ÊPP7TLÐ.TX{Ôa;r9ô'£xrròròrjÒN»¦RFðTZCõ¶gõ
.Õù9p~{;.Ø"ñÖÖa¬µ)TÁNj:Ë×±î3.4àpó~)ç!«;JÌn¤FKÙsÿP/ýõ2^Pf¥±¼·Yá&(F½±zõEÆ4¤<TºãzôM=}ÞÒD5Lª£0/|~H×§6
ÜßÚ'´°4Í ù×´6ùü#àÝ¶
y3Ò(·@Õ@Ý~=}9xÆÏJÙeÈ6¬@-U¿ñôè_´dõVÂçPJöð¢¿á²j%F©yê?+OÇ¤Î
ÁZh&¤¿8T §HP@YI"ÚÇÁD= ¥ÿç-= P7Q¤Òç,/Dl}1GþK+hÓ¼SZ" W1[À³¢ÿ<¸¸vËL­Ù}dÉy 6ì´hÍ&WZ±¯ÒHÂ°ÉøÆÄùÍÖÎ!ôîë-ôì­CÕ&µE®MZ¤ÐÞÕ/GÏQ,!aª;|}= ÉS=M®zMýª)zÊ}[ªûcÇÍãa-¡3³PãL¤lÒä¤<ÀXÍÅFúÇ/O}»w=}MíEü£/òöçGÓf¾T¤RÌUca&²XYo#%¬y_BÑu;=M
;ì³ù¿_3îÄ9·sárYsó4Å!ÛÂÈ,ÿp~Ïx¦K°7e¹Pá:ÑÖë3U(Õe@¹(®'ÖyG°Uvì5ç¢)joíà«Î¼þ8öI%ÜnÆz:ëï¨ôðÝüY?Ë§5R0RÁGa&[úErýÉz9sêäÓ)ý 9»ø6SbÜ,ÿ(¶½Ý¼9{=Mnêè9SÂeØÀæmìp-åífÓÿéïú<>4íþZMÚtô¶r¸Ü¡y3Ù^_^Ý{Ô6Nb}ÛwhIÖS\§èkÉwmo?CÇ¬Ð»ÎPÖ´i¯¾3­2ÇMÐi]\ÿºÅ¨ú4Þ¯,Ûö~ÎfÑÕí×ÿÓu>ÀÌfæXºgIc+µ.$ì®½ -Îý\ò³¶ÍGÃÁ¶@¯âmºµf¨ëp÷1ÝkuÓ"éÈ®ÿøa¨°D aÅèÄè®xNb¬4'Å2=}= "þuJóâs¯[2µ.*hÑcÝ° ­ZgNW6Ý8È§#7Q!Ñ²+0óñ{3?ÃTzdN¾è&ûaMÑ©ÏDÐº°j£-'iÔ^ºUÅ³Gª®>YåÝG¨%êG¥ ëlÂÅÙVÑïâ6£$ã+Å/tÎ= ôÓ­sªîV×ÒSKe«ÝIó³t¨w½>~u*ó,#¼§C½7Îú·Ý#è$/À¾Dä5Q\;k@nµ!Õñ¢OÆn<N½dõYÃSó3Íh´ªÁ«ºbvLNxP<2½«g+^2ØXB[*wiñHIÎ½	¸ =Mì¿y³¢Ù!)O§Âµ&Ý¤ þ¹hÍ¥òeÝöt].TTQäºs7x8ä÷/îaã¬k²² ¤¥¹mç3¡Ez×øÊs0¦õf2úý|ªÅÙ}Ñ³ZþËÄ\sgQN"ÔkÈ;÷3Þ"íäûs*ò¢,'Â³Õ»c>bsêó2íPágLÄ
*d;;NEÈ?ñ.-ÿþE³"ÒVaX6§ÜDáv½º(ð$­\oÜYQ\yYÙ*}ÅwPäúâ±1exâ\¶§Úº·ÍøñÇ5ÝwÙAá8Á÷éÞt>2¨Òa5ºA!iAÃp!	~UzÊ{åuî*Ô´Ànlú&ãó9Õq#J¯Õ]&-$FüQçßÖav»þ#nðZÍ[ó°bëvpr<fVçç°¹¯·O¯Á(®/8·=MDi©yìuòm½HÏMOFxX¨·P8W;7ô×TG¶­økÊëXíHÎ= Íòø= ¶k"u¡«Ò
«Ð{ÖÒàõìÈa_ÐHÀß$F¶*Ë VÂúxOùåGpÞ¡åf£J¢$Sz0,+}FO{*µh(2ìOK¡öóç·!£Eú}>«¡Ü%ü±Ãöâ´ko³Ák&ù(N{ýÉðµç£QµÀAÈÇ.*¹Q§úô´Æ«ÅÝ/¿jÆ5n8íÿòÝße¿nöI4ï%nkäé¼9zÃÂ;¿ýÓ«h¶¢´÷Ó	®r­òEL·óYà5bTfök7Ä2Û
y5VC¨40nS¸üsË÷y>Q1Y1d]#r³ÈÐ«a§ª¦²ÀµÁËÞ±0"V@F¶GFo&ÓE4?uçôV<*ª&µA»«rå'>%ÑA×ùP{.èé4EËþÿ,rJäzJ+êt=}aìK)@Ã
ª_,Fý¼·ãKty¨µ£ÛÄ=}þD¨óA>Æ,¶c¾±2gõóÊ¹[ìº¡öS-÷E	>)\4çÒÒ[¿9rs°á2«ØûÈ¥	Iä<ÚüÂ¿ÀiÞGC¤y¶L2pýÄ4º=}Á©ë)ÑLÂCëM¥#Ð¯^Þ¾»¤c¹xõ,7¸%ÕJÙÕ ¨s¶úþ=}/{« Ê0=}á|ûÔÑÓçF/uëÔ[¶*­h}¬^Æõ=MZ¹®ó87«Ø{¨ºhdàM>Ø¼¤W½wT ·±ñÁ°ÛVì½¬¢!9
¨ß^=}×­J¢¢sfðEü¸Y
&Eêòr©çU²ôRõâ<';s'CÏ VÉxMçòÏÁ%?MBµ	ùÛÈPUò| ìôF§Ý¿ i?àÖdêmçíHÓ²Ñ~.Í5? 1
½1WCB!=MoJ&)Î°Â%EÇ#e.iz ¿D¤eTä:½%»ÑË4ùÐ÷õ­öòì&²Û3is¿ë®×¦J½!íàùOaÎíÈÅ¢]eâîtÌY= DÝ£ )Áv/.{7®ymÎ?.m#¯ì¹Ù²I¶I¹'û¢JìÂ+oj*féÑ$É»ÂYìõªú¦"Ý±ë2¬Ïûíçt%I[_ËÄ?¯´Ñ´×_ h£±yë%ægÕ$ ª@vBí%pb£,$­_½X ÍU®)6ãvXo îdÿßg9YVÑÄâs«ùÕ¾LCPÛW´I«ã:tþñGÑÒ ¶ÃìpQêÈ'º§q~´¢&=  ÆªU*@7ÕÑÒ£S°à|¬Î­ýx||{.óÌ·ëmàÉ¶ÞùHvçi¶ã39d=}!&2Öýc.zu°F¾¯2Öâ·îÙ*BèbëVùKÂ<VPi=MÃ~=}¬:Ïe/7OÉ#e»	×®Jþ! M5NDyþc.Z5D â7ùebØ³ëG.Ûr±Ú&¸N.+N"}q^·Ëg'JX±#ézÖO÷¦û¦ÔüÍï8¹sD7±÷mØ+¸xO§À øÄ¯Ø8A
Gt¦,=MbKÝÃbË)¡0 ´bíö ñ­-änÐ-[Õj©þ¢büC÷¿½ô¢ÕTå@­¶çy*øU2G|= 9÷6¯4i·¨¡lýµÎZÍ¹-ÀµèsÃZü#ñFñ8kpEð
8<Æó-d µÍ(Üh$Ð×·íüCõLJ¥¦%ò¿¯»l´É4Såý"å!O@:5LN|:ÕÑ=}Fü4¿aK~ÇYßfØÃ«ðß·Kôfgu®@ÃóQï²ó¦ú|jµáãÑÉ¬·Ïåfü¦0üßÄÝ*·Mê6ìnõw¯É?t¦&Ò³ëê2¨Þ[7!Stà¶ÏåºÜ )_W	ôí3×_¥¨ô¦­ÛòIY<Ò7ø~t 2YõW©ü?¯:mÉGÇL(Õ±èRóDLæMAY©},ýÕDÌì½'?÷8NÐ-8÷N¾ZÐfi¡¥ïÕsÀ>X^Bx¦¨5PD2Ìjº{âÜ>ã­
öHH=MG1xfèßÌ4'»%äð¸ñÑR²Rð58üø:ª
!IAÖøV2øÖ^ªUOµr>­ú@/Zâé¼NüÝYÂrGGz?ÉÖg§×À9N]Z= $É,ÙèÌçÝ¾N¯õNõÓ§¯\ÀúÓ52iÅßê ÝêßÅàÞ 4ÞçIçI!ÏÑõ8gè¶:x¹³~õwfèûL.|:
CÕ½ÖôW³áÓw¶ß8Ìº«àm±Èmf»W:Th2?;2l°º*¯µtÛJà«#~þW.·ìTËØ C±: lnWýðânOVà>t¿È@àhz­T8Ö¤¦ö¯ø?*Ó*0=}Û½
æ"Ey×7êò2e¬ª¦]ïk,Pj$ìJ°$Tzþh×nM4V/£k!0ð·Ç¹ä±f<H£ªaÇ}Û¦qmö<BLR©!¾KÕW´Ç>GFjö0Ýsw*¨eHü V¼Ö lP©".­Üv1ßn5üÜt^¿~¥@.w|mÚéÓ­iQ*Öêå¹(Æáê»¼x;>&C$=M²ÆÝÎ&µÏìò	ãTÖH2ßz}Ý°³ÖÜ¿<Ñ¯N:mt^îñ¡lGTupwKdhø{ôT¸ðR³Á/D
÷ÙWâ¥÷Ù2íWÃüE-%ÜÝN#çßPc7ÛÊ¶,'Ó±°÷¿3ª¸× õüÊTüVH8³õß1_I=M÷[ ã3ËßÎîWðaLÛï5ÿ_+øS%¨d8zO¿$rjÊúr :zÂ¤¤qç£ïñò=M¥èl?C»K»ß=}pD¶wK½É
Ez´y¿¼¬©Ë×ø¢2guCÑ,%LGÅ÷b+âÈÎqa$³
Æ,äéO
xðNL
J][¬ñ÷y!§9RvaaÀäÅ2p¹©bæ¸´¿*[D!xbÔóþXµ1sHÄ(*ÚC1 Õ¼s×õ°Q|
¸<Zn ~êº³°·©x"GJTjá£¬­[(l'XÖNRFCµå_ýÁÙ|ì<¯öë÷ÀGC§ygêZaÔÛÿ?áìÿJ®°î=MöFÜTÓ¥ÕÑ½wC§]õ =})ì{CglKGuf÷º}D°È´@)±ÊõÁÖO°$0H&¦= |Á²sï$FRÕæJíÇmó:úÄ6Ì°Äð¬àj­rJ©	Ú Ze= õ&CCtØ5Ïq§9zeß\ÊÑaÜ:¿}º°qú&í*ùfÞS5Ìí2¾YÒIÀ\ðAõ@DL(ªõáÍ£x<ºÿÝè ¶Ý óÝP
ñ)Ì½¦çµs0Ò.åÉq=MôsuvxÄ
V¤!ÅÙÖ ZóvAª¦Î×~DÅÙ,~È[7Ò|~qgàìÄª«;|KJk8¹SyÃ'¬¼â^CØâ+¡ßiÄ»1Ä*ïNj¢?XÖf]÷y¿GÊ÷í±:DiäqZLVÚ¥Þ68²!¿äþrÙ³9·ÓÔ= îÞå¼$Tøü]yUÈÒ¤JMûV%ì*à]j½ßMâ¨S-p3b0<'¡ºø\vÈE0óv¤ÂÍCÆ¸G¬§ÞÎÆú.¼ZÈÞi§Z¹âçð?*IOiEbl&:ÍÖ^@Í²T¬µñY>ñGHi^EÌ:á|jà°&ï±!N:!íw®!üÚåÀY ûr°Ù!Ê#÷{«Ï(0Hý°¶b«ïÍòØ t»«NÁ#H%¸NmyeP&'^3ÝËFÔx+}¡,ÚÜD2
%(­>wÔ þíß¡)×ì%Tn7«R§O)ÐÇÄ§7ä®B¥IºKè8ÌT45.L°ÏjI¹à6ÆVHf÷®Ð¬ÀÁÈ·N¢Qi>ì)c§[Û¾¾ð¹EzÎ@h~2,PÕN73'¾<hUÕÊÇtØØpCð×qöÊ/¥¡/A Wqwh$ûå*I*ÊÆ!bã;¯Rì§8çØUÀkgM9txTö°/¥§¯=M[á¤%PT6K.b QCµ¯×Ï}/jÔöB¾¸ÜjÉ{ÝEö}½u3$ô_ÁúâãåØn*&ëGÜ}VH¢ÊEWÜ|·ºÅ@Èµ¥jAðÛãô«°0ú[Í^q5Äç¢ ~ö_Ïk\>-¥Ù6XÚk½é±æÚûYÖec8øÆÆfI¿;µp¹ÊÏ©ä<p×ÚÍO	Âº8®~Wy©ûÍå+ô®«Á¥F¶×=MNã&Xle=M ÛS5ÀKXVÜUÈAÓÞÊA´E×µîì¤ÌÅå¾ø0ÝuòK= N×wG;zà¢AÑ
føHVÃbzÙfâ.Ã8d6SQ¿«Èù²¿ö½üú?Söô%¦jïÍ~Et´a=}¹ðºÁúEßÐ.Ä²ü1ËÀ0ÅL­Îôöt¼ì}æ]4Q4j5{2£* Z5à AßüÕà©¶Fx×wô£Ø¾E¯	+ú­,LÂý(sYø= ±åÓ¸Õ*F<Ï2·gÑ6ÄF´= 0e3 c<ÅíiJ®ßlÃ'e áðË×aczcsÙ'è*t0Ð= ¿ÙÇÛJôºR«1¾À¡~ Ãà/ªò|Ì9g­:Ùÿt3ª²¤C²K+s¿ÇÿsfµICÞþ·6¯éþj.aC}ëdlUövz
àÁ·x¾ÿæ¢ S=M¬>)ô(¬ðZÆ%¥=M]zù§jÅx/éð±L¥UÃAÉ=}_µ8Þª³èçEMüó·,ìÌÜºýÃg43¬¶±×jÔP$ÇxÐ¤{s±6)C«©&µÄ×
4l4!>º®M¹)a|9?)öxÎv¢!A<	íh³¸.ðVç­ë,Ó5ðÿUÜN9gvUËKÉöAüÍþýQíCT¡T/ùÐ"ÞÊ!úæ24@;é^CWÕ[ÞbâÔ±OÁwH²Kï	}#ÄÎ,-§Ð=M:_ÚÖ¡æ-·Ùí«¿Ø-ÅÁ¯Ñ³[³½[àl<m¬fõS2±	}=}ÿ!wñ]WþL@ Á°Qá_3\tòem>æq½mªÝí«Ó ñÅÊt¸h6¹¾¤ËÓ=M¢#§|Y)âSÇ8½ØPô5ÏÇ¬|ª?Ó&Ú0ÙâÔÌ§®¼YÞ3áË)²ójÐI¢oÛÈj'K[Åe6§¢Ø<ÜKçß=MÒzüJËåá{uy£B¼½>)¯Zl?Uå´Ûµ®¡8ÝznÇ/ ÙlÒ^A{,,iGFÂÍsÎ%¢åÃú|l,ò|½aÒÎ1¨cÖ6AÆ/ &ãßÒ³¾¹.4¬Lÿ¬àôÚäÜùþ¹_yÿsyesG_V¯ñü> Þ¾h=}>Üð{kâRZzË®RN
ÀàÒV®Þ³T:
­i>àt=MXÊ¾°vç/[ÀÎÌë²ÔÞÕç1Ý.«fÖzÀb$Ô³èhâ¼<::gq°°vN:~\,à/½-òÒÀKYbë[×	ËAÒ·hyG¿´saìÝ½µñm=}0}Ü9ä &.«ÙÄÐ»}\@Z$³o,²±Þ½%Ñ§QM>ÑòÐ*Oê´ØYO~¿jÐðugÈëSÓ|Ô_æ´:pDµbnlY ¢ª¯¿9*ð"J,òÄ"Ye±rdDáñ%ëyBVð¾Ä¯J?ó·>xÊÌ4¿¾7$3»Yfoi½k¤²3©Lò(ìn¡§¨çsýkYhF[Þ®C°;k±¤ÊßÎýPÍÇ^{èq·ÆÉ°»ïËGav»þÊ°Àjn¤EbÃàQe}7ñ¯ÕÝYÞÔ¥âNyÄénïHHy¿®ãKOº= *úâ{Lt®µw=}ùaoØÂÎ£·	þk!z[>çjßÓ¡N÷	GöÿÄ§ª·MÌ%1Ï_Í9åpF§NÞ=Muì7ÂªÄ!Ð= Ù×Â{H«­Ïól®_=M'¹í4àÀN·$¯¥ÑGaD
'ô.fJCÑâã_!±--<««ÿ¯¸þö!Á/ÇæÂâ"ZJú²ðüo½îÔfoSËÐe5Ñ¥~ß§ðèrevî;3C«Iº´ÞÁeÜèdCZ0*²&E?ÞË?:©Os#ì¶»5Ø»ÓAÚ9Nq¢Û´]|ýdT¯þói5wçÏZí¾¸;ÎBÜêÓ¨SÇ¾þÔMoÃ]G½Æ¸ïµÞúÙÔá)¡\ÝÚuDÉÙËÇZ&áë\qÝFz@ãÍÏr|¨ÎGùt­ó¥_£Ä>ý"=}2ÿ"Û/òÚÚ8'uaÞcluÛ¦L#¶§erÜÜâß	V¯ðª¢ 7;ûU;2ÄÐºé§·p×ïAFGÊ¼¿ø9É!¤o°*.[½ýr£ 65H§9²Ö@ ÝJIL+H/%?	2d84Ò2e®ä%¤AxfùÒbåv{ÐÃhÐ½2	â+3¬üEM¶vráøÿÞ×ÅÅ¯Àb"É0ìe­¶B3
lkëFãÎÒ|$ %_¼F	ïroN Næ}àÞ+ã¼i¬d{·hn/*ê:#Íð¢P<|G¹í~JuÏùç¼Ë«æg;ÿ$·ÚõÕb÷5ÐðDå}0.ViùÖNÓa
V¦'rw9
+¨ûÚlrtj×(±_"éÅ­N³wåê,6 í=MòÌKÁ(úëô§ùóìÕÝóÆ>Ê¤õ}S¢ªáE/Îº*)?³ÔÑ@Ojntgü0(²/ 2· ªJGÿCo§àÉ¥tßCÚ)Î1ÛÄ½^HÖ1f/QÇ«JêäÕyE¾åÄ/bS,|ø"ý,À/Öëø®íÈ¥dÚ«ÁÀÐrïQtÞ÷«= à¨0Vêv0à=}eX+(	c"Ý¼/+o°ÔúÄL¦Kõö±®:²A²¥0É2¼^TE»<c5ÙFJé&J?©ÙFìÜ;Ò= ÄÈV?	8= hÈÄFu½¿MMâPõÑ´ôÖâ³I®	¼Wj"oJä×cNÏ§!·)7âËqáuîÂÐ7£ñBöNÔ"W]ÌccW@rü5q@·Âqô5:' â7µ¢cpEíÆÓu2o	ppÓq><oQ äÝ?o4*:°WÙAS.9¥ÏØY|.r¦wÇghJ
Ôz= IÐð1©¬ÜÉr(*?Ù×. BôN"ÉK¨N[ø'" üv+±Â <yweú­V·¦giÿÌ&4¨½º/èÜ4«/ù±8ph[èleX®ÇTp2î¦r@}64Ã}(ÌÛ?h3?ªÒàÄÕè;´cõC;¡þÞ¶Ãøs-lØn{*Ó?VÂüS,
â-nü¹T2dôúiÖM ß¨Ð
ÎýifØ#r®}E<,P§WÂÈùÞN
­úæ#3fýÌ×þµ=}¢_»åßË»tÊLÔáé¬9$Ùøà
^2ü-êýJ½ýi-@_ÐÙæ0<ÕÒ(¢¾s= ÑzmªÔC@@£#m&z|
à¬C9+¸bK_!	÷Q=M ÖàÕÂgDÊò¼¼« oQÉýÛzÅÞg9nõ5etèF$72vãA+8VÂðUG«;@^e¸¢Îd®(£°NïÖ#Ð¡nP¾ùdã{Ï]¬cúæ4r4Ìì d­Ðiöqw96	~¤Ø×ßXqëlT¼Û)­ÎôX#ohB¿åØÌ[a½ù,Ö}A@ªÖlï¸(¸xH¬w5ØT4ñ¥®üüøVgm'ýHÿ;,7/ 7PWCÕÍ.@¼Ï¶Ý£Y¦ù÷ÜÀ*¢l7;0Ä-n7Ë^¨°N@HqãIçÃå¬>=}NÓJ(¶öÎÙvhGWÿ«6NÒw¹wÁñ·ÎÝ§b¶of»øhB©aûB)wÜ(h§òÓ@­|ÀÑ,'²	|©'7u:Ylð'PþÌ+E53í£þO©ZD#{D£î°OÌ>&²­h(¦:&À¾,úÉ³Ól,¬<Mö ½ÀÎz>D4zõÎU3Ð¡-4%~Îq4¾=MLÍ=M«Ûæ¥¢>0âL'G&})rÐèâ%ÊDÍ}@9BÃ>T'&ÿzzpPçÊâ¦:«hcjm¤Lä.'i¦çéïëãØ+/Ýx67K¿$vD[T%ÑMé¬Â·ÄèÊÓKôÅ=}Qð^% r£'= »°1´7j4\ºSEudTaáæÕÂQ½xU4Þ1··µ9ïÕPàu@GÆ¡ÝÉàJVõ¦çó¯ÀÁj§a_ÄCAX.BÂ(>F0Ôÿ«xËÖ'Zöãbò¹¬zZD¸ÆÏO5Î<<ïÔ7v}us&àU[¬f$·íÇ½	<Ò;­aÌNbbù:§sHLpüY[³¸J-õÿöí¢Úä£~f1ÉEß­$É RrJEn[Gi.^VÂö£©¸)Ô?¬- Æ= Mð»³sº>ÁÓßøT"Q¿×w«Ý£¶zýl>n
ê.fPàië¦(Qá@ÓF¸
Ì¸Bé[= "ÌcÑ=}½¦¼ònt·Ô£²jH^u:×ó\YiÿwÊ¨*)Ãzê+píU&Û<ãÊèùsûæ¸¡¿iÐ{EäY¥¶Cyé"çh>Eÿf¶è××öËógcNA¯¡(uäõcÈi÷ilXÛ4.bxùGL°)\ëZ^ú _^§»j¸PK(¹BÆ J=M~fä=M?lÌ±KÓÕ}ý¯âÀW0äkZm¡bqÁó£öaqm%/Ìë¬¢øîB¶ ½ñºÆ×}zµËh8 ù= ,éyq!åk=}Äð}ÂKÍÏòp=}@bæDåÚÓâ^4c0ü¨¦$#~2Î2äPw7ÆøF(àÞq9söL¯zäÝRã®¥­ßóøp9L¤ÿ¶¢9C1}ÙIíèíPIù<ÀXÛ= ÎîHûQ^E¦¸-(¹»ìÆÃ;Ü¯P
¤µn}¾øÂ9I1¤eBüßþÂSÊ­D¼UXÕAý¥SV*ómdâA+.«#ÅZß%þüY¾/ÑynäXíOÀ¨TZ)ã©fµSrwë¨+°ÈÝçê²Ê¶Ëta[ ²ð Ô½,È'2ÿf¦ÓUR< ÛcÑã[ÍaqïM´×ÿ6>ÉëDWIÌßH¥«¨KÎ©XäL ¸N"¦¢½UúÝâô^
Çë;<C3A"î¿à®(£5HBVHÖîÁxluæÈ&¯MbðÄ0Û$úêr= aWWUMK6°ûÏ$ÖuBÄ4¹'#}÷\ÙòØaÄH¬ÔÄîM³Û?4NGPV"î@¾¨4Ó7gãÓ	M!èÑ8\çËkÖ¸TUûíÆUSç<«v
((CÖTöc×XLFð$à3O^Ä¦×ôUÕR¥O@ä;SNBÆdVKÓF$QÓ,4zGxgëÁ³Ò/h ³.müZ@ºo·C^,ªÅÊow´º7}ù·®iC ÿa0bcm&A¢wïó¸aÞ_(Û¸Íð|1ÇzuÜ²'.FÔ¥X4íÈ¶©gÑ­ì×ðÃ:Î¶Ý = ø}Â¼(IÖ=MY4;bæ¨Í©F}(ªæ±OõÊMéù=MÀ®/oK= ânt³l¦ÃW5}ßaKÎÈ½ó]Ðî!è7ÆjÑ=}Ú¯¯ùÓ²ý7,!|ªË3-'¹Ýã¬n°@°º,Ó­ÇF£¼ì<ZÏé}f5	þÀv­æôïôM21ËýYÔ*mÏÞ?ómµñ´aH÷3A©ÚÂÒý[ø6Þà_i÷uÈpSÌsð·>y¾¤·£ùÝÀ= = BÁñ$=}í²©z1íõõÀEpù= Ç3=}ØlûË..¦(XCµ5û¾í/Åx!¦¾ËÚ	ájZæJ04Ý²bÉùçnÂL/£õ?6l#Ñéýoÿ¨¯ºÃäÊMfò}búâkíÎÂ©7rËäî1¸	=M¼Nï²¥¢÷Ô(5 ¤Yï:»Ó®dÙ4Iw)+O$VPgóXí©Í.íLEP,= Oßn¸Þ½äÍgÓ7/I¨/ºFqPªã÷l.ßvùÁØÿÁSáÆì9Äò¦FiëBER}Ç¥d)oqËÍOFï¬D»àÄ[wç½§ÓæGZ,j3ò§,ýÆd¶ªqÇ¦@ü Û÷&¶±bQ]plÆ[#Ô¢ÛÌûBÜM°&(&T:]ÌZÿd7§fú¿Íï:®nåé=uå¸h¾Î0°Xo'S=}æò£á·Z,&¢!E"v2V!£%
é¢Jx>ut$vÆÒïuªoñµsüt^Þ[5¤F>t7ýI·þ=M~|O(=}@ÊÜ&Ê¤,MÓ[äÈ¤´ò±þM¼k¢%³¾KöÿtW&ø¨µÞkLVq²N>ÆG1CV¾«fõEfËô S$¿~§y´aW1§¯ÁE0I·Æ=M­e¢ühÞ2hVÒýP/ö@iKT7Tµ.ÜÔñ«¥Æ5ý|TºýB+¹c65ËØds5øîT= "	§¼É5xó÷²´ªø=  ðÐëUÃörßäÿmOH^(>Â ^Qõ÷^ÍDt8¡ÙòT.½¨qµRQ=MVáôE¯=MëBôo !ÄÈúÛÃÆ#l= ¤à9¦6{%-1fAûÃ<ÕP»YéÆRVþ0,
ÖÞ0¼HÝ4Q×úp½4ò!-ÏßÍÂ%³Áp´M¢}ävÞ­ÏõÃttþ²¥&·¢.Ð+oöÜ¿Â6¬BìÙêfFx6Ö}Ca:ÂûÁòÃQ*èÕù§M¼1HÜ|Rß¥sóÖ¤Âé*Ö»Um9Å­	Shàq/6±ùà@ùö/Ûª%ÒáÕ+ár=M/ñ&2® øÕEÇÇuVz_X$ØS%»XÄÿ1çs,/ÄÀ^gsA&j©×K{âï¨Z{÷bbÆ&/ïBôYîlPV.&1¢Ë-âE- jòKuQ6jhªæÇHZÃ/Gs´çÆêÃ]Ln½\ûöÆ³?ÎY/}¶ÑÂO»ÿ¸îÆúéû«*Ï\kÈ=MëO*õq>¡¦½Êþ¯f?Ï2©nÈ	ÉUÊÁ#íÜËÞï|RÓ´	ëÌ.ùââpààñ.òU= ºzî| ë|12§»¯ýAqêMH¦8¹=}L&Óqª#ÿ	]¼ìK^Ú	(ðï½ rr<Uµ;¡uyu9Ö$YæÃ¸ZDI²3d	afUiò.ÁÝÂå)é¼Ø¡ §6a¦ì|Siá¦âÆå)}ì%rú¢s|;Á;mOÁ·Ê:³Áb«²Jæ%*ÖJ«q²êýªÄáÅF½äó4#î3Oÿº¤Ö¤7¤j4åÅÚ1Üøçÿâr1¥ÖC³ è¡¿õÑÿ4/úéïnëÝ1Ü ÝÀj:2e:òi÷e_:2$zn¬ ÑtÝ f:ùv:|õzÇ¹q»Ñ4j§ÔÁg½¨QÖ&%Èáiãô»WÇ$ÜdO¡¤éb©qøë¸¶Ø@ãâvTqÌîë¹<^tdð½¥Kb/ødSÆÌ¦ÇÂâ¢M?Ç%'K=M7
~îï{µ{ªJüÆ²´sFÈ3GV1tæ¸=MpWo fáE¬GÕ1äJH'çê4n¢W?-85eNBê5/Ñâ·hg¬TOéÈr.êì¡µ3þÇ¬®Ô3yË8wR#ÖD*»ÿU1:t$4Aa°{2 Xë;øòäÀG Dy½ÿ°Îr#FÓRÒçiõÄ¼S¾å ¸TÔ4a¸bÕK¹q«³jËTûHTè	Ö 2| ¥Bòz§èµâÚ[ÌhÅåÉÂqcKú³ '×W³}ýÁÛÒ( ÷Pµsè/rãÚô¦½9Ê®0»ºãÙ2Ö/^Â!ÀÆàÕ= 'ß':=MüQÒõh'Úy= LÈÜ~zhÍÎÝ­«02-lnô5ª~Æm­RköoôÍ"¹ZWKo8î6ïxþHVz6O<³o(òÏm#ØK²Õ/ÊbZ	ü´¾µAù=M x¦±x4î­¸= += ³¸±,©­³Å7WÉ6ÌÒ<Âðª²Ç%ÏNÜ÷rÕAÙ.÷ÌÌã	EeàÌDq_æÜºÕÎ.Ô3ùéSgè©3	Ã¬GUÀÁ.EÔÌb\Û¥¨'úäm%õ93ü>2Ö¬ºáör¨5àlC3= ÞFfTAèE
²°ºò 6ºè&DV00t íG  £Ì rÝº<Rq måÝÈ3l.ßÀDj'ó#§%±§²÷fCÄøî¬ÓÎà@gà@®= (Æ÷¿IÅ]àMÜg(v¬ÿéàm¶ß¶å+ÿ5©
ü:¤.¬gl8ÛFªIÁ¾!èëC\¾¶¸ªV©ÐaÀÑ¹î§á[L÷|lc³=MÒ8îIõfzú7¨DîÇý7©¼¾:FRÓ½I¤k-(çEÖ7£·°1Y\ÜÂv¶QEÆJÑÌÌÈkÏ W74Yæ°5ö*3ËÖoºÍæ¼m	/ã{Ð=}páêóèÆæãK)ºÒ®Añ¹=M³zPÚdnvd0ÆàZ¸T¶ëÁ¿çàgø¶hàå·îÂ¬Ï¡j¦ç:%)ÿ¬Oz~¾÷9ÜT¢±(£n-îbfi[g ~ñz¬dT-t<&4:¡q"à4:¹1(S$?beÜvA*ÓÇª] BjDñên¡:Máª»B¯Aj$$|
ÊGªlô0Õo¸}¿øÆèDÞPo(×'¬=}ËOuÝ21ëÎc¡x+Ì¤¦(~§$-ºeF3ÅôÍÐBjBßÉTOÞ¨!'Ê1lï¤ûÜìØv=}&y× ü2(¶ÁðóÞ³¯*M;¡q7vùTÎoé$s
¦"ÅqBúØ´ÎÎômþñÜCdxN°pðê*pssÍd>Å£w.C?Í÷Ð»= Lv	= í/ZüÅ>vaÆmb+ÊjöÉº ë!·lÓ-ÈMºB¿MBâ¹}A¶Ñq¯ÔC®v¾Ë/õcxÞ«cÀ¯êIÃ.6= ÜÈöKúMÆxÉ0Zèh¼¯¤"zÅ?µÒhÔH?N¢¤4ÃckÅwáNù 6ÀîÝFºÉ£û=}V÷i{Íþ>£µâ§Á=M÷3/9»!ÇÝ:QÏ" É]3 é.9g4ú»UÔwk= DNuº±= .ªÞ°¤N=}Ï5{×¿½ã¨Mú= avL
É±òz³®6¥faÚS%Ûã(!Â­r[Âh[CêÇIÕ!m;èø©ë}úø¡+pöÖ·tóL }6©Z''@ã	Û¨â¨7÷xÏÛ2$y°UF}B·Ùí¬uAQNÊp= zsqfJ=}âðÖj/Ï|3	Ï¡ð{wPtQá¿ª&R»o¹)ÚPì´³kî§ÕJ7­£æò«éÇ.]Øÿ$(érc]ï!J{ÖE½´®÷rFaìºex BÆÈ32ÊÏØ*§TÑ¾\ÙØÎôÔò0/ÞÌÿcE´®Ø3WXKòBPQk¾·Ô "¹®vÈ·ãsÜç/µéc¾\ªáâuX?%ÿN Hmi¬H}}°¬H¿J¯çýëJ®Â@ðõ= =MD\h¹±2¶&í\¸- h]°Ôx~×¦én¸é} ÔW2d©»@NxÉá"Ý!îPÒ­î¬Öäv MV¤ö*r¿ À{}çÅtÅ¤ÁLnÚ}zé#[âN_=}e5©î5¦¿DÉþÀbD	;-ðòðbù¾P@¢N5 %CØ#~£;È=MûJÆc<÷QÆ:þ9D	;÷ö}ñÉî}Ïùç,ã-ìë+iÉì½û]Qe!µÀ´|n¬mßüùi?>¶Ç¦k;À§ÊKÑðí³nDâqæ0¡å¡!0oñu¬RçgÓeB®¨6er ôÕÕC¿IGy'¯vËÌñçìKêsòk}hiÉÅçàÔdÂ"õæ(xÈÙ6Oú2ÏþÃ/xWÙuåÇðèPþ§¢HïÚÌOó,de}¦*Ñev#÷'á
«¨¦P,<Rýò3pÏÎÏ&·:_ÎJ¾ýØ1êM¨XBBÞz­3iòNxÐ-ø¯¡BKyt	=M¡
y¥ê:=}.c§¯FÜßìúò¤ë6/¶%DÆÕ¡å¾B£ývÏL_#îÓjÒ°JG«H»Æs7K£¶
F~Àïx NðÛvâFÂ­·^ÖÊ¦$_uþ9'ðí¤J0@£r-¾A<E7÷ÁîLþ:æþy¼7+þ¹¤´Ê	ÚózùAo;-Íí³{â50ÿ«ÑE<U»j¼¥¯§päMû6Ón61®ÄL®E2²Gö®'°êz¥ËûnÌ¾³2í¥Y£í£~í£ò­
£ò'[Ýa¦_Ø/QÌP@æØ9WZWwáØoí)ÄçÓªCøú~ ®7Øù 4®eW óOi¤qg\)õõrcëH9	¦ÉËõe7á}VÑÅ?à®!>9m»-rÁ¡FúÝ)«VýàÌþGìô<F·7åË#"ô«;d,«¯E=Míníõ«ÉÓLþ=}¤Ïï+íZþ9M@¤BF~8²£^È	ÙUy= Üé¨koBßìQQã~wòK¦ëf2áÿîþÀ*MöLä $mÚêÄnü·åã{m¼¨âWò ´¡Ë.ä÷,âTà×Qt¥4Óôª§ñÜÚzá[í$RQyÈB1¿´¯uhæ©ÝnìÒÉÜ	NØsO®e?m»õãÓ¿í×Õ!UÂ6/ïÏ 2óN,*=}¢Ô´uÕyëÎ.#C¦Jp±ë²ÏÔ?ä(/M"Â'§%2ò$ô¢OÂ¿S$³ëò=MJhPÿ= (Ý^wmÞÕÖn8þ@»i7þXS#Ð^¢cÂ,ÅGé;\µKa>½Ç¸2FäA½åëÊàÎbÁ÷£8ùÓø¢µTvÙqXÒñÁF¥×WV2@(Ø×»M>í2r8ºúíú Ãèõ4Ew3}bôF¾kÇ­V5¦ff@:R7'PT¡rÀ/Î*7°øâ®ÎpÉÉÇxÜR ºìÑe)KÐ| ¨H;6~j¯ìÒá9êàÌhy.Ø«s·¨ör²ÕÕ9=M2ÁSuã­åÃBªd<-é1DºæbiO	¸M?à¤êñz7¥Î}A(ÆH?P]ÐT¥=}ÑæT¼ÃC¤æ,¿~:jprØ=}7¸ Ñz,d®;Ö¾¥hX2ØÄî ÆÆgaÊ±i"dç¥ðÁUæRQÈ@z7]ºï]îF=  W?ÿrv+2£ikTäZÁ KZ¬ÔNHµ¼"T§jx7tQÐÎà¨¯DªC>@^4¥îøµw°&½÷ËÝ~_WdüÕ"Óf3~È¢.Á¥K² ,W	kàcå=Mm¿¨2w£IUaÓj×bU(Slgä'ÿX}¹XC§êÇ¢EFÈTÐÖ§ö4T,rÂz ³ù¡%¥"ËEÛû&U-!
y«|^úé¸úÕ)=Mñù«úOjJçç@1#8~ÈbâÏéöv
³á¿´ðU¶~r= 6°¦ÀxYÕkÊ+Ü)«.À4]#	qß¥Jñî)ÁöbÍC¡@µ5èK3¬ t·pæÛë¬ZOwHàE¥
n@Þ5g.0z;G'Ý\¿tÓÒëéTÀ. VB©9W½Ï:Wß_C=M¼ûjÀì]%Ç^ÈÁç$Û±ÞÓ1@A¶A¶¦M¹oä·Âû$²ÍØo6È·ï7W÷W!Bù;hWÈÖoOÄ</Ä%ìÂ6µ"=MO³û3fø
 RäÃÞè+Rã
§àÇ@ÁNZ¼=}WãªÃ»;<MhÃdãÁîr2¦â.ÓÌ9	ÓÂr¼CdÔïÖvÜ,$£2lO·½×Áo'ò ¦¢¶.ú³©FêC'è·9EÏ:¯õîÃ§²¢¯òm@É.¯¾ o'v®{ãî2El/Û2ÂÉyèN0kÆ¦}?ÓCöÚ 2DÂ³fvÏ+jã\äfjGyûz÷ÅJÉ¹ëíìFùõ&kC¯ÒJâÀÒ¦$,D6/´,O/þe4âl;÷ªârÌQ7âßõ6Qr$¿G¾ô;Ê3 ¸´¹5*Hé¢CG9'òêb$xy~~ùiL¢zE{º¿18M3a¤LÛPÉÂ/A#Yï¼í¼lkUtó¿,(´
yOéÞ.û½·£e/O#*1e-*ó	0ÈTNËÉn >§= ¿ÂÕ÷Îçî5/¸§ñ=}2VÚ<hº¸îÚQ(£À6¿?¾íä0àJÃÿ¿Oty®èNhé
öi:"§pã~=MuhÆ³h3á ¯è¨A/@fñÃwî(0èÎËÌK¨ËÞ}ètt¢ã¡{èY¥iìnðT8Ôz9»%À£,Ø¡[¯ù(øeCøMÌñÌË=MÆ5wØ=}ág²-BxW£V§â ªFB%ñÉI¿kå¿vý	Ä´"Á&§õ°rðòÌïñLx+÷@öç¨Y­Xùc@MEÃ8pÔ@DõBc¨)ëÏUf3xËß+¼aà]éÌv¯9T6x´ñÔh÷Eú;4´¢øDâ¥#ß~ósxõ7¨i×s·ô?W§2Æèr7ô¯Â4 !éJ W>iaq¡ÄkßÂõ\oøÓj÷	WâÚä»= ?q®À3ÀÆÂ)AraÜT"X¨¨VvU¯!i~'à@" õDØÙØwOh2Ñ1ñvô°E°%rìÎº²øÒè= tÙ'ât
ÿ)?Á"¦²8éKD= ô4Ç« ãgÍX »E"¸$jÛåÇmØÈ°=}p£$zã­è÷D'Èzî1eMÌêï2^¥¡Øñ/\Ø;/èÎÊêm¡YØCº®ßz&É.?Î¢.Ê@¶ofàÂæû= ñÊ/«óCr/éCe¦Eô é>«
qÈéùMJZèê¯vòcmAæå°w¢'ÎÐgÖ&Ç	Âök¹(Í]	£ÐÑVAÐÚê!p°8çç­ßx²¥¶?B7¼BKÄ DÑÀ693BË¨Pm>ìN2¸>ÀN3"_÷EkD0§M½ø((ìî÷ÅäøÉF½÷EÌRÕF½÷ERW3"ÏÔ RÏF½D÷EUõÏÖ÷Ej×§¶2ßT×ÇÏ\÷E&U5ÊF½ì(0§¯0Æ«õ:@×j$?ñ[4&.çe&N1­ôø ¸ÐÖ÷+{ts" xsÈÖ|<ê°FîæäºJ)toÀ·2	XîfäÔ·2	<îfä4·2	Nbà4¡6àXº»:}1Þ= ê
À},««âÿRî¾ÝçEÃÏi ;¯rcåÑ×ËÎÛ%l=}0¥)J]ÜÄ!Ò&]Ö¨	Ó&]\¨	×&]¨	Ê&]¾6~Ñ¢ÛÇE)P ã¿aEtª}ÒØß¨É(l½÷9çÄAÑÛ4òyP] òùHb§µlu¿ÛúWób{3gÝÿ°*Í0ÁÔÆóÇ,FrüÝª<4ÆÂ fj~¯«Þf's¿Ä%3#'µègHäøÄ~·dÈ1 ®p¢Ö=  ^öä¿à-Ê´¦Æì^A­XkÂ¦xXä0àèÕËÍQûB\kXèWÎ+¥(ÕÔãúò×³zâÓÆ$Lø<Kh89mvV·Ü-%éó«
Q8]«V3aÒ]Got9Q=M$ðúl<MbQOm$aMOÑk1ÚC]¤T¨<ò8j'e÷Z.äÎÿrP#gußqc$I^¨5½ÆË\L»´;¶ÅýFsòDSOUæG§½¨ÆNZ1?)2ÔßDÝö%·)ÐOãôpÕê(b8ÍàqPÏ=}&À7µ7W%4ðÐ¹·µt@jG	;=M¡=}·åÚ¶&«VÉÇ;4_dYz~>xp¡! p2Hrò·lÑUGkbþ #âà¯gQï3¼CùvL[j½ã/@þfìKJ°ÛjdfïC²p©7<:dØfÔ zq¾øÚy;Ø+oWÛíjÞ4^ÒIHñE#W¼6ðD3§rô¬å[e3k!¥+âÔ]»©câé³Hü¿F ¼VÈ= úL&(5MP¨6ôÕJ1åÄÇepBÇAH9ÌTñÖÌq¨$®£c*°©¿§få ,òÓG¾¤Áö>'§Ìû®´Òc8Ù*§ Î  ¦HtÃfoc¾RçÇ³µ'÷:2Ëzðï!rRç%ÚM¥mm¸Ñ¹'õðduô02ð"Ø.:i­°	xíØ<Õ¥T3xW*è¢¾(²wÔÂLôDºqÌÈ©D­!IXYJí7QèXÞ÷¤~%¶ZgPÎÄk³DÂ¢Aûô8Üh,ù/E_V6>_á^£=M 0BE3àª-µgºmé´bQQ=M;J¶iFå~ÀÏlýíÐ2¦©b+úghKôyy=MtbS¿­#é¡¤íð-¥#ÑÍ´ha¥rvÁý/û*øàyÞvX¶Ú3LêK[ÜEiOô+CþÀÛÐó>K7=}dQRû CDUÔÂ(+ðµO~®û¨îÊ2£Øà7¥Í¯¾= mßKä­ï°.3W±D=Mï;ÃIÃ?ÎÇm¨W¿g±A!=M£ AÀçñÐé¯°IÀFçíÝ}òª:Ø£d¸IM:ä;íòùGê9ª.ÎÖTÀ¢+ßÓÑó°ÝH§8=}ú@«¿©5tNrê44ø±ÜõskÃÁ&"QÑfÌ=M·³Jª~ÀbÊ²Û$®wáØEüJ©QÞÈJSBANøVxS¯1Ë<×:RkCàþ¦àkìÆÒôÞWObÐiU2ÞpµÆa-õÚ>IÂ® ¦ÿ@- ]»ÐÚp<X·¬æîöÓ$,9=}=MrªPVN(=}Â¢u9ÇÀ¾SfÖ)4Õ©hÈgOzÛS0]õ6÷ÿðgQ#_álPf¯³Tu}¢î½5;ù<ý$kdüc#l§¬Dxê ¹ÙjD= l|æ«5:'

÷ëR+4ç»øG.Ã?WEèÂFKÏÊÉW;MôPoø÷½Çúÿ³ïÁÀAÒ©m¼ å3 z/?MU .ÔêüC;omI-ÿÀ<PW8Q¬LT.>Ä0p|KÔz
ôHÙ'-_øzºÃ¡¨}&ÅV·wçOE·gÔ)æìÒÊ<^Ö.ñÎ6ÚÊÁ1P7'$wIëóZâÑ²ÎæK5ekVþËcX´pI';z1NÔ^\%åGº~%çLÅ¾5»¨0°Ï4<yMKp¹9OofÊüjFë,¦Yª"]ìªªºÐýë&Áª Qªh¨å<4=MoG ¹îX|ÈäRxÍõ@ºÅãûxªûW¦w¿å|<ø´¿J\LWÄLoqÙ1ð6!ò5Øö#ûÑv YâÕTsòöc0ÊVÚôây/kXî¶^¥aæ°¢WÇ¥+á¦ã÷²¾Jò¡88¨sÛÒfÔ[þÈoçÕÑfÙV<¢vNÐð ¼¯>ËFÐÀyñ¢Vß@Ãq±3ÂØnê4
?Åz	Ä³Á¹÷qõ/ç£ôÏUo,rd/Ë=M´eTÎTó­ÙÌÚÀAÀé¼Dp°Q]ïhõyì24LLOQ8©ÉéÇL£ý 
ü²[¡ÿ.ª)ÌC·ì]­Zx³J²Æõ#p=}WCãKØa-ìCnHzÔ*SEðaÂaþÆF[w h<H¾,j5-UBk-Hó!.Wp0mu9Øµ8~<xÌ³aAR#9µIûÈn×í:e	¸í§gqX$îx¯¿Fçáú}~Üp§³Ðô
ý¥?Íæý¢-¯âk®ÔNÝ  E<WJrõw®*¤À$Öosøçì¸<!ï(QÈ¬ªå¦8Ë= Úú5ARoÄáö¹¬=Möaã]Y½ÿåï<fÂ YÒ:/ëFMõ¼ÚEÏxÑf:ã¢Óé÷«©Íÿ=ML¢éÇ%M,âúàã±äè2Ð E<õ=MVñÄ£qiåúvh&øïÔy'x$¶È#º~ÿ&ôË°b6vTf½\£qkO~ìÏ¸¥Á£1yMevkñÁVìjÎÀ6ö+ö1J-êìÍI¶
l¨[M7Úä*R»!FûÐá¼ª~r9ìþ8æÏ<>ô@þÃG4Ië	¡d\kòb=M§AÿLÓåÍj5
}Õð¿Ú·f=M°-R0Û1â½Û¦ßfÙó¥n	yT9!>ßàÌ^êÜ2)aÚÏcò<ïÉªÇP!Ú?½Ãn
7Ê7 z%ÙWßCÄÖä= ÿÎÀ¬¯r¥ð>Ì
Àe¿TÏsýV»}÷àÞ}Æn^Ó>ÜQ¥ÆÍ²=}¿R99~"(×5=}À= B'=}ÈU"8a*¦lôU+ÉÝ&*oDpan (+EBw°?¥<$,E©=}é#¿®?c¿*Þû0vßæÖ/|¨¥ØrºdHJÔXOûMºWÃd£^^°4¦ÑG:+64¯v§71Ý¥¼àÄ*?£BrlW}a[o÷_é75îX{ÌøÚD¨¦ydF	{µ9ÁÃrÏÐêD1ÑÌn2=Mdµ»3ãhð§K0ÇEyö1@ìpk*ÙÄãäÛíªôÓ.âõLþº(-;^ÂzÆ^£æ°ª:µÍª[= Í_¸u\;'B¸¥½´ébÞºÏyYotÏ!7´ÓÍrC\´ò,°¶ÄyÙÖØþLZk¦;,}¨JZET%·ÇTy_£ó4Ï¾OyáÜC= ôE+Vü[ýàüYT«±ã¶eWç/Ðì	v¸·{ÀÍ®N6¥"	-ân®>°r
<uño­/Ò.å	ÞÚI¿>¬.k¹@¶ñ=}µLp¢þm¿á¸¬~ýoCäÆÞ¬Ì!V8ËG];Ô;nñôel"5Öúob½)åÿ?<Àâ*¦Çç4lËcUÚ=}L1®xÙ*çÿOL+±Ë;3?r­bÁð/ÔaaÅ.0ðßØ»ç¡º5RÔUbQ¼Ë-Ì1nÈHPÚ8P, =}¿weÔ9·î@)½)A^ÓÝ·×}
-ø!SÌÆÍïYß´C©Ú©¹#Õ¢fÍ¬ÃPÞ¤¶ÆtüW¥4ÁnMÖ:Àó¼á¢&{½_ö.ÐC&rÙt÷Å°¹äj¼hþa-ï¢=M_û,1oeË= ¬:&A­nÝêèXÔè0®Ú½ÂFËêßb·â72oÍ ¬Úù_vH1s­Ã§ß¸7YÐºóp80Ï=}*%uÝ7~*%rLê¤@Ç¼ß:'ÂòaBPíÓë¾^Y^l,¤ÎµíÛc¨­«äâæ$:©íÔ2û¾ajCÙ=} èø£GT½õÏ.µ¯7úÌ=}>ß9EkÀóÈÊïÔ^RûJÝ,× rÔQQÄ1º³æ%º,É7%5Ò¯58¯ÀD!{³ä)§ú´Ô¾óËÛ¶ªôÎ¸I¶®Cw0 ézýÅ |K¶åÌ>þ\üë·ZO¦×g¼SÃæ(@TaG)þeH(Þ1øT=}îÓð/¡,'>]FCÀÜAº;?±ýø[¾¯P±s¬¸²2äÇEf%tãÆ0´VqÏÁ®ó±;Ï³HfÖ ÍW¨®ÿ0²¼3¨JÂ!î³^½îì=M:QÍËªðá¾r·4²ÕÁÍ«
#ÇÚüBïk{n¹=  8Z ¶nxhß#ç4¸ü¬O4ÉlÓêã	¡cJùù]9vMw=Mf¨g½hÊªÈÅa ´·Ìi,·ÒM8¸PeÜ%¹ª
Xæó~uÀ¦¦Î BóÛCtR,Ó9Ý.JÀc6lZÊ%ÖÔûüÖÛLçé	A+f"l Ãøa÷³lNÌXØÿh§6ÁLFï»ô°§íHtX¡XIh&k6TV½Õ­xr$¾Óà@°×0µFém.Ù¼óH§m=M!FUV£þ¬Õe;B×Þ§VÑïy&?ï²0C¥°óöQäÐý9§P¼â«ß­øúD=  ¶ù'=}Y÷üóäNbBTçì¿%@¼.ït,õø¥j°}åh¯K+ÇËÓ¹å \éh,wS{*!ùrw0t/nÏHÎªø2êµ§¼ÞU-¹ÜË>ì¨5Ù=M¿ÏDìñüØÎçåuí7%³§¯_ÒM^:.½|	
A[lÞd¥ÍU_¼9[l*Å8ëmXfÝW$_<úC¡%ctJQñÓJlÉXMçV^gÿû]9¼xAà´¦¾©¨qÓ ëé¬ î%b
íG<=M= $/^tïÑ:gïÈYÔø9úâ­e¿9 B³Lã¯¶ÃÖÇÖp¤A»ß¹( canÊì8à¼¢§AdYCÏ,áÀl]4<1=MHõ4³$dBS+g<eÄhù»=Mù¾¬ùÌv'Î/<Î´.&{j¤¿ë@Æ²>ùËZnTç²eHT:I J	ãx¥¥ëj¶>º
åº°Ò=}´Î´P£L¯Ï¯
rmöo¡hÇó¾ô~¦K¬õHóLñs5 !Iï½$£0jpCË6ç0f= háVC^Ý¾Î(?t¬
wO]DüÚ²fh9/§Üe?6fH+oú&= éÀ@)ÓIX kÇqsWßýGåÅ\¿ÙjgG¸O8Ðµ1T9¨Öz/ ¿4ñ;ÜnÏ4(¢!Ñm)íúÜf)¾]ö
dFßÁkS@ú§ÖøzCÄô¶AUBÒ¡¥pC LJä¿OWÁ¿ïpcèBîË«1c53BæÖn"åÖZ27¥¶J= q¡îTàËÐäÙ\~½_ãÉüþôÄÜ$_Î$~FD=}¨b= 8vX÷%>ÏÀ¹a{ÙxR¬åTEº¶7bIFÁ­Ø@·/³ð÷éFò{ÂéóÙ-Ú­ä[cÏÂ¤Úe²0UÑ%@IïLé¬dö~v1ê¼±Í%À¹8¦ýº,¼©F§'ÞéÃðçd9'å,éÂe:VK«^o'ÊÀ»Ò{Ón¢ínÐ³
ßåszLsëÿ_Å²!»~^îé·ìÿkªÙûú°[ÌTbÃJ?§·Ò"o
o	Êl¯¿jÜ6Õg4!öæä¢Æ5³O<yãÊ"	ûÁ¤âý«ÝÿF¤±yß&2í\ïc¸¥+?âgj*-gO4Æ´½ÿr+¹!mâ÷nØt½J±-@õÝG89ßkê´>¡UJ³6ûrsÐJ×=}¹-13ÀÃàÛ%VÌ|'®|pò³$1hê4j»èPäló¾QÓ¦ÜG+e¦~lÔW·K×¾qIÊútæõÄ= æQgÌ&»¿x÷ªdíîïå8|noä¥n¯*Ôº1ÉÈ|¸à×2l@¹b~a"e²Ç­ßÌâ4Ý'ÞâÆeøyhM¼ô4¹üZÅvÆüHá¯Âç­¶¤Î®Ôd¬Öõï7Mç>V@µA,gØ¯ÿ®ãÁ¨öQÙ5ÐL58ÿO·jöÌ>  Ö7Ý0,Á#Lt~PXúP|"Îd<òp@ðKÇ¯e³B»6BfìÞ· îL=}XËsÙ}²ÛÁ¯®Ð¨èÇÆôÊÆ4Æ4Æ4ææº¨@ñæX+§ÒSQ<$¨×[YbY]eá¬Üy«îÑç!¶îÍ²ø{Ko·Ég-AshÉp
¿tÉp-òºãy1ô¶£ûÅWXkÀkýõÒ£R¦\Ú(fµJ'í{¬®îJ&¡ò#ÌÛ9ivãý¡û¶2³ZYÁ^æY%ù*V×0Q ×äÆf9;·ÙñÝ°ÜØ b¹Õg	¯ÒDT´»Udn%ýô{Dû³ÀÅ¢Çî3o/¿åÝ]u¶ÂÜ!§öe<gLíE£ÙDãÿ9­Ã¥ºeàxIÞ I¢&Íaû9.[Ë³ÖY¨I= j+JÀ­	ve= fX¨ø	x|-~tâz;_n±Ý>¡hûí:ÝP	ëMpä¨É;9åx6YiºZ¿¹s0ekº{µÞ£Á¯ê´}òÙl9¼sö½jåxEKßIµõùt!÷UvóA'¤üG;­sÉc»D¤ÐÝ"Å ²¥ä¼ïæ¶TkãE4*:(É[ÀCV\·|@ÅhNißñc×dÒxË½Ä!Qé?zé8Û(_èhghWÁÈ©TùëÚ&\ØdñxùdBxHX)8¤8ïèÖÃTõNÏN·Fî@24Là ÅPm¹Þ¢7lÄ6³eÆftNöÏõýúó/+«J©2ÉøÕZYæÊÓ2Jè;MÈï?ï? ¬Î,Cî®È>#Wn$d#óðF&Â³È*V8N^¾R¼LØ!D÷P¼Ç«§(õ¸¿ôÏÀ¿~¾§(Í(Õö|<øM,B¼,¼,¦Â¢Â ,ïÿf¦Äöoô?öÿ¤üÂéO¹[ÍÂóiE¾éÙ|R+7îgE+Õèäe>BÌJ1Gæ?¨t=MÈ0&Cà^RÓs=M{Þ sÙµ<[uÛ=}jZÙz'ñ¶;VÃjÎõ2m.§ºú;³3j_§q¼Õeq2¿.¢É|G7!µ.ýÀîE¹ü[mXño%úð·ÄJ§=MÂ»W¥ÄNõ½nñ~7x#«x¢Æ.ÞúðÄõù®å±v­yÃ$ÏëÛOÇ¦â2¼Íérel}÷µëª|ü3Ú¶¤Ä¨é6üDS²@ZÞÓ
Óê?ã$ñ=}+¾cû= S?«¼¤Â³tû¨þà6©ÌÞ )·ÿM¹þûÊýÞÞ1®âvµn[þ¦W¥µ=}NlN¥tc¶X
ÂnÉª¿¶Xi(k1c¡=MýkÏ\«o[¡¼ÂÕ£¡q¼[äâ;£¢Å	TãíÕ@gLOÔ(H'ÌG@÷L@ÿjfnp3-×ª¡5ðËæÆÕ8ð³Kæ.ÎO=}¤¸X§DcöK=MÈT#Fâp#Ã3qR= #Ã×>C§Ð·<Á×.= ç<ª-âU= H=MåÝWZª^.Ás%Éb3Ô	.É?fç?5ÒVt¸Ðï óI¼>æÓçLõ!0vÈD
Ã4
õo¦l¤f¨m¯Ö)i'²LÑWü¿|d0Î¨ÛhöJï:b@$÷ÃçL±o=MP¥¾7Ñ@,ã·=MBôdâ"×,ÿú@Â´ÅB,ìÂg×ÄÀ·R¦4Ó7í$0¸X¿*Ï%RÄ¨f¿2ËMË= Öd8ÙQL0×WÕGÿþèô ¨ÎI²Q®ôÚ.¢r^PÃØ*õOÅGöC8±gå!SEP^m"-¤Mk}Ôñ)_'ä+y°öùöqüìY¡ÿäéc2 Bð}?
·jÊÚ\ÏZ!¯çjÉZy¦¾ýí! ÅºÎt3ö·÷!÷]Ë~i¨ò´1ìO}wÞ DjMn3â¶e	h#Û"µ½Ë"ìvÑlÛ/^ãi231Õ¾ZX|À_@y^EÐqUy;ö§ ìß-)wßú8øÑ¡X£°éV=}® Úwç#ú¢hw§8lð§Hü¢föáY)s0ðZ·ÒÅ5B ÍoôÚ¯nQ^!<âD%tó½xðêUW?nLÚë«Ò.{ÒÏÕñâ%};YÂ ¹Ù6>µ½'ã!^­ä²ÙLNmUÓª¾½i:h÷GYûuÈ§ C®)e½R¡ýð!üp>bY$l{ëyàz.ÃÜ¿%iéfákl4ôeY
xÝ%0"{nYsÌAV¶úTÈZ1ÝÄm<\q\çìEÝ2,Ù?ÉGi¿J^ò¤Ç|¸Îë$Bµ	Ä¡ßåÝÊJ4Ä ¼/²AHD4'/Ëÿå¬¨mñqÚ£m)Að'SC= þ~XÐÂ8ÏJ^÷Oÿòç,9,í÷ËQÍCòM-$:Ìo'·F~³
s-Cªvc]¾ì¹{Ú!¶$}µE:?¯ÏÌÊ²;±i×}F©564Hì<_K~à[{Äfk¢8TÐdSG7Æ¥b!¢gîòïm°ØTÏÏÖº?úxÇ¤c8ýÏzH¡«¿×£¬<úE@HìLHM¤gÞ¤s~{ªÛ¡Å;?Ë$ÇÇ!($¡cM!G¥íõ2)ÑÁM4¡hàþaj×tÇv¼_ÄÀ"ñW£¨k¶ok?¬2£%ÕÆ5¹ÝÎã/¦©®><w_÷Í
ÊB³¶¼pBÓ¼?ëâD~Q2H&añÀTa¥Çñö¼9ô**úÇûª}ÜáÞ­ù»«ëØÄmi}+l±	j3£{}þj¹ió(Yh.òÜ)Ê3l6ðá¼¨¶¯ª4+$A§
Ê¸=MÊDÚü@cH¯ÎÊ:ÍI´v=M¨«,~^XÎºTèõ¸,5ÿË8ã9bÀÈ0=M£¢
>õ^Du¸ÍX¬pú+Ø<VòR0$¸)µlt¾zj
 L}.æ¶
/Ø®¡«:öp¦6-Â8&¶
JÅ§².¨FØIô2(´vD= "ìÐÆm8ÉvE£¥T:'Lßè8%'ÌGÍ'&H.=M¦&ÅÖ°= F¢YÍÌ-¿±&´j|I7$¿ôÀ2/ÌÒ½Ë:Vóh6'À2?áÒë@f¶=MóÚ@ÛÚTì'½8Õ/5&vÀGAº %*%U#3ïwÛ¼*ÈFï\ ííÃB®õBAG;= óÊQÛrgÏþ½µZT=M*eÔø®Ô«cHÁG»-åÿ²Òc1wÔ_;ÈC¯,öSö8ó	ÖàdGÅîkµl:õôÏ÷ÝRÑ63$IÿÓ¶~RE>´4W­,ö$Â7ÃÊ½5Jä~h8ÏIæ¿kFåNØÐø/VKÎü²Ç$\ÏG¨ÌR ÐI²rmbcþ¹¨#.nÑ6iorÌý=}ÊíS¸Ícíýç,eö¢Ú:×Q&Û#iðõ(??©âÍ{vZßíiZ'wçèí Eü|s!Æ\PÐyxIxI|åvµeæh÷>9hx¶EcÕ-Ñà"cd»­NFÙØZ ósÀ Nì«4ZæÍ|öN)~­	²×pô½wÏÙä¹ËÕxÙ\)é3/L­.Ö-1dgá¼\ÖÙ|ÊÍy= ¦zF^jXÄ¯Vìh;~Û|á*¤oºo9iZåÐxÆ îË£°Á|)«AèY$1/pêu!¸{æoZW
ß ¡Ü­?£_%dê£qýgAïeßi
ßzö¯?Ç¼)d~%w_¸4y_é7q·f jËs 0bkµ¾aüwK8.°ÁõXÁá½Zµ®ñcÔç° ôg0²{½'Ûº*Q£
ØIëdOþi¿#yüd¹=Mx)Ê!ûmn),¯ô#^8:ä³7Ñ«áFå|½mc¯<Ò¯wó(9ÕÔ"Måga=}hÀ¸{½ËrùÃ{®.´-)4q¤dh9\|ÝÌÉñ=M;nß½lâêº81[/o{ÒF¥^R¨=}XMß!³ç¸ ]õ­ß(qó¤¾Uyà²ÉÞ°S8Õ(jÌÙdücÜàÌ¼@8À]½õr­yäÿElüý[òÓY(m'Ø.ù
Y3qÐåîF­ê|ö(ý	X<Í|©l2_èÑÑëÂé?½4äÀÈîõ(¡¨å5
Í,ÎWÇÝoÿrtBìMBP(Ç?>·§¦2to+( 6Çßâçþû~ ï·'³µÎLÊR¦ °Ôö¤¯}þwÑl5ó£îáÉðd¥/À= øðí¢gâö¶: càç¥ì½_e%näÊcacèà?àS^¤g^Õ¸TO!úûMZ[}co¼¸¼êêZGt6[û{{÷tlë'6ò×úXDT Ï^t(ZTÃãÈv3|¢7õ	IÿA¯ºÛ!&..}/°EÙ´ZÊÈT(xcg·oG4öujiÒÌºé)}T6ê¼ë-¶Z>¼WÄ@7¦qég$á±OÖ=}P¡jb]ÇÿD{Z«uøð«o¯­m^ cwByÑM*KD¿AöëåBT*¶eVÊÔ
 ÓÀ M·´¾e%0¸ãQ)<kÜþYHÙþåªµ×jÌ°$ñ·¶ñD7BvÕxEKö¿|Z?¤@=M2à	/®AsµbèáÉxtÖüü¡·áÞýå}ûÙitÐîEv;âÞcuÝÃÒ©¹Ûj®dúÁ©ÊÂ6öä¼U/¶w@ú]èúO¥= £j·¿­ø9ðè.÷l¦ trå,0,.*/+Ýúsè$ºÁã½lÑÉÒ²VUTôrF² ÎFGÔäî~J»Üì_WCX+PJ&LÀ¨xnõÆÄ¼ÆÿÞ&{À­ÖoVU¼G	Þa£ú©ü©=MS<â× øô$ÈM«½eO![rp>y"i´ûA~,©ÄRAN'ùò #[­|ÜÖöÈÈ÷ææc4$×?½¼¶ðúWbT¦F$CnKè_'ö¸Ü:)(c(Ç>þþE6ÊàüÉS}¬|Öv¦Îwàbn29Ôþòêt?¥,|ª§=}Õ= Ì¬¯4õiTN-Xïü ôÀÁVÔ¨6þI rDÙ{tS±ãPÇQEÊØ.rUF·;«¤kK÷Ú¨ÎëAÙ¯¬ DÂ}SIB¾ÏÝòè­v,rvrAÆÓñnÇÛp ^V6.0,OÇõÀ2ìäpS¸¦ðÛ?¥v §Ê¡ié«TL¾Ì É©¤Ïì-JX «nû*A¬=MCFúHû ûÆ^LÎî*©0<V/C1L,ÞÞÿµ¾1ªöx5£°^fPðõgJõÝ"æ·ÂÀ	)W'§ÞÓ¨0Z3ù=M>¡t(¬Ô<&æìºL%ÍÂ¾u"0÷?EA.OÿC]¤o28×r?¼ú(ìeXw)ù°-nüÚ¡¡©p®^fX	¥¸bfÎ¯wÍ-©Ü¶Ç°ÜLª³ØÏmcH3'ÀpÛvÉ_¸onÃ[1¬Ø@Íá }ÎåÀQÌT¬ÀÄ!:/ðç01þ}06±ÒÓæ<]e64Ä÷1;ÈÂ!® rÃÄMtÖF¦ûø¼ÿü:ãïC	)áMÂå°jæM.Àö¡ùêFP<N®ÚDH	2¯tÜQSGÓUkÌOJK§èb=M{ÇÕV±dÄ8äé_þ¦P(](jI­g(\E_å5X
g@ÖóoÝ*î´\ÜABÐ<ùw%hæ_7võÿÛ*AWç>Õ@~m¹VªÊ)tqCVB+ÿrµ~%×ÇlÐë~AP@@4B!IåUNB6N,RËÍ®pd¼Ayðþ¢ÄÅM/±ÔKU§øCE+ÇÊnî2ufÖ,B/\|lºÆ c8¿'J¶¿,¼£¶ ¡¼-%.È23³çÿJ­¤0*Úú´ÐÕËøÕöqæn^^^oäNPã±0+7U pýøà n=}ÃR°jG¬îî=}nÒµàðlË¶³PXE1\Í¶dl_)¬4FO2Ã4Æ4Æ4Æ4Gï&x¶" 8¥î¡HâSGUaHæKGáÈGJFG¨|VI&ïxlVJ¨ô{Ì$å³×ieXQÿ°)¸^TL°Dè®ØÕv]4ÕVÅkdr=MÁ/	Óe
{WÄMÀê£e7XÓj{a:ÌI=}úÕÆî}aU2qLp<×3÷a;ÀcÛÎ²ÛyÌyØ´¨;mg ¢æè/c{v¥þú9¸XSÈnãÝ|[êá»iä|Zâ¡«éãý|\ò!ËéähRñ¨RõRóÈR÷xRò¸RöRô5=}~^¥ªã¬ë+íþn¥®¬ì3-þfÂ¥¬ó,ë/=MþvB¥°,ì7Mþ\r%©ßë*å¾lò%­ÿì2%¾d²%«ïë.¾t2%¯ì6E¾= %ªçÌë,õ>p%®Ìì45>hÒ%¬÷Lëiz%øÝ|[êá»iä|Zâ¡«éãý|\ò!ËéähRñ¨RõRóÈR÷xRò¸RöRô5=}~^¥ªã¬ëÚó!ð=} òèõM=}­À ¢j+'ö Us#¥¨G)?õOÝ$mgÄUq'%QòJÀ]úËò+ë÷|ôtNü!ò+ó¥ûôlü¼14ñä¾§çÆH;Aõ;"
¸¼$l3O
ö¥»¨ì32½}PÖcHþÍîÌ«æÄ+öÔa=}åGò"Ôo(#Cò2àsË~ðó­4 ÃU±øRØàNKî÷/4ÓU§AR XÜ¸½Jô¥×ð&øS¤¯X!èEK#d!=MéÅä!ä$ýE¤ôrÀn%ÿër®¿¯6EÃóúz?ÄÿN&úrDÿO=MöÆ¢Ä8N·Ô  ÌÿÄÔ ÈPCD÷V6ÔéÀeJº÷ º³Âû3Êó³ÀÒï3@Cº·oBÂâ7ïBÊþ·°DÒö7!¹#½àÅÏ"ÁO$EéEç#I¨"MÅ($Që#UEÈ2Ve¡<i·àÍ¨0=M×E2$É· ÍSE§$±'t:kÇG,#yä<µXRo[âæX8¥ë"ä.©ðyt_9F:Gí»Bú pÐ¶v½×¤eGGGNÐ´ðOÕ?æÔxªþvp['ªÙnÉØ^²[Ñ\ýe9OYUWYéYÇt
¹pb7]jI8iÑjáàb5hb7Ar¬q¡örÉ¬rItqOyr²m¾:ó2#»Ooèc'/ëcG­Ñ¬ Û´ff³fWsOs¡LÉø*ùÛÜÖu= ª:4°d×ÝowdÝî;&ÒcÀg+vîwUÁµpMyfÉ°r©õÁÝÄìj£ébðôTò:µÇOÉÈ9¦ûn÷Ã¡ÄtIlÕ¹0TS*pGo××9= ÔY%lY×ÂyÑáxÑÜI¿»õ²zé·àÙ4rc××ÓÞÚ}Þ¦{©Õ[C¡ûÔ¯QúÉÏâÞ+gG5Ñ¢n9¢¥Iï¨]ðï]rO¿éÿf«EDyVÀÚ>,yp;ñ$ ôDN:eÄaÂ¹|É4\Xg°tj½¬l8Êø?É³âÈ>öØÄI=Mõ~FùÐ\7	ö9²1r}KÇ94PÙV¢¨¡äÓ¶ÐWV¹¸Y»P%OvaWyÑgÚÏq5¦9¦I8çß¡YòZs©=MÙÁ[yà\£cAb)"Ù=M+ÄÐ\=Mgia!e[>ÚõÙÇ½yß
©×ºyD-iz.ÃyE9(ÂåéÚÓ)¤_aì¥éiÜÅélÕàSraÊÍÁÓét òrfK°uÝÆâù8ÿóbØw)a<yÝ«9ÙdAþ·io2m=M,±!¦ãyÇÉs= ¨äTZòP¡'ùÜWÙix«P,iüÇWUbÁJvjtKÝ3]{Øì¨ívÆa²,ðaÂ¼bî+;>sî©Ýr@b2NíåÕ|åúÔKrÊª°Êå¼ÀZ|È2á6hkPÙjO©ï§½¢ªÔïm¨¹BSnIïîß8¾iì£/>ÁÜÚþ­~§®*îè®~­ÃÂøÞîÃÃ×ûïû+ö×sÇþØç3þÌÀ§²*W@J¾é¯Â¯þV½5=}î¯UIrîïùÛ>cþ¬ìÎ=}¥âç}ö,*"Ó:R0ÓÂ-ÇÅéÐÆ)FurÅmlçqB
ìÌÜ¢*r&ý»ß²I-¥v\«¤oBÑp×5Õ27gu¾¶Õ=}çðÕA¨\Ö6(ÕîUA¡äT7¸µ3÷hio¥cý÷Å?¢àZë_d*î+Ùzz;­7Ë{íwø°¨B/¥Å¦ÂR*ÉÒ<aÞå}bÂªnóqÎä²KPØÆ[%zÙlA,\]ã[RgÛÚPaïîa¬±Ý
N_°rc¥èÜx¦!M1ÉPÑY«¤ê7sHcë	V(Å1-qËv¹ØDÜEÿü¹èÎµmÆ¨È%á\áÑhhU6îÕNýpBiðÍsµ¤/ñCá¼×g¬.Ó_¬µÔÙRÏaÔO@{ÏC¾É½¤.üð­úÖt´6 ÿÆTÁß0eî
= Ã £ûfc±6ì°hÍ@(7)×8)M~¼óU°2Ò¾õ³( OPË8újvUÞ¥ùèÑÛ84	Í@øúä´ºð WTN0*Î&NÊD×pÇhôî=}pÎK5å¦:ENRV»§õÉÒ</5Û¿¾= ØÈÑåJ$G.ö×4ùTMÀÖT}³³i	³=}»6Ø×
ÔTQcWÏê8)¹\±=MoQi¤19jä®ô.!O7@=}Ê5<Üá6zÑ«nè"äL)î\4úáÒpæOðü¬EU?ì÷óÓÒæuE5æ¢&QR¹v3¾¶ÿÍ*u¶
í´Ù+UûÃ¶Dwr-àÇñSRå	ÿ Õ¨W}ù®IPà"$;üvUÿÌCA\PVé8©E4ÕTßÛOn¨ÔN=}pOv½/1¸õö:^!¨]þ|²±Ú#Yþêx£üI;ÖöSÙöhL=}ìqH#yO..óxxç¸·>ò7¡Á¤00EÂXÿEfvõ®HÞ=}tDÒP¼²´ÚR¸ê ØðÖ7@üî÷}no©±ìÕyæÚ1ú~oÚG¡äâÝG&±¢Ôà³VªÃçr
g{¬»¡Ä*SwDnáëûR¼HSe]-å¹=}5æ@|l|ß+%ªÂ?ôdUÊ§Q:McÐø)û)Å¥Ö:Í% ìU>VòWp­n\äA&QÖ/aÕË(L¿OAª9CLd|¶á,-Ö28Q9<O¹@U «.6ºZE³Ñ¥R|ã=}øÃ¦¦µøÒìÏ¶x!¶bÑ= ­n)LLÙKIì!À"x­Y×X±G¾ X®âVÈTVl× ËÓY:rÙ~lÁE~5 UIÅÈÕÇ]ikI@iùýl©)rÑ7^X[_­©\g³A¹ÙboQ{izQøíqÙBe×ªÎ ¨q^Ñ3´qÃ"ãaÊ¥"¤âcJÌÐ=M/®°ék:Úaï>þ ß^Ñ³ôCÄ!äLÙ]D#d;|ÜVõÅ%M.n}^ÒÙ'Ã£¨ågÞáÃ$ãdÉ§AÅ%§æèaKÊÌ	]ó(¼»°¤ÎÂ×¿«¥±Ùðúãa<û2¬S³DäÌ+kûÕ6ÚOB"²ÈØÀÌÆ²¯£µÑy!*{ù914¶
Ñ7%ær3Hr\PÕog_amYªyí¹é^_Úc-ì²o>H±fG¥7½&Ã¼É +¿ä¶æ%;ÒpvR0O*¿OÃZ´/³à5ÅÜøþ1cÏ2(øÅÔÓ,«4äTÏ1³F¼tWú¡0Ð´®Ïô¸ÝE;f>FÄ4Î	aËô{x»8"H±Ú6ßBNÏ*FÏbUVÏ÷§(96t+DF×Ål58'¦VÝ6OpE=MÇ3¦2V)çQî6øE1Ø4Fl¹[½gÙÊªY¦r/OâÆ4?±¥rDôÆ4&	JOµ}=M||@Â:ÖlÓPúhü«= éÌaÀD)±ß]aö*S6;øò¿AP	;¡fÞEj¿'å"É<Åfþ£P /}áíïiuøëtkÊuó$¢Í÷RÂ½¾96äÎs4?	{ðzdK1Ðøù ^È=}ä³®¥Ç§b¼!ÂÀ§ý[ cWhª@ùë+zG#­3ÿ;5´nü b£\]Ô¤]ØW|ª)Lñ¹9å Û¨^´8acçØjµV©Xz±{R¿"ØìMËfLxëBùoÖäú+ )é¡Ô"£eB¯FçLVþmÂý%bìx«8³" ×pUO®ùW²ó< ÄÚGÌÇïKhþK4«V¾3Â6zÚ3§÷ÎÛ¼ä^ÜýHopÛ 2ÛÛÚôy,·É°¸IHÉûÛ(8­%Â®ªÌ®\[°ñU cú;Áëã«ntÑ©8Æ®-Í£¢;~ç"$¬K"Ç|~°Ó
Ñ9N¾^HÉ°I}¶À^\±J¶§2Îô!*íL§x¬!
ÅÒÀbdÄ¤Iáî+ß~U·ÛGæ»_=Mýñoð»çP?¬¼jK&Ñ§{0üá/ÅÕ­!òÞñnoKâ=Mc"°dñk·N	[sL
·ò(¸rR1C?¼Lè8>º÷ðà
w¾ÈËòð*µc>+à÷¤Ìáè"Ä¹gv¿l­ðæóÌ×!a1üÆÿåç|¾7!û°ÆoÆñNlïÀ;pó"×F¥£ÐÀ	}Ü\ÑÊöZBqö'=M¤ÂEkÂÑ¨¡SÃ.,«*tøã:þm×ì 9{ÞQì"µð~Ð°Ï~jvöÝÌT}Cï~ûHóá*,]W¢yÁË[ÞÀ<Òðj(¾öÑã¼ÜÌõMW¼B|ïdÜ»Òßqøs(z*ÝÆä;íÀmÌt{{è/ë%þjµä98:uæb=}ÆqþºFl'K©?ñÝRÑa¼ÛÄaqúo¥øóySOd»;[ ]K4çY%E[ÉF(ØØ/7Oü¦xT³ÖÂêR{7TGDx7õôB¦ØÎÈ¯ÑJ²4äSs¨×HEâ¿ö= (Ô¹¬D§à§Gñ°Jæ¨¶ò2/núË:RÀ'>KÞl(ëöqP)êôúç¶Ë9°= ¯x	 (÷ÄF±çóÆÒú¼$JÂMØÄ¦û¼ÈÜe1ÆBâ¯ÕQ8ëïEî´i7Ã§×	³ &qýÈóÒÿE+)]øà5Í?*¯|+ßsê°º!°_àsI4ZÖ?è. §h4Ð¬wî°TÍv$K]ö%Í"AÆõ£(¢åñ¡3bqô¥ùCHJ}Öu BùÊE5o·¼*(vLüÂîü±/ëq4êñ[> :5Lv'.IAå	úÕ5Ýª¶àIÂT_*Pyÿ h½/ZMHYåWvEà¨H×qþO¾÷uA3àý73+ä[N·aG"<niø",WF¬¤°ó¦dÍÿÏÀ$ú°à¦³Õg-?7;÷Ä«Ãâ$f¯ø®À¶¸ÎU¼K8g%Õ4÷ïF
õ6çÀ3«3d3i©æø]\Ùq°Y^³À4X.ãÆ4ÏËÆ4Æ4Æ'1G|UCwAÐ©MÓt¾ô98z5°JÜc{ð9áòÝÒ&zÌ_l-KjRT]1ã )X@×rß<øQ«Ùã8SJzpQzüd¼öéèÈ ­tÜ´ù$0åÀÇæúÈÙ²vóÏÄùTÿs÷¬îéªZ"/QX¸c5»%oúYµERq(Þ5¿ox¿\äX znÌk©É¤+â)ÓrèHS»ÊG©em+û9ymâ¨:ñ¸dUæiÕcÛ£y×LJ  HUI0lx]Ôª4lEÚG©U*fÜ¨µy.=}]sf ñÔ4È8oÈ4y%cç«ïi=M â¬aøÚÔûjkñf*ÿà!I(XZckÈSk8ÞDôèJñÉâSl0¦Ìr~@ÿÔ_è.¨;C5ª=}àwÛ,îØ*Up5×öÚÚ;-Ê.¤^ nJ °Ë)¦ëxÐ:!ÛÀ¾[A× äÊÆ¼ÜàyÄá_Bg:eà$M0±©5~±êðLÔëuÐu{N<6}î=MëÈöD¡Ñ²+}O²ýÑòªä~7?º=}Å JðO}Óøö!³ú:~?F¸!H÷ì¡´;rëÒE¸&½"È[ðâ}öXçýg(«óÐàs¶¸£7á3§FâË¬+eî÷:K= ]\¾ªY^Æ4ÆÔÆ4Æ4?4VÅ4Ï&­~ïØé¥gÇÃ¨O¡Â·¿þ³eè´-{AU³ÇÛvê±x1¨¥í(é"âÐ(âXp;ÞÚâIkm¤êÜs=}Áwrí~pÆaÐîl²-J}pG_é3ï4ï=}ú!«°b#|(¤"÷KêQFyvÖ#½í7öz§Î¤=}¨CsE2ÙèôÊ×tëF|<·]v85ºí×çè§ IüP³x·Iü¶= F-ÆÁä7Å;IØcD¸IRñ8º=}%#ØÞ¥Ch	ÇSÜAøXzÆ Yð_¿µçüUµif?"ºZµ|[trÊUäìÛ)=MÁhnº[Î!Â;VºÆ}DùMweN*ÃºáDé!Úhør½/±ù2.kvèú¢õvù&j.èö·G[zõ¶<Z ¨µ>f.ÅxÉ	QúÑ-x2ÓÚQÑq)Keìî:páAµmôEÑuÏÞ</äím~úèÞÛ¯Úæ»c§Ç¥²ôÍø#Ý¾¡o¿w?Ùï÷ä8L*¯®ÙuáFï7%í:f3DJ/cûÃ	Å¬ä2N¹ÍÂJì¦Q92e3ò¯ýÒº0glÞÀJ!= §O:õ¤gf"¿a É0ÁmÔ/æ<ÜC]£j}æ3çr(:«2¯aÛ= i]ÙÛ
Æ4Æ4FÕÿF·æL.ÆÄBL7Efïº0X½¦ïæÊË×í|ÕìÈ3m!¬}X{@jëýå>¾×1ù*®¿óJEÃõù'Û¹fWXÜ¯Â;éüáõPÂ<0Üâê¤çA×¡èÓÖ/÷/À7\Vf
Ç!
2qÌR÷ä¥¡â>+|¬mïó
'uF ?´ÅÖå~PR(c Ä¶×ófxÆ¼¤÷!ç¬O5»è=M6Ú¸v1=}!{³7cÀäÍVd¸þáÆ5ñ	(f6sÐõÌÁî= PòØ7ìÜ·åCÔÒöVBÅ<ÜÍõXP¼2ow½R@Ó¼Z5g}Ó¶y¢Í¶c{
ñî#zMe:	¨ähÞË åæhQ}c@Ù¯]K8	8ëhT{Rãä°üñ)n&(øûâòwÊ0×å>ïÐu;!¨ãÀHX;²¶ïôôbuA¡JÎ{¢5ì¨¿3M½¯Bý9^tL­¿¢þ4æVý2ö6Øÿ¬HòÚ¹Æ_Ë7òÕ±ô¢ö°oúØÀzÊ(XPÅcöËLgË"²÷ääºwöÌK	«&ÕÕ= =}Yü= ^µHÅzDã1a@ù»½W'Ý Ì£Q{´#¡Øþ£Rúùå5¾RðÌ<TËgÃ°ù¹4Vcçn¯kklèãp°JWÄn¸´ÂRØWú-Ö°¤þ³ÇÐ-kÏûïÀÎ¼E¤vþN%±èà¼\çìté5Âyêøt8K3WâL¿àô²×ûò](o+ =M	O³d6ú%ñ0ãV¯' úæÞh4i=MÔºþP3"gH9²vý¸Fy4 ì ÂU¸Ü/¶µFE;T¶¶E«B	ôÐ8Î¼WôèNPÑh3Ó5FXT·ï5Fþ0èHSSÉ3/àE UûS2/(\VuëxyºYâ\=}uu9ÝEyhË¡'çÅ¸hëA÷zÿWðàs?Õ?¨g¬Äq6@±æytÆOaGT iu/ÊmüûªèK»$pÇæû ¹ÒåÙW§Zïb9C¬ZH¥Þ-dDi»©á¹ðiôtå®­ÑãÑï;=}ùa¾{HkªÑ²Xpj°èkL¼þñhÄïâò®%"l»C÷áâ¯î)Ã:ÓÝÝ¸d~EEí¹¢JnkgÆéùÒ­hp~¥ÓºäõmøõýAà¡r£ê;µ{ú²£0ùmb«G&ê»«#ûÈe¥¾n6oÂj¢bÂ	néôGç¤Ð¤5sJ2æ6âxÏÀ4ÍÜ¦2ã^RUÓî	q×òEËox¹Ê®äÞè±ÅÀMä% oðÖ¾J.Ðo¨V¿
X8ÇáTXQaäV|ñfÉCdÖ%Ñ(Û/Ìo[Ä±ÌìÞ9<AÆ¹öÞyÈoÉwdZ<±ñV·eßéF»åj;[±æáü«]ä6´]{ÈmfÉn0[Ùhz[	r|ÙOÕwàÿªÕÙÓô[5îhQR9óh«~Òy¾ïPHp·T?çuQnô\xt»Ô9²ÕouH'ÝZò¹¯ðZKéZd( 2íÍf·PýÓ(­1×^ÿ´Ã­~æ²¢©îeõlÅ«{Eè¦Ù=MäJ©SgÝ}gÇo36qïáÚyäÁ#â[0ê	[[®|9®mþßÚ=}7©él[ 7_ÜÕEaÛZ qãbÙ»ØÑì= æ VyóLÞüÎ	JALÛõÈ÷©I4\ogòºAuÏÞ/p1Q rMÚP=  áFÉYàÔq¼= 3ô\Äæñ ²¤©\ÑÞ3×d)Òm·àô%9åÁóÚFãäÌza(ÙÛR	ºw¥¯òdÐøñYÔ!qÑª9ÆaNºDAb,Þå"²t=}0ÂÚo*Ýõ7²yÎÕÔ(Ù0k,ÚnV ä½ñÕË{µÎôY Ô.ºÁsµ·c#9òú]/ã<ù½anùG
E¤êÜhü½Ú4zfìÎýKSÁi4çÛÂ  ¡ÃByBX¤×ê0¸lÈ½ã%p;ù1­7ì(ÃÈ¡÷3¤ìÁyZë¨â8«Uò-édT¯n<h"IßÔ½«?ÆÚ jb,«+J_:×·z ôëöÀ'ê¼X¦s[¤á¢Êímv}çE|ö"ov=}á½jò«â¡È¸¨ë[/i7=Mîý¼g[ûå2ýÅÂo¨5å|¢9
yûG¤¯êAHO5ë¯òêCd!/¶}Ø²jìð¨{¬®bô£êBzÜ¥ÿ;°ôâ¤Á¾5®q+´%&I%£"%låV£Þ:¤Tí'ò'e÷w&­ÌfoÖoê<õwíí¾Q«ÒT7.OAË(N~>¯3F>>ÆÇ0N¶h=}Kà/É/#ù¼5CDpØ¾çôé©&F@wÌPí8ÉâêÖµEÞj'²}lmÂXS¿cê+ùÀèC«xÝ·¡ô¬ð+.«/ÍKw ³ùHÐ5MüiÓzãL¨ýè·ý*>:¬¡Ö(p+÷î-­Ð&å5PÆÿÏ¦=M§¿»à×¢7¨hwû¥FªÃRñ¿ÂøýfÇÀ¬'ÒSÅ8~ó¨+¶ÁB¡Îò§ÂÞBv4Tf§ùê;ÃçïxÆýkp´ÁÈ2|?¬³³TÛoÎ+ïïðM­$t38Q÷ËM<X¯æTÜGIô§´8¨àÁãâ]£wvÞëQ©cæ¢¼Øá¯#:åR¼Òø['xþá"Ê<É»kst92æ f4u ¼ÇJ]%q÷áÒìC5mMsf0T¦ Rër±LÄ/3ÃùÕêcøÄúOÅu³ÿÜüC;5HÓËúZOÀr;ï¤aøæª¯Ðgcôäæ?ºÎ>ÕH¸Ù(eo:TÙQÔ>kuÖm¾xôú=}éO'_Ä_PjM±gQº~µà/Cþf§UÂäëOÑ¸6ZÒsçÑ6)bp¼òdÇ»µªw5)ï|-\Kyl)O@¢±HäXQ»VtÍÄ=}ºS¦ØµËYhm_;êy}¯ñ]×à9
S©5Êe.Ìª,[¤.{JÂ }~ªÑ~sÖ@ù_Îû¬£u*â FJÕ´[cÅlJVPÐ½rçÎ¢4Ö¢1
r¼%¬)L²cw"¤x.åöß¨zv¨ ¼´­__Ø$Ì¿¡¿:)3E©!îæ2¤= ì¯?9ïuí!%GÎM&¢ÐLIªÇ8êè¾ØLªýYøïn¹6}ç';¼x@%mùÏßY\Çd	ÃiÌÒen6E+mº·ýavgã)<êaènüíþqÿäÊ4z÷k<(·?¥½ª8õ>yofL±%»J(¢o¨ÌÇÂ¹J= äøqPÜîÚØÕñè|RØÈ²»ÑÝÞö"mq¹M£eðâ±eÉ ]7'{ÉmÛ7«zUYÇÝh$Q9 Y¿=M?ÜÍr?ÚÖõ>>ÙÔ¡ñSÀrÀÍM}n§u£Z$ù½i}+>ñEêY<ùo!TÁ1ik^xxãÇAáq¯æd[x Y÷(ÜfàÖºo@f¦÷ÉUÞÉvIU
®ÛIÛñÅ^qÄøÀbø×ÉN#«	§ÜÌC¤R/±FxM'ÚJÒiÁYäQÓÉM4ÅÑq^¿²rÉÃ­ÁÆô]'ólyfðÊð{a-m%«gß;ý:6ó*¹ÅÛWë68âÏ"À»ÐRv
+¦µ¨þ4¡îùÚ©·nB- +T#"æ0"K«<2¯Òõ½~v}""Ü\´¢Þ:ÓËDCX¡søÁ}þiîéaûÈ<ß¿2ì²¥â'«Ï_Ï©zW|ë}SÌðÄ¿÷æ"ÍQx½_O¹#(Ó
,ÿÔ ­²qíìX-1ü5XJË0¶Çà«7Òvp}¬%þíª§:@IÜÔ>~¤@Eª xÄ)l#ÌAØ¯o¿òlÎ´(üÎ û@ÍÃÐnÖ¯*îtûBÓÍhæì¥E]ÖËRe¦ufÆÈ+$ÏøHÿ}ô6M  öOÑÌ@×ù+¦¼×+VHSÂ¤á]ó³£;LBX u_®9HÆ<)^¼¶]´rtæÿ:íÿrñëÚÀý=MJÏv%÷ènTfÊbïóä¸@<f(AÐÓbsÀd¥¶¦Éb³;ß/A*gÌo9°¥cË>Ék=}Ú&dPOlULhxí_9§Êióß¹-à©6sçïêqØch¹Ö¾OJQC½[ï!6á}MôåýyØÏs_Ñ <òEeå8ñâE7ÕtÐÇ(JKµ5nîà¿R ÿYh®m9xÐAd©
³ÙUÉzÖi;ýjëÏj³3äÊ³
qÄØâ*æ	ÑÙ(;NGÆ»*?lä°= ±UÈÝÞv±	èÞ³Æo¥°áºAa9ßiea9x³¤Lh×"Ú²yøZð«:H5½1j?µâ\øt*	ËÔ]ßÛ6üé}µGf
= 6zÅð-2r/IP\ï%¾z%= /õÙ÷ZÀãJ­árhãw#éÉÄe}¡Ü"º+73 ÓT7kOVK8æÓCÊHeÕ¨j= !©VoëK¿^£{ªà!µ(~ýþÄsBNt¦ûksqúÔêò³µ¿Jè°oMïð6ç?;¤ÎG^y ±Iväæ\çÔ®.µ¦0¢È dtg,:²¹EIÙ_°*F-LD= ³JI6Ó¤[Îc½©´¼ÇÛÊl
=MÉsGüÚ<8AùÌèzK³?»IÚQÌu|)_$du©=M8^°GNò²Ñ­0xü= :rº{kîQQ}w¾pòÆ"Ñ#~fðE"+íÜlÒQÄZÃE9ü¸Y\TÞ1XªÝ<á4÷þ¤Wø
ÔYç~æ5X30Ï+l4Æ4Æ4Æ4æ§ðþÖ7KR#?B2
VhaÜØ¡Y&k£Û3ùra¡]HßZÏÕbÆhÓ= ÕdÉA>8²»F6àÇ7ZZv¹\ÕYUÔÚOk5 àc½Úc)[1>8d*à½*eÙr	ZçPh°ë¾ÈW¨Ià¸×P<VÚÓU=}B@(¸kjìéëêì¬«ª,)+*,|]¿o¯¯QøJ¡Âra%EõµÕ[û;ë«Ëc#Có³Ó_ÿ?ï¯ÏIð»sÏ·ª¢rÒ~nÎ¦¶lÌtÔ °¨xXùéI!1íMõU¸ÔâIáÃsñ2ÒT= à À?nî°0Ïhç¦&Fw¸×Wn÷Ô©Í£§¢Î¼ÔHQ;?:> +äÁ±Óß~@°På%Å¸ÕV| ý
ö Õ³§ªÒ¦´8A%K?7JF z;Ï×
2>¦<dt= pH;­FÃT@PÈ8×%<ê±*ÑKwç®*+ý¾½ÂXSFUSÂÎ|ôÈí	æöÖÜ±/~üÌ<&@ûïê¾4Èé!@MF§j³SÇ¥ :D=}ÚîÌ,A Põß±=}'Á´Zº?ÊKKKÛÛp38@Ô777ïï«[uà .00ðï¿ÒU
àBÎÎÎ.0pRk9Ë¥c´{·¥p(ôY0X²²ÛD=Mü³³³ÌaÝ}ýÜÐ$JËÐ]\Ùq_YýÆ4ÆtÆÌÆ4ÆF2Ê |ã!{;ÖóÑ!u[8JêÂq&##;Ì3Ñ#õ{æüÖ¾oln²Þ¦Õ¨p2Þ¤½Êz?º-ÊðÎ1HMJïÖwÀt¼cßLåk]$Qñow^ ¡:ÉøòÚJ]©Î¯¹v¸,ÌÏ9uruÈÙñ§]5¿fJ¿hêB±ÙR})Ö¹xØÔg9w^õÈÛÝ mÎ
²%= N	¦ågJ
ÂrÄ#3?d3Ó3õ¼ÕÆ¯ÿi£®´î&U°4î$½Îãú?¾g
-ÎÎ2&xMNÖ¦·@qÄ£Iõë}$RÝïw~ ¢Baøôêb]«*N¯½8)*LÏ=}rö¹ùò}6Ç¦LdÇ¨ì,r³é^}+)V½X)Tg=}^¶¹û"q#lã»:óÒ¿uzòÖ»KßË
uÄQëÏ÷
vÀ¡@±8ñæÝª&¯¼d+&Ï<c2õÃñRñ¤uN5¼OIV¼Gé(òãêùícþîÅb«+p¿»{­ËÜî1ÍKÛös½¿kÐ±ävU£È1ät=}Ëÿªo»z¢KÙæeKÚÜÑzpó½ËßJí;¤Rá?w ¢Gøó÷ÊþÄ(³ûÀÆ(²+'¿Às:­Ð.2#¨ÍP6£Ï rÇ×?j¨ÖP³øUØH3ø=}Ð÷Jÿ¿mF£¤ë(ÁF¢´Ìë-çKþòòî6Á¾KvöÁÀë2¢_ôô²¬4ö/¿*4ôO?ö¾=MÞÒðPÁEtÌéXqE= LéW¨û]1n¼4Æ¨Ã4VEÐÄ4ÆX@-Æ4ÏtE#SìÇ²U@)#MDI= Ìº®<¶|ø¡Éí¶5þz:*"ÉêºD»Û04;¤çÝLÝ@dFmÿòºFÎªE
NÁÍ#Ý¾$ÅA±lÏKýñ=M¥h åQ)ÞÿÆ96%{È\OwÐAÊ;ºË± ÙøFQÞoõT)ù¿rBÂ¾f·guógÃí×vn­6 ¬ªâó@ ë¥ÙÈg²Îð¼DMewùÖªÐUCfd<¯«xEÞ¦4^w1lO*üõwrÍíÈÏjõ¨¼°¥Á×ê'Îw0¢l¯Gë !½èÂMñO	DMë;µFPM	tå¤W£ðSTx²)Ö¤÷°ÔÆÑ§XÿQ÷ßÿðlÀµÄá^UC¤VÔhGB¯h 2ä©vQDÕRÌÁõ¡c9EÙsÓáà¯t¼åAùaÌ{Èá;¨$$ü	Õ¨-ïüJ£¤j¬â ×\uúYoRB¦w!=}Ð/Q,8e)¢ZYaÀ­ÓÚ2(¶7?¨W§¦Ã  Ó¦(M÷ròÔ}$½£"ñì2àzmºeDàÖuâôÊm°<Gºµw ÊÔu NÊwP(viYY[a?¸ÎeåÂéo,}Æÿª³¦=MôßÂ¦,Ïs N¨Tid¼{¡åò1r
ÿ»Äå3ñäqä¼ Áç21v
ÿ¼Ôå SñèVÒy%lÒ¼w"@òÌw#¤@Îw$Ä@Ðw%ä@"Ró°øÀTm5°ú\e\ÚbÙi¬GF*¿±8?(8¾0HESw(@ÄÏ(V1'L
DEGT
DE?R	Ä·Eóx?"RÄ7EóK¹°E#ä¶R
¨Ï>$2îS×	EChS×
ÈECxS!×ECS%×HEC	$= 	$h
$p
$x$D,(W?Øw<
÷</	ïÆhÔ2,7'9'=}Å'A'EEG9G=}ÇGAGEG¿¹o¿»¿½¯¿¿Ï¿Áï¿Ã¿Å/¿ÇOéÞ¥½||²"¥Ïíþ¥¾¼²$µOùdútûüý¤þ´ÿÄ Ôäô$4DTe	]tå	ee
m´å
uÔe!}ôå#Bd·väMªY©eí±WWÕGï%èV<U5øP?VRÈWøÓÿ-ôS,¨S¤BÒ}ø=}îUëÀK¦7"èQkØ;¬UãÈJH¿
gÁYYºy_;{)áp½¤'W5¼GPóT&@ÌHXEzT!·øET#7ET%·8ET'7XÑix;UáJ~7øÑmø;®UãÀJ7Ñqx<¾Uå J78Ñuø<ÎUç@J7 XMyÖ¡+èM}Ö¢È+øMÖ£+MÖ¤H+MÖ¥,(MÖ¦ÈXVúNÖ§,HMÖ¨H,XºgcYYÚyanLÏSKdá= ;ÜÑz×á;äÑ|Wá ;ìÑ~×âÀ;ôÑWâà;üÑ×ã ;ÑWã ;Ñ×ä@;ÑWä= <Ñ×å<$ÑWå <,Ñ×æÀ<4ÑWæà<<Ñ×ç <DÑWç <LÑ×è@<TÑW(= KÜÕzØ!KäÕ|X! ?LîR$Õ¿×8òX%à? LþR,ÕÃ×8óØ& ?ÀLR4ÕÇ×8ôX&= @àLR<ÕË×8Xx¸ØøÖT,OeyßZºQt4v4Æåö-ÇÃ¦ÆôºÆT«ÄÕ,,U¬ÀïÌ~·µFÒ2;Çøa/½÷d¢DµH{<EÉøÝÄ!~·ë¿é¦ÇOçìEJéÈD%z"%BÇPÚ,uIñx]4÷/¦È¶<áÕüÆÎè¨ÞÁ8Þ÷ðNÇÉ
JÏ8ð{=M´E«¤1ÇJËìFN	ÈAÇ4ÉÀà¦Ð)<×mu@ÒÛ//ª^1?	(ÝÃ
·é»ÙfÇÍ«âbÏÒ°{Î±;!ÇN÷c¬ELáHCºÞz aÀ, Ã%ÉïU}¡ü'PÖÎö¼cæ6pÿ.pÔªÚ"4£¦=M4Üoþ,«ðÔ®ÿú§ÌôP®óÃ Ö§¨¶>¦3Ex,2÷M¸	Ð(÷'YÝl}·IQ(h \ûÀUdX2ÏyÃÈ¹óÜ%k¨ôªoâ°ÿð¢¯bïþ"L+¾õ¾ë­BÀóÎ[ý1ÅjKtÆ
Ç#N2ÃztÇqtÈ½.SôÇrse ý[v±{Þÿ±|­ço|ihléûYÅi}¬üú?ã«,±¤~-0­ÄÞ".ÃýÞ;íCÂûî«.sÁÿæº(÷IÝ¡lMØC)â802QÎgXg_¤¬ý§	Ñ²#bð}¨îZ»ý¯2#äé¸ÏÚ»¾*y­Ûun³£ªùàyÊîÃmª£ûý­¬0¸xÏ^z=MùØkwR´rPY|°i_YÑ'Æ4÷Ð(Æ41Æ4Û33Æ­&XCÏëRáËsÎ´ApW±@raö}OkDâ>Õ»z|okâB=}xR¥»;èr!@WA0VèÒJßõ´Ò§ø. E¼MºÛ*ð~#kÀâ¦Çæf??,MïÂÇ®8ÿºÐ{ÑÑÁ}Í½½zèð¨¤>þ2j®WÆv§Rw{Xª«ÕsÞðsð&?¾L¶tuôFôF A¦,øÇ	µÌîSÏî#à®òÅhÇý£±^ÞM¥Çÿë#¿ííï= ÏÓ§e4=}dû|$66ÃóõDöDõ%àe½ßd=MðA/¸¦VÙCª>Ã¤-æ -þIììk²Â5­§oÙ¬w·r5q1i«p3x=}4§¿®9yÍÐÈ(¼®Ò-ÔÏ33N3æ1¤æ¿ñ%µÅ8Õ*6³Ô.ÀÄ¢Îå¬fÝýÝ«õ "¼pÌNzÚ6ÚÚ&zü×<äÅ ²>4b¶júiki']û)¡~Þe­Ðaüä[ex¶ ºþÄ¹½»ÃÇºÂ¾Æ¼ÄÄÀÈH9AA=}ýLTôËsÿøs¡²X_i,?ª+®"¢ð¹õªÍY<OóøC¥§ :SÓæÖã&Ieyßób ðØ_}ß¬"=M£Þw°ôÛZ©LôPm¤ÂiXAP=}S=}å÷)P¯»Y-ÞÖ6$ÂiòO@uòxè,JEFe×/ Å[áX$Ø&TG$Â¡}8Y`});

  var HEAPU8;

  var wasmMemory, buffer;

  function updateGlobalBufferAndViews(b) {
   buffer = b;
   HEAPU8 = new Uint8Array(b);
  }

  function JS_cos(x) {
   return Math.cos(x);
  }

  function JS_exp(x) {
   return Math.exp(x);
  }

  function _emscripten_memcpy_big(dest, src, num) {
   HEAPU8.copyWithin(dest, src, src + num);
  }

  function abortOnCannotGrowMemory(requestedSize) {
   abort("OOM");
  }

  function _emscripten_resize_heap(requestedSize) {
   HEAPU8.length;
   abortOnCannotGrowMemory();
  }

  var asmLibraryArg = {
   "b": JS_cos,
   "a": JS_exp,
   "d": _emscripten_memcpy_big,
   "c": _emscripten_resize_heap
  };

  function initRuntime(asm) {
   asm["f"]();
  }

  var imports = {
   "a": asmLibraryArg
  };

  var _opus_frame_decoder_create, _malloc, _opus_frame_decode_float_deinterleaved, _opus_frame_decoder_destroy, _free;


  this.setModule = (data) => {
    WASMAudioDecoderCommon.setModule(EmscriptenWASM, data);
  };

  this.getModule = () =>
    WASMAudioDecoderCommon.getModule(EmscriptenWASM);

  this.instantiate = () => {
    this.getModule().then((wasm) => WebAssembly.instantiate(wasm, imports)).then((instance) => {
      var asm = instance.exports;
   _opus_frame_decoder_create = asm["g"];
   _malloc = asm["h"];
   _opus_frame_decode_float_deinterleaved = asm["i"];
   _opus_frame_decoder_destroy = asm["j"];
   _free = asm["k"];
   asm["l"];
   wasmMemory = asm["e"];
   updateGlobalBufferAndViews(wasmMemory.buffer);
   initRuntime(asm);
   ready();
  });

  this.ready = new Promise(resolve => {
   ready = resolve;
  }).then(() => {
   this.HEAP = buffer;
   this.malloc = _malloc;
   this.free = _free;
   this.opus_frame_decoder_create = _opus_frame_decoder_create;
   this.opus_frame_decode_float_deinterleaved = _opus_frame_decode_float_deinterleaved;
   this.opus_frame_decoder_destroy = _opus_frame_decoder_destroy;
  });
  return this;
  };}

  function OpusDecoder(options = {}) {
    // static properties
    if (!OpusDecoder.errors) {
      // prettier-ignore
      Object.defineProperties(OpusDecoder, {
        errors: {
          value: new Map([
            [-1, "OPUS_BAD_ARG: One or more invalid/out of range arguments"],
            [-2, "OPUS_BUFFER_TOO_SMALL: Not enough bytes allocated in the buffer"],
            [-3, "OPUS_INTERNAL_ERROR: An internal error was detected"],
            [-4, "OPUS_INVALID_PACKET: The compressed data passed is corrupted"],
            [-5, "OPUS_UNIMPLEMENTED: Invalid/unsupported request number"],
            [-6, "OPUS_INVALID_STATE: An encoder or decoder structure is invalid or already freed"],
            [-7, "OPUS_ALLOC_FAIL: Memory allocation has failed"],
          ]),
        },
      });
    }

    // injects dependencies when running as a web worker
    // async
    this._init = () =>
      new this._WASMAudioDecoderCommon(this)
        .instantiate(this._EmscriptenWASM, this._module)
        .then((common) => {
          this._common = common;

          this._inputBytes = 0;
          this._outputSamples = 0;
          this._frameNumber = 0;

          this._input = this._common.allocateTypedArray(
            this._inputSize,
            Uint8Array
          );

          this._output = this._common.allocateTypedArray(
            this._outputChannels * this._outputChannelSize,
            Float32Array
          );

          const mapping = this._common.allocateTypedArray(
            this._channels,
            Uint8Array
          );

          mapping.buf.set(this._channelMappingTable);

          this._decoder = this._common.wasm.opus_frame_decoder_create(
            this._sampleRate,
            this._channels,
            this._streamCount,
            this._coupledStreamCount,
            mapping.ptr,
            this._preSkip,
            this._forceStereo
          );
        });

    Object.defineProperty(this, "ready", {
      enumerable: true,
      get: () => this._ready,
    });

    // async
    this.reset = () => {
      this.free();
      return this._init();
    };

    this.free = () => {
      this._common.free();
      this._common.wasm.opus_frame_decoder_destroy(this._decoder);
      this._common.wasm.free(this._decoder);
    };

    this._decode = (opusFrame) => {
      if (!(opusFrame instanceof Uint8Array))
        throw Error(
          "Data to decode must be Uint8Array. Instead got " + typeof opusFrame
        );

      this._input.buf.set(opusFrame);

      let samplesDecoded =
        this._common.wasm.opus_frame_decode_float_deinterleaved(
          this._decoder,
          this._input.ptr,
          opusFrame.length,
          this._output.ptr
        );

      let error;

      if (samplesDecoded < 0) {
        error =
          "libopus " +
          samplesDecoded +
          " " +
          (OpusDecoder.errors.get(samplesDecoded) || "Unknown Error");

        console.error(error);
        samplesDecoded = 0;
      }

      return {
        outputBuffer: this._common.getOutputChannels(
          this._output.buf,
          this._outputChannels,
          samplesDecoded
        ),
        samplesDecoded: samplesDecoded,
        error: error,
      };
    };

    this.decodeFrame = (opusFrame) => {
      let errors = [];

      const decoded = this._decode(opusFrame);

      if (decoded.error)
        this._common.addError(
          errors,
          decoded.error,
          opusFrame.length,
          this._frameNumber,
          this._inputBytes,
          this._outputSamples
        );

      this._frameNumber++;
      this._inputBytes += opusFrame.length;
      this._outputSamples += decoded.samplesDecoded;

      return this._WASMAudioDecoderCommon.getDecodedAudioMultiChannel(
        errors,
        [decoded.outputBuffer],
        this._outputChannels,
        decoded.samplesDecoded,
        this._sampleRate
      );
    };

    this.decodeFrames = (opusFrames) => {
      let outputBuffers = [],
        errors = [],
        samplesDecoded = 0,
        i = 0;

      while (i < opusFrames.length) {
        const opusFrame = opusFrames[i++];
        const decoded = this._decode(opusFrame);

        outputBuffers.push(decoded.outputBuffer);
        samplesDecoded += decoded.samplesDecoded;

        if (decoded.error)
          this._common.addError(
            errors,
            decoded.error,
            opusFrame.length,
            this._frameNumber,
            this._inputBytes,
            this._outputSamples
          );

        this._frameNumber++;
        this._inputBytes += opusFrame.length;
        this._outputSamples += decoded.samplesDecoded;
      }

      return this._WASMAudioDecoderCommon.getDecodedAudioMultiChannel(
        errors,
        outputBuffers,
        this._outputChannels,
        samplesDecoded,
        this._sampleRate
      );
    };

    // injects dependencies when running as a web worker
    this._isWebWorker = OpusDecoder.isWebWorker;
    this._WASMAudioDecoderCommon =
      OpusDecoder.WASMAudioDecoderCommon || WASMAudioDecoderCommon;
    this._EmscriptenWASM = OpusDecoder.EmscriptenWASM || EmscriptenWASM;
    this._module = OpusDecoder.module;

    const MAX_FORCE_STEREO_CHANNELS = 8;
    const isNumber = (param) => typeof param === "number";

    const sampleRate = options.sampleRate;
    const channels = options.channels;
    const streamCount = options.streamCount;
    const coupledStreamCount = options.coupledStreamCount;
    const channelMappingTable = options.channelMappingTable;
    const preSkip = options.preSkip;
    const forceStereo = options.forceStereo ? 1 : 0;

    // channel mapping family >= 1
    if (
      channels > 2 &&
      (!isNumber(streamCount) ||
        !isNumber(coupledStreamCount) ||
        !Array.isArray(channelMappingTable))
    ) {
      throw new Error("Invalid Opus Decoder Options for multichannel decoding.");
    }

    // libopus sample rate
    this._sampleRate = [8e3, 12e3, 16e3, 24e3, 48e3].includes(sampleRate)
      ? sampleRate
      : 48000;

    // channel mapping family 0
    this._channels = isNumber(channels) ? channels : 2;
    this._streamCount = isNumber(streamCount) ? streamCount : 1;
    this._coupledStreamCount = isNumber(coupledStreamCount)
      ? coupledStreamCount
      : this._channels - 1;
    this._channelMappingTable =
      channelMappingTable || (this._channels === 2 ? [0, 1] : [0]);
    this._preSkip = preSkip || 0;

    this._forceStereo =
      channels <= MAX_FORCE_STEREO_CHANNELS && channels != 2 ? forceStereo : 0;

    this._inputSize = 32000 * 0.12 * this._channels; // 256kbs per channel
    this._outputChannelSize = 120 * 48;
    this._outputChannels = this._forceStereo ? 2 : this._channels;

    this._ready = this._init();

    return this;
  }

  class OpusDecoderWebWorker extends WASMAudioDecoderWorker {
    constructor(options) {
      super(options, "opus-decoder", OpusDecoder, EmscriptenWASM);
    }

    async decodeFrame(data) {
      return this.postToDecoder("decodeFrame", data);
    }

    async decodeFrames(data) {
      return this.postToDecoder("decodeFrames", data);
    }
  }

  assignNames(OpusDecoder, "OpusDecoder");
  assignNames(OpusDecoderWebWorker, "OpusDecoderWebWorker");

  exports.OpusDecoder = OpusDecoder;
  exports.OpusDecoderWebWorker = OpusDecoderWebWorker;

}));
