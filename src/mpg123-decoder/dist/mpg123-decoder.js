import NodeWorker from '@eshaz/web-worker';

const t=(t,n=4294967295,e=79764919)=>{const r=new Int32Array(256);let o,s,i,c=n;for(o=0;o<256;o++){for(i=o<<24,s=8;s>0;--s)i=2147483648&i?i<<1^e:i<<1;r[o]=i;}for(o=0;o<t.length;o++)c=c<<8^r[255&(c>>24^t[o])];return c},e=(n,e=t)=>{const r=t=>new Uint8Array(t.length/2).map(((n,e)=>parseInt(t.substring(2*e,2*(e+1)),16))),o=t=>r(t)[0],s=new Map;[,8364,,8218,402,8222,8230,8224,8225,710,8240,352,8249,338,,381,,,8216,8217,8220,8221,8226,8211,8212,732,8482,353,8250,339,,382,376].forEach(((t,n)=>s.set(t,n)));const i=new Uint8Array(n.length);let c,a,l,f=!1,g=0,h=42,p=n.length>13&&"dynEncode"===n.substring(0,9),u=0;p&&(u=11,a=o(n.substring(9,u)),a<=1&&(u+=2,h=o(n.substring(11,u))),1===a&&(u+=8,l=(t=>new DataView(r(t).buffer).getInt32(0,!0))(n.substring(13,u))));const d=256-h;for(let t=u;t<n.length;t++)if(c=n.charCodeAt(t),61!==c||f){if(92===c&&t<n.length-5&&p){const e=n.charCodeAt(t+1);117!==e&&85!==e||(c=parseInt(n.substring(t+2,t+6),16),t+=5);}if(c>255){const t=s.get(c);t&&(c=t+127);}f&&(f=!1,c-=64),i[g++]=c<h&&c>0?c+d:c-h;}else f=!0;const m=i.subarray(0,g);if(p&&1===a){const t=e(m);if(t!==l){const n="Decode failed crc32 validation";throw console.error("`simple-yenc`\n",n+"\n","Expected: "+l+"; Got: "+t+"\n","Visit https://github.com/eshaz/simple-yenc for more information"),Error(n)}}return m};

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
                wasmString,
              ).then((data) => WebAssembly.compile(data));
            } else {
              module = WebAssembly.compile(e(wasmString));
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
          bitDepth,
        ) {
          let channelData = [],
            i,
            j;

          for (i = 0; i < channelsDecoded; i++) {
            const channel = [];
            for (j = 0; j < input.length; ) channel.push(input[j++][i] || []);
            channelData.push(
              WASMAudioDecoderCommon.concatFloat32(channel, samplesDecoded),
            );
          }

          return WASMAudioDecoderCommon.getDecodedAudio(
            errors,
            channelData,
            samplesDecoded,
            sampleRate,
            bitDepth,
          );
        },
      },

      /*
       ******************
       * Compression Code
       ******************
       */

      inflateDynEncodeString: {
        value(source) {
          source = e(source);

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
                  true,
                );

                // destination data fills in the rest of the heap
                puff(heapPos, destLengthPtr, sourcePtr, sourceLengthPtr);

                resolve(
                  dataArray.slice(
                    heapPos,
                    heapPos + heapView.getInt32(destLengthPtr, true),
                  ),
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
          i++ * samplesDecoded + samplesDecoded,
        ),
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
    outputSamples,
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
                      : new Uint8Array(data),
                  ),
                );
                // The "transferList" parameter transfers ownership of channel data to main thread,
                // which avoids copying memory.
                transferList = messagePayload.channelData
                  ? messagePayload.channelData.map((channel) => channel.buffer)
                  : [];
              }

              messagePromise.then(() =>
                self.postMessage(messagePayload, transferList),
              );
            };
          }).toString()})(${Decoder}, ${WASMAudioDecoderCommon}, ${EmscriptenWASM})`;

      try {
        isNode = typeof process.versions.node !== "undefined";
      } catch {}

      source = isNode
        ? `data:${type};base64,${Buffer.from(webworkerSourceCode).toString(
            "base64",
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

var out = text => console.log(text);

var err = text => console.error(text);

function ready() {}

/** @param {string|number=} what */ function abort(what) {
 throw what;
}

for (var base64ReverseLookup = new Uint8Array(123), /*'z'+1*/ i = 25; i >= 0; --i) {
 base64ReverseLookup[48 + i] = 52 + i;
 base64ReverseLookup[65 + i] = i;
 base64ReverseLookup[97 + i] = 26 + i;
}

base64ReverseLookup[43] = 62;

base64ReverseLookup[47] = 63;

if (!EmscriptenWASM.wasm) Object.defineProperty(EmscriptenWASM, "wasm", {get: () => String.raw`dynEncode013db35ed46d@ÓU~Qé§Ê¤NLRÿxXL;¯Úb+\L'ÔWà(ÈAýÌyyÁoB0Ø_ï;ÔÌuNÒÇdlº¹M¨ú×Ex³= kw^Å9«î¢ä=Mã9G9¼ûô=M:Eêåxe·³äñPg³gqôü ßçR>GËbY"eU®I¶®ÁÅP¢OäÝ¹WØ)¨ûa Ñ¦B©kCCó©JóÔéC´BÄ/	U¯$]ª~ @'Þz  B/úf
û+lo'°ýäâb0ÀmSãïNYÏI^Z^J§¡EÆén­ñ­Ûhy²D¯ ©ÕÍµ# $ñË¡Ùni#uÄR= $?þé¯F¨w­pø}Ù®¯®¦6â¢ÀL5Í4T#Øî..³©ßX*\.nÜ­'fÜ.v-b.r¤-j.z,÷º$Dh>îáØ£a¶áòÓ9ß!â£+~Õ 
ø²ïù( £&XñÏtÓZ$ÕV¹nppppp0<´ðïÌ~ä&'''ç'+'ç¼£#¨»ºé»Uxmºðe'W8nÂ¨è´N7NXUsT÷8§ì­,÷³Ô¹d"Øü6~«uìöß8ËQÔ:GK@ëû~
#c ð0·bèJZq#Þ®Y*þN8n¿¶0¥Ù¥ní´{DðÖõó+"kÇs9¥xN´ûm³º´1êal±¯ÚæîõGIú?'ÉQ(²	Ñ¡z Ïþû{4¨ça-òlÃÿK>®Ø*2¬íÎÅfÈó0:£i
l5ÈT22T8d]ï¨Î:·<	W´¦öÁÜe' xÃÇ4+ªAÉvo	¤'cPøi«Ô?ð¾6tGÑ?îöãOú=M#­ÖÃïZ0¼J9¹ãê]¬pÖÖÏ[³-	rz	Jb)4,åW¸ æ ê±¡÷Ü©9ø~¸¼²mÞN;Ê"_ªzgæ=U2e|ª£ûf¦tböû5ålp¢e6kÓÍÂ¼óÞçwJçaÒ§TYòZ
psÈöÑ3)u÷¼öuÈ= MJxÂ($8áçk×Óuã8ïì	ó¢h¬{ÖZ¾Q1ôÄánN¨1È á,RD:ðm°3­_Ï)Lc×Mm%¦ëÉAM»õîüù'ýEYGcÿÄiµåäÇÀñLÔk("g(.uI)ÖÁÄÄµów'þ=MþWµmAèDÀ0Öý~Ù?Ò,= <½YÃ>vöK¹iâKæ>þìéq·Z=M·ä·JWoÝÚY=}ÊVo&z5°­¢Q9ã&[»ÂØÎ}[¥á Ý'×ÄðíÚÄïbC1m´¥Þ ßÐ0rÅ^@= "jzJj<á(	1^Þ÷ìNù''ÅØxBymw	ýÏKÄpË×jc]÷ÖÌxÄ-¹5¥KÄöb®r\°-ÈêJØgëÿ5âg*ØôÃõ¯l ~'âëÕ@Õû±ì=Mà{Pó¥Ô=M#m«ÞFÈâq"tm~	GäÁ1·gqp©Oáa6)Fê¾e£Ü8j÷Õ¶^8ø>6ü1Ö÷mteÀâÞö à/ÁWv;UxyxXæµ8¤Û°æ0DõÒLÙxd&@[Hìé6vU¸e.g»	A\û/ëèÊgËÆö>ä¢|.:ò¯LáýÂØé´ÆÝæS&ùæG«5ù®±ÇÁxÂÿ^îZ,ÝDAReÂe$guTc  á5W¤¿=M$?I¥ÏR§YÄÖí,]ìQ2ÞBS#:Õ¡[%7|Z¾%äW'¯ü=}/²ÿ® ®Ê.,-P)Âpêéíz=}Ü9ÔëÄõ;CZSOZr±Àèc"9¤< 5= -»ñrV¤ïAF¼Ø DòVªé[ß$ëCñ­æ]ÃxGtÈ2õUÁ3å7d¶iöÑY»ÎQïJqç}õ?ç¯ú®õõ{ê3¸	µeaFÜIÂÛùõÓZ¤ç½yû×¨ÈB]í¥,v¾7g<dÇhô e§£=}sãÀp¡UÚ§:¼ÛÕCZ	ÉóÈÖ­6i¬&	 ªxÜn¤*ÂµÝkY_ ÈHÄá4°NùûWæ%U×n" T ã)®ä°ßÀW/ÅÐum¸Wá|úÊÂDC¹Vzò¾
!£Sªå©yÙoiï3%Hî¹õ:u¦$þÐv«âÞ9¬oêÒ®´tQ¬+§%ævwâYB¸IlÈ(¬Óè_pa²íV²×Ý°æClÐÏ)¸¨2=}-ÍT£ì³ èyFulTòzýjÚçQ$dqÏ&Çá^&(¡çåêL¶÷¾²¡hq:¤­=MÆ*UOc8Ì~Ý Qú2#[dÃ8óöTCéåò¯#ÀÅbêfÙÊYXo¿÷Ê­ÝY¿g/þÉÆÏ½áè¹g'êyR#ï·èåÿ%Þ×ÏfÞ³Û²G´Ä÷w[;F¼§ ÉÈU¬#W8¶ÿ#:/tâJ¥Ä¨Òsò¡~fneº"ÜÎÎ~¦s×m¥
À+"ï¶tÃªó5ô= ÿ##]n¿UõÝv©vY´qÝw)ñ¡Å"³Þ<ßw¾ ¶ÞPïé úí[¿O= %rñ¹p\È¹YJµ UT¸¤5´MPn)ÄÉPûl=}­Èü +ªGÁ¶õÃx¶{tNº{Ù%¹UøÇÜÖ}];ë*.²é=}{¯f¶Ê«ÚxsÏXkC7EIÐÒN*Þù2'µ8@g¾´H²·¸Ç çÆ|´É½&s©A&ý®®±gÕóùw+=M!£=}dèKôÑzL¢õâÇÌc\° jr)&½¶þ5$É&æ[SÃ­Mß¸Fü¢>üÆ[3¯T9­´0óïæÂ#iES+JFoHlSïtÀi3õî@Ì¬)#2YåÔéqz8ßH4Þ.KËÝ|[£´Fât:Të¨è[£Ï8WÎtàCßGÔ FÊXá*ümýõFvyÕ»È wBèª)W¬ÌC©ºªYC¢þf¥þ´büS5[<ëô¨ÂÀ·µÆ(+lyné»NÇ4ÿõFð³®ó¢ìWXÕ§YClBG#©×îæ°"ñbr¸½°Â(ÿRÞz§ýós8¶O£ëãõÚ°î¦ãWX-?^þ±'õ'AèÔå©¦x=}´.(Cqòåi)x.KÖ4¸Lv)AGªù§£Ç /uÇXêúKSQÃW%El ªî¬>8ý@ZSFÇw?ÿÎ_kËQ~á'ý}röà¾wjKY4y	Øh_b0_27¶07z¬ëË20#7y¬«Ë*0#3v¬+É#
= ¯¢¥Õ¤®ÿÖÃ"ú3k+=}Y[GÑ´ãóÊºçP<.CÇ¾[f LÑ¢¥,îo.ÿ¼¹[,V}Æ7#3*l¡ü¨µ6¸./h°t%Õ¢ÍÊñ<Âl·3\iý(xhòûMl3Ly2"ßûî¶ÅÛ¨< l9.ÃÀI7éIòq´ |#òÏ5suÞËóm¨ä¶% ~"kmÖô¼üíyÉþïh+ÈþE»7tôÜY6ò9
fhìjÆ¥Á:»Ý40DûJ@TéÔ×IÄß{jk-Üg¤sRºä¶= Fì ËcÝÈÝKÞúgª©cKÃ¹«(õw
3­Ó@Ùå)ê¸q.±þë~(äjº5/Ü98;;Zlú&²ðü4!ôê»(ßÔ¬»:ûðj!ÿ8<6:äÔ5:ÿ¡dñV¨¹U=Möl:Ì¼/ÄüDg\5\5Êüâþý9 z¼&âÄ:þÒð¤üØ@Ç÷;S&Ø~IÀA½9<
Â:´|Të5¼·ú½Ó¬ZWôSô2õH"ÙüøåÀõkÅßíÕ¢+·_Ã1H\Wý=}5=Mî×#è:jéz0Ã p¿{;,Ñá5= tî	Â_³÷õL ÄÅ¼+£ýàÅÓ6:ÔLPmü=}Ä,cý5ÍîýS:ën (î\áðZê]áãy°ej= Bò@²LVy¼i Êá½£%UeÈJçJjZbÃ-´:æÌ%õ;NÚy#¸´Ä©ºÀ÷_ù=MV§æ´S¬¢)²áÏúåÅ2g~ÊWìJÛRhiPt¹gj<6oT×j<lðQF/ÿ= XçQº|X²ºÙE÷ûüF¿øB9ÜºU²Þv/ÜwX|þDÚ83ê¬ºw8ªqú²}sÇl·aüté+¶¤n®Ã:Löu= x@°ÃÁÍû¹µû³ÈywËìÍ²\\ÕÞ¡d¹=}Ø
cè!ÚZæµ«,dOP|Î©$÷
»_V¼W)½8rè
³«3»_¦¿/¯t[òëËÚ%¼DVÿD©{·\=}:4^ÙËMkô¸}ØÚ?ªi\
(Í±ïñ*ïô¡¡5En9±ÛcÕ7¤º(¼ýC/&ü7à¼Wú4Äjm^j:ª\<¼¶"$½:l,î²"4ìùïí@ûöl7Ùx<6ýô !Èû¼+3¤¼·^cçz "ñûc8»àjRÎÇrã?gÕ= ²ÊæOHBþªWÍýI?íÎHÿ<®ùD·ÙÈåXî×Ðµ 1¦cN_6qÉáÅg5wX¨/Tø¶÷u½ÎÑã?Ò7+p	¨te$èAÔ0ÇîH½Ië¤ÔÙØ¯;Ëm,øÏ¥ÌURæö= ãVæ#N2wv¢7¤ ±Ë°ü¸zS}EdMýÑM}:9L$;þI tÆ>ôîõ(ï×ð1 Ó
k.ûRyí?ÂFN#Ü«Æ6F?};g~}¦óñrë'ÈlÒÂÛ#äª CÃ?¡MÕÝÁAY^¾k^¾Ö¿Aw%]NCß¿K{¡cýCy§«
è¸:×  Ûr±­?:PamÉ<z¨h²º6¼âßéó= ]'£Ct p£ÃÄ¹Uç°ÓÖÖÖÖÖ6Üí8Z		-DÉ×ÔjÒYG¨ÝVðÜG³Òfb¿äÓoeÑó±ÆÇ#eÑï£fßïÈ/¨ã_Gg¨&ÌæJ_ß×ÓW2ÖCñYmÌÃ¢§¥Ðæ¢vß¦W§ÆØæ åIHåpçmí#=}ªÉoêÆÜ~Sãé	êj]ÈY[ê0]ÌoÐkpdÝÅ[§v)OÍ\JL1y¥O£}FÎ!À¬ÛÉ¨ñ-)I{Æ×þDp[ùPrPþXpVùOrþz6ãYyNrúÂ¥qJÀá¿ÜùáOîÌGY9Sîpia¿ü_I¦Ó¦KÀøE!W]ÆKDLµ¼0?kµa? ^jm_tµ¼NÇn¹F^Ô(JÞBDvíih¥éØßMó±VDnÀÉua©N'ýÈ=}®±~Ë÷MÄ¹£¨+8¾íÛ*Ó.|Â×ÐÄ!ä¾AgÉÓHæåÃyowßøËEWjÝi&åÅyooßð/Î(ê¨aQIùõ}L®MË·{àá¡Ñ¤ïm% ÞÉAYÿHHUu1ÍÄ©GJi&>vþBv=}Ýa] Ëñ#Ö·"CoD@lN/40<D¨6MjJÎLs$ÙïÙLs(Í@âÖ!¿Qí)ÕG¥= Àã±ÖjÄ¬Î(ÄM³õ#Ì1:-Ï¤/må¨ÑÖgÕ}S8aå+^Ë¨m-QN¢®æ]&eæá)ê§RÔ¾¤¨Ûêfhý]¾ñàA}ÂÑ£/4)MpH@ìMÎ¹ºø!b#Dÿé¤NCj±±¶T¯eª®»}Ú´ìx\= _ú
v*'Ú´¸óFCÓ´7tä$¶<÷0N_Ù bëkxÚ4¸óVC°"^mób0P'¹ý÷0^_óvÌµÔNËõDµ±ý¼é¹´±RÓ´²µÞÐ½Êþõ÷>ÆõFyNÔ³}uË°Ù´ ¿U=MÔAÏd$ôDÙ<=Mí¤KÙÚ	AD¶_ð~XývØ0,´è,KÀ@Yúëë­(ã÷²,*c¾1zæ·ú¹¹2èÄÑJ®e6d%ù*D¬BÀÎ Vßå×8uËÜùù4S£àð¾»ëÓKï´åËyUt´Îúe2»}§ úO4gå«ICÀnôQ^= Ð:?»ÂN}j­4V,µnç0?$ð×÷2¼ÌÐsÅ~3éW à¹¦1ræÜùrÂ«ìH¿y]Yõdtþúª<xY%µLÇ®ö 5Ûz&DgudÄÿø{ì/ÁüçþÊ X0Ê£«-¿ððBZÍJ.µä=MLvµ*UeS«zæÕÖa"8g¾þëzáCí=}¯Ùh¹0Á¦7áï O¬OlQÎZÔ âá[ÕËnnþ;(E·×±{ç1hAð½ù±7S¢43ä'Q>vï&»L!ú?á=M^æOü;Ñg_v=}«yd!¡ÆíAÿÎ(Å}x»CÙwÁ>êªY¬fQ2Ë÷¨ß@= ÿyáKÝÌx¹4áÙïÔ(ÅNõÃ= z8ÌG¤~íY´ÚÑvúÈElñàÉå©ÂÛir¡ì®=Mb"Z*Åpa3_è%:ÿÌÑÅJÎÓ_!©5np*?Ñ3+3aÃ+ªßIH³3á§ðw%ZGíúÀ2§qZã¥R§Ï«â@æõèñqF§ü1lNzÿFä|ìüe£oé¢ÑôtAÈÏ§ºJè®|?Í8¢3_&C~óëÅ¢
Ñ^;ñø­9gÒks¨þòÚÚÚs¿qýyÚ(ÙÅø¨wÚð¹îkY|¸ðïÛêù/3\þ¯[((+ÍæÓ Þ~»i8LÁ1Ìò­Ç°äxÌ{%>tpÒÕG;Ì3nÈd{AS¶óã¬Ê0!ZN0±¦Ø=MÀxñÞ¦/r³"õ éæ£Ã$vç%n|«OÞîß;Áã_Ö8
­Ð¤¤Â×_¥2ßSëûçñµÙqéÏ=}³ØÓ?)¦fE g|1qÕÞl¥Ü¼5]VF¤Ð«oF
Ð¬$ÞÖ76PGËl§iÐQm¬é3ÖñMd²¸«= íF)¼ïHØfN&ËoÌÞ!YYwÌRëæ³Ó-ßZ;÷Q~ÜRLã1*Àró¦AcÄ>N©ÉÏogÊ 2ÜðÇõÙ/{ +ÌÚíí¬)Q119bl§ZßÝm§N¡O[µæ»8öèýItg§Vn8Qm!áÑzÓ²µhho'?,y£ºqÕkÓ¸î7~NOH®v\"¸º~iÌ+Ý´óÔLO¶XÊkëà%_1ÚÄÑÛñ,g¯'D,©f-= ®?Ç*ÅTØE[³RgÏD´V|ça¤Ç³= xÙåS8Í)ÌnïÈë")r= 2·®òËD¥ñðè9º+»§ý"öç
Úë#èJ 8óÀëªcØ 6;BÙ¤´>©T¦ué,,ê]ÞñR¢5TùÕ\7Ø}÷ð7H®TÉnP}oÈY®ð¥J)Ü¼~FRØYËiy%sc7?þðîÅÈ «ÓêãpÇSc¸b¥äKõ-â:4=}wT¯êe&M¦øÈ»2B*y#wÏm	T=}= (À¡³b¸1«¶-H³¹¸ØR1÷ªÔúïåo%= +R= %nÈé*÷BÌ{ÿ!$,cÁ¹!ì=}ÖóNïú(ÂÁ¼9ïQnÞ?b±@e=Mº!Ê=Mi½=}½Íhø9ÚîÝ¯%íêÇö;Rg³àJÓ=}Dò2õ½ï"åã¸=M$·¤)¿tÜÑB¦ü(ÉÁlÔá¨N: LDç¬4ë \*êq·Ú"+³×B=}ý½*ÒOµVbþ=}ôfMZQûF=} ÔÕ	À[@ó¾ë÷		ägç,ôhpÑ/Ë=}¹>= -â´ÁI¥ U&¬£Õàp!·]Qoþ/1(
1VÚOºK¤	9ÄÕàgdOxÏJDÖW1/·Üîf4ÛÕæIÊNgEn³+#KXïë èëÌF\Ü3VvdNç«OÞï¨&
ÌOñÍå÷ÁGÁ©©¼O	xãºGCÏ3æ¹äO¯ÅÒâb¦Üî8azavÂEüñoÆa^ôlçX¤qîxÖåti( ¡{H7-º=M Ä*ãoZé-­7Ü2VâwÞ7vÁl¸.î"tûöúÉÝÛ<p¢&Ðpösïlð#¯·áL#´»¸2¬ºmøþ p1?Yî6t<= <üÐ	úêIÍn#z]¢úá¶¤ºTåA£ÇdÚ½PcicgÆó<kJ1_e¼sQÜÛ±ú9\øJ |zw¹Éù²GQ3³[°R¹¬fç¤PîÀñ¯¡vàaÖ: c~ÿÑÚ|_ä$÷Ja*ãq[ ©*é«pD¸¬Ø ³OYÏ¼îÆ"f'åÑ fÊvs¼@Ûõ)Á»%{§Ç©mP;½F6¥RÔ}¢xÝ,ÑPëD}t|.rEpûé. V%«QAò­	³#î¤ÙÆ´ÝÀ	ûp*SÓ>Îø/"ù±¯5º½Qöó>^!R1l×§ÂRJ°yì»fß È²d)Ú ³¹ÕTÞ¤¯Ì,RµKÁat.AHvôðÂý³8xº	[»v¯÷7ËúØXF<@¯{açMXù@^Ën3Íãð©l-Ç§Ñ8=}n¤+àâË eø¯qýïã#¹w¬Uî:4ØCX?¶KåÕpóU!àO80R¯/çYQ/RãC CJ«w;&ûïÕxUïY:=}^1FøhVëfèQÚbâdÊÎó1W@=Mÿ?rWéOgO*s}A¥/$ÂBJ;j[SÅQþÈkÆQé=MjõïDúüEPs¡×=M
Lua.åïî° ¾kBïü\ÒaÈ5ë7Vpc¦lc#¢j*³Ãd®S6Ê3= hÛ9 Äöûöw/õÔq£ÝÏÄFêfÄ¯R¦MwÊ®CUúãÿqñm³+PV@¬lîmcZ
ðß¢Õ½Ñ	åóæ²ÊBIêÆÿ¡ä[AÁmÖjfKÉ3m@dpvh¦1*ÏõªCP8­ßPb	^¨ÅÌ$Zá2%CªÐFâ!çMèÃÓé¨ên°¬´´ÆcP= ÓÙàõÝ#ÑT/!ÃÞÜHØc&Ö³õ¡Jx2LÎFõûd¼Åß¥ º 5¸:Ñëoéj8ÄÔt<¬«Ì÷flg§ÛÛajìWHsÛ×G
2ã*=MHWâú"W2:{9ìRI?Õ=}ÒZÑÙÛï"ÿñ=Mj	kÎnþ~Ö%êûm¹¼fêù×¯¢jÕ'Þ)_KÐÛ)A©¹÷ý^ñB48D\£ª=}Ã
3¯Âk#pqn÷5Ê%¹n%(Åe<6ün T+= xì¯¶W ÌÆnyS=}1dÒÅñ$cnù¼*5Ö ¼Àè<8Öºp¼ñ'Ä£IKÄLà*\ø´´:ð.¼»­%VXX¼¡545Ô*P¸è@¬_)D£-åÌ\kgL1ù-wÛ3Öà/äðþ]ä/ïîP¼J» ¿"@·3Ï;Q²«¨8*À¯à/âÉ¼:8½Ýh³Gýøo dÊ´üøKªv 
8£öî8íB©\e§4ðõ9$$@.Ó-xnï6ÊPLZ;mÂÔ¾ +µ[¡²Àüq:V$yéí>û£vh«·¾¬!X¢XÙøxoeìVÅ?6£qKÁ©ÙeháD¹g:º÷'>e8Á¼\Ö«[ÑU-³^Ó)êI-+Äø/òzä÷äùò5hfñõ
À%Æ<Mr®7fµDî]îvo^ÿÀò­
v¤o¦³miPFc<Ú*8VµeÃ%ÿè0ELÊå:tm}Z9ÈgD5ñöÞx,£Q~= Ü­!)³Ûx= ]#«MD<Ï:!­Ï¨ñ$Á%Ë^ø_ãÑX£)¼´ÆïR´ Ü÷)IlDSôä<Ï0./3¡;Öô:î°U3X¿H_KÀÆ= t*"3¨º Üh¢»¢^ 
7´¡|nTþçb¦7mÆ·K$)ÍOYÁÅ~i<CÜyi/3Óuc ¹$V²VÒ5ïîãÉÆãäóTPÖ­l±ÅÉ¢p*)4GkCXâÅèRU=MaD³&oÐ ¡T¥O+¦á&eúáohYänW7 ¢l ÌÝRFHI³æÏ,¹ +Âþî(<K¶\¡Fç lI{)V\Ï/ö3|øÈôwMÖNDð®ûo=MQ+èèÕ»ÊGXn¦9øô{9Vl= 3= )×ÍÂ÷-À°Ï¥) ,y1F{RQe¯*|«^ú»ø£¤pSÃÖÔ_q±÷u¢ÎGf8%	bÁ=}jÙ³nÇ¢AÌÅÂÞÿ!F§òéQFYslpÆeÈSúªrÑb_¹#Ï?ßkÉWÑb×ûâèýt9½r §ÝY¸saSüáj=MõÝOe%[¸Z Ò¸2}ÂÎ9'+ÿ$BIfÝ{Iþ)ÞEå¢@oÉÿªu0óm"@nðÀ.ÈñÈfÃb¢*áV[Vü?e§ÝSl!y+!ÆÎ"ÝØÞ:c¾-}Ç¼B	íí#ná®¨Ñöiu¯ÁD¯É?ÐeÓgªG¤øÍE0õ²5YßW¡ÛÅXBéÜòøª,üÀLáé'¢¿¨U<¥üIipHa¾~]²Þ^£ãóï%¦>6¶ôMUù~'ÄMc"¹»XªÃâÑhÆW¨Ãô¯´³ýW	n=MïrxVR¡ià=MI6y«$õ39þêzë¸F½ØñÝÇaÛGáôºA^m&ä)ÌßókÈÞ:FÇª$¸õÈáÌ±ÌÜ,ùì´éõF´;çr5¶'ô;9çÊ½÷'s@ªmþÉ6±;º î0î½Õ@©l@$CríÊùíHaì[Ë9<e! £5=}«dMÚ|ë£sT-\Fåí²Ô½Yê{AÖ*]^4½r'%sáom?hÏdµÒ4Ðº×líAmAæ"|KAÁK­±  ®îÉ MLÛ·"óB&øy,»ÄçOKÖ;·Ißæ	BgÙgÍg&üYºíËâ^¥FÑ=}Ssâ^v²!|¤Ã+ò¼;LúóL¦Vó§<yÍuKÈÉá5FSèÌîmù¢ÂòÚõÛ¾ó¦Cýï_¡-OP×ÙìÂ³zÚªç6§®Ò#×[f7S\/bèÓa¤_	kjty¶ÞxÒ{ÖÚ<ÍüÑOW4¯PÑ¬U½w«D¡ß0á½hQl¼eþaÆÑÍ/ï(ðgÀáhLx5}Ía7¥ºÄ¿l ïº$E<ôqnÎ¬OLÃ¼:$Yo@¾Cr[Rjª¾1wºñGÄtk2 /L	ãP ÌÉDÉù£ð­Í\Þ=}Wß¤ûÉîr·.ª3¯¬qe¤ vÿfH/ÞeCTòâõÅÎ¸²®HRNÈ=MKµ£òøÊ¹ò=MGz.lovÒxVhJlBcEÌÚÆB;àýzp¤£Vïã!R'Ú\&Å{¬ÕpÖ´=M:¬ge8­=M&¸ý<e§Í¼Ë9Òê9Tíìë áâtÎ¢¯8¤ÞÕ-=}óªQ=M¤®Ä\ÓZèá@vê­æâäð~NÝqÉéDªtÌaêùbËyðÄ&½C6íÏ|_6Å¬ýh±êÓ¸Ì¤Ö¦ÖRikc÷îñi:)ÔzzI®Vy&»K+7¡w¨p.i:~³¶è&W<æ×ËÑò+æÌ§òÁ¦3Qp±nöõb¨3õx6Ù^9JÀ&r9b5¨oÅ÷Ê5Ì/¯t w½(S9ª½#ÙZESjèÂnñô\Ô= ²ûÃÌñû9q©O
ØxIùÆ(A> $«Á¨å/p¿g?TëuÄ,øòt=MVB
þ×éÅ3¦@ÿ=}ª²ñÂÔßTf»ëÑ
¡ÎQ.kÅùìDN~z= !j'p­ÉÄÝòeWÞ &gö:ÊnePu êgÑTã¡/­mVÉ"Æ®P\ï· ÆkZZã.5M¬Ûi&RÚ	_³TxFù(7ÜóÃY=MFvµ>«¸{^/¶Òwí²[dNÆ	ý5ìBZXyCG= ñJqòÝpÑì¬Å­[JwÏx3¿È¡J[hÆlôËe°û[Â÷r/ÿeüqÞï»Q©nu.ÑU:3	ú¤4ó-$¹;Õ(ÇsðÕ.¤=M©qØð{Sè6£í¹vÎáEkÜÓ0£,Q< ãõÝ ;Ô0$7kÕ/gB6éc/^OîjRÌõ)ãº7¨)ËÊÓLÊaá_<K¤5ÎÊù9^Æ.ÙYÄ^²¯pìØÂÐ2\!v§o-õOjµ7Òè#cY8q¹H(r¿Ú¨x<Á¥úÞ2üÆ·p¡C= 7Ê£µ)lÃ©±Ëÿ²Ìù:Ñ¸Ø?URÎ2ñOæe;äc:x×Lþh_Ö¯Zãâ êxí¯vAiÃÊ:÷ÿ#p+º1ÁpÃªGñè<0=MaáçëG)<NhmHj~lÒ§MÔÍQwZØK¾Z=}à3QÙ¡­=})°¡<Å¾+²JCê
p©[úÇÌNVGÁÍmlÁÂ QqôTÙ=M×ÅÎ:³ÔéÙÿæì§;»»$ñ= ä±î{øÇâ¼6C$²G¶¨FÆ5KÜ½vàøGòdÈ«,m¿é}{ëw«4qÍ2Îë<]	 Ud/ugüuæ¢!ùÐ4ÑSuÅXB IHBç,=MèÿaÉZãKØjé-×.§ôhöóÝ½ð«ûvb¹B®'4yèÁ%b
á.NÒ^ÕÊ¹
±BZCÀYZooò?ÆÊm6­àÏ{&oà¾ì!y§µ7]l¯Fn;õïÐ|¬löúa¼¸¶¯xÒ-Àóç¸x]®¨.w¼ïíò½_*ê,:g-]iØ*v|3àêv¶½¤I+}pjÆ,+Ý ²8Ü:±Jkt 4WÔ ÿ&AÇ
@ëP
/w­½ð@Kl(N|±»'ÙQJêù,ËQûø*¡[Sl¹T3Á1¦-À3Ï*Qù[o mÖ)Bk|]Þ;qÙ§¬¡ò )UO®]|öknµÒä Ù3Z0©ýëÒÏÅ&b6ãî×pÄ¶MJóÌh^Ëï{,Omð¯ùÃ­«¡:eU+¨"JËÿÜ06 5ðkè/o%}¤+~Ê\rjU_5Aß©N3y;9è\ä£ "9ö;®êï¢çHuö= ð¡ë¦"$Ïzc[ Ôi/Å[Xãá6
Øî0ö
å§â3%Ý¡öI¥°WñrÆ¿hP@c¶2Q#h¬oFíÈÕãûÈTx­Nl=M¾zlcÁg?Õ®ñ	Gï"4ú/8N©öw±¤al­4ÿØ4ùÿX6ÚÿEµñöS¥nÈÝy!u6ö®0o4ü,"4øgX"2Ñ -F3 ªóýhoìäeì¨jNÑjH¯úEHjñ=}T!¡§OðÌ¹óÈÉ³Yÿ^jYÿ^*vázÄqaWkEïÍ«úd¿D¶ax÷v;¾i1W\×¹Ä²=MïRZ9>ÏÚ?&¢¼{ÚÒ]±¥R8yÙñcf0».æËnwd´Ò³ËrÝÅDÀ¯IUÉp¤*+)}*ß¸Æ5®=}IóZýa³ò³)ï}ÆzZA%ð´"è9^RòÏ]ªÕ¸¢$û4¬95Ízx¬¯~¥]Dê#ÛCu×xÏàøUM1l&¡*XdMúÆ	ö ã= é× (LL;A[å&Öòâî3¹_<DÉ#È@xeo,Æ-~¤h£=}ô¶Úê3¯øóÀª_~HÊë)C"=}bËy¹5G)ùYq= LFQ¶UÖ«bù'¢ÑæÝºÂÑ¸v"Æ,à:¹ÿ>¡niÂóNâ÷mq\Ñ¾Æ0/Ò¢Ì¤p%Úß4¿ØÚ°'éÏPØ²®ðQ÷Ê"ð¬À
½ÔõA¯õ=Mÿ?»¸Ï}a*b0wNô
=MÿÞ'ô\¸äôÜÊÚfÅQ,_ca7¡"«þºrÄ·-Q
k8DS¶iÈy³(2uÃÐMnÛûÌBmí¹­k¨j6dÌr{³ËIà¨Óô¶ó@(gåØã{ÛLÈûÇéoR®Y&ÅRð$²%Ôðª×é*mAIr)Ðe0Z*² £MØ>v/÷_=}ß7ÿ:$òBm2Ò¯ýI­âæzþQ4YMû[M¥@ ¤ý n¹¦¹uø	Ù¬N T$Øf[=}Tý#]NiÈðãùàÂ7ÖõM+T ÙîÎ_£= $= N¸!Z¶uxºóÎàúkªÐéÂÎµ!|	#fQ &TM±qÿ³4n£«øy«Íl0Äo¼%$$Ç0Ä6Í8y Ü>ù0ÓzÝû(~
HÝ#_x.¾×ÊAQ#|¬1?¿«ØÛ%ÜlPYzæk&á^ûÙ¯MfyK¿=M´5¸= Ná\»Ü\{ÀæÅ>Æ¾¡v£1Ùºô½ÝdQ·´ÙÏûðÌ,(æJzòÙSÇ1ÖZ!½Éþeá1æFyr8Qd¡Å46 F5éðuäV+:kPÀBEÛàãb&ã'æ^$uN7Ó2\¾îµ¿ÿ=MIä+1ÓÄµ©QÁU$XÊi$HOyÁ¡
V÷Ý4É¶mGô­,þx÷Ô¤È¦t y42Ú°a~Ãx_^öÅdw¼[$ÀC$þ5ñM³Z©4.\ Ú³±¶ë5Òäü#èÛñwÝâ)Må'¾lQËÃoùyÌ% =Mê97QüÒ4pÎ®/::é]Z;ÂèZZ2÷ðd!a÷ì2»ÙÌ,´,ý¥Ë²\ò'»ÔÑõj6ó;DÚ¬ JxnBQ×·|:R²ÏÀÉ"H²IºQ°RÔ^v9j)%DÍ%Æç*üON6C²e <~¯º	Öñt¦ùUÄXA£Þc¥Xªc+÷cóç£ñ­ÉAwþølD6 Æl7tö³ÂÇó)náGUãaÑÖõð1öß.ÿo=M¸¼]2ÞöqQÍúÝ³q8zùgÊ¶ eD¦EAf{í=M¥ªO2O®w5aÏ}4× òY|RdÊöÀ$%ë#×~ðwk/9j;	JeV~ 3*Ñ|ÖE=M¡I¶ÖdÅA{_¸wNÖ/ümtð#fu¼;&àñMï¹)¦I¸5koøíV{ò××äØpWÅ^éBUÉybÁkø= V|'%!ÆçÃ2+ úOê0MµDû:$'ÿù¯XL!ºqÍW-´ :=}0Þä¦|HJÍÂLÛP-KáÅçèÖaºpÒ£ÇuBZÑ®¿Ö¹ 2
Ýà"ÜÛé[³RÊÈp}b¹ý9ð×^ö·B%æëHqkkZ|DÇ2ã®±!¼(Ç´ªw~-pÖ,6¯tKKÝwW/önú¨+ó.õê]×;Æ,"ÒÁZ²ÍøDbîT#
¤½ÚÑtÂ/Ãäù»¦Ð¥×Ga.#5£ýÁµðþIú.2Í§=}1âÙ1~3iÕÛÈÎnòd´¾¸J^1t]ÆÌÁcs¸Ï#ÇcúJ1®Âjþ\ðâ×»F:¬Í=M|Ñ&à·ÅÔgà»kÅÐÃV¼Ø½®¤¿VÎÖÒÊCGï]NÏÝnÄrCOwE'WÄ,8e´BE=}WO^WÌðÅ=Mv7áSænös&ÂÌÌßkð²éÌ&:mÄaë%:Cû6êl+Ë+°<<úÅéå@?û½ìh ¹.:¸êÓHöõÈ¤RS2(¶zv3çÉ¦ìy²Ez)¢×ª¤e"1èA!*AóÿàëedùLq¡ß^Pu³ÂN	±ãa#FÜ=}/"êÓù§54Í¡Ê?RõÂ}UúàU<U(<+Æ«Ïçn4óê«2³­ïûÇÕ¼hÞëØt>ÒöXN Èò,Ð-äÌ§³Ô&£´Û ßÙ}ê#I¬¦Ím#Ýy
fPBQÐO7êÇÙB¦ñPt[Èå3=M¥êe0¥R¢×NÔSÃ'·ììM@PEËý1[1pí6³_ÿáÔ¹>Ð½ç!¤8{>wÁßåJÑ<áü¹¶j7"õüOòe ÚÚpÊwéÐpÿ¡
 ç­Ã±Áõå~nx
%a¡Ý¯¸Æµ«l¢¸2aÖ÷ä[%
7Ç'&2 WXp1ÕvEGøêÒ=MZ"sO~(ÚæÈHtÄ&§aðÂ(Üé]$ðJºNÜøQ¨+;·>á[Öß%Qn|±wnaïì¹ï4Ò¼7ì|$Ç~tZªÉù¡'÷E63@&~öà>Eµü¿>Ú[æh©!½'Ü´5yùDHÇÄPr?nõSc0-Ò7Ér]8l¸KÕöçÔ­°e\îôå/^¸ÐÔâ[asr½°yü+K
ÝiÊ[Vâóµ´ûÁÔ*pXÍª"ÉóX*.tÖ$àå3k\ð>R¬+?ûõOmØE±4þ£.®FkW>FÍ°YkåQà'-éÆ¯<»6½Ré/FÄeWlÏÊ<E×äß²:?Æèµ[V­4/%YoS2æRÞvz]ôñ7ÑkçAê±^UòÏ$ATÒÛiÅ #_ç²ÆËÑÏ²Ô§ðxÊw;÷

çùÿ9ZËýç'øù'pg@$µþº=}«ð5êØQª°B©8£âEëXC* Ö+7ó®º%¢8¤ fÃÀÆØD¸þþäLzØUògµÔÊJBP¹@Û<¹oêÅÕNcùvù}f±Yëf{£ßì\*säÑÑÃ\Ä]KJæSâ b""-ÔhÏ=}co/¹1cÿÙ(ÃP|£Ñ@f.ýÍAàW^:©ÇÜ­gb¸+,|1=M50Õ8GDÔ¾ðu-~¬ÛÞ³ûxòå¡éµ¢Ùë'Åg³8m²Ù=Mªº-àqâ~kNä)Î+Ë×±uYâíd[yt_@2ÒÊ°¤<±Û­ëßóØyÏ·ûÃà÷ø"&N­²É_29±»ÙOö·Rí¼a¼{ÏñäÔÝlë©.(FÃ÷%®Ã{ð¥f¦î]=}1Í
Èâ ý7ÑùôàZñµJF7KªüÃ?2UfD[cÇOu gNÄ·K¡]ûõ'K¬w+Eìr5¸Cõ&éöä¼%(ÕwÂÝ±ûM%bÐäÇ¥Ñ°X.·[N2ÂßAû³¥U9aìøÕøuµ¼ÆÓÊÛÕa¸â¦µæj³tFñÐ±çÆéL´ìw2¢c ÄÖÎ³æ³q"Ë	sé²z¡ùT¶"Ì©L3'¸a	Õ	°sç$è+$|1å1!À,©SÚ¡Å¾vÂWÌ±¶66¢~´Fö½
Òà±ß³lÐp!/;xpô&Sú»ÖKÃ°0ÿZ§lµsåRJ¾4M:0P|C~C
x¾ÜWálÉW-ÊsbÄÄGOJ>[¯ öqáEÛKÏÉây¿Ôêèc¶[¼½= %#eh/ÄrKµ²º¾Ö¦)×Òÿ¯\×§%Dqq elq1«ïz¶LÔQrË2¶ëGòZ½
ÿ;åf0¥g§x På&(»Î0KRA:Ë§êµ×Ü1)©÷¤= }øÞe<#²®@éPÈ8 Q¹(4ÞðñÌÉ	£ÎÃuPfo= õÌ¯òNDüK·¨2R±Ü·mNòL¼ìkÜÃ·á¿ñ©jòsß#ÐÌ\¦Ó©l4ç2XC% @¶4áÜÆ·ÎÎ®@'VóÌ.täC}ìïÙjÑI·øArètÊ7©YÁ¶^Ò»0ÒM4?üÌÉiyä¿d"÷,bggUCÖ­ïºÈ¸+Y"Äö*^­8Û§N¤;î¢ÌP÷Ñý0B6µ¯,#N? ¬MòtpÖÜhUêTêº?°H52Ã,á($kü@¶Ïëkiù²zÆ½û»LPùÛ;
ì1Ä<7!+'gI1óâìö0î+uî¡e&JPîâJûG{=}Õdü5¥°+ºÃGDÉÌ:ÿ+º¿²£_Æ¤¨yÚqPoS¸+¥H½òWGºåu ;ÐG,K'·®GGãs7D7I×ððÖ\	Ë"8¥Îr¥ÉoUM1Í<KAVQ-åý}ö/ø@~L8Ý°WaL7í2MóCQæØ°ÃØ+4ìFß,ö">«-|#}I?×4x¸ÄØøGe^|ôß±Ç}=MtßÜ14¸F±_SrÒ«JÍE>¯L½ã¡Ì&sÇÌ°:ç5^â×Ø#ÙA½
ÀÒ¾±fâÝÚ@2#nÆ?6b"I?8ýÄÝ:ú­TªÉ{,#+la×ÉõðE]T¦,pºâOÀÎ3eùÃ^LÞlÜºÉñòe§j£2K¢Ï!î(ÂD'kO>k&j»ßbBpkê0Ë'jk-a[­ã*ñª#å(;ÚÎ½L¯î¬¢©³tMl5 h/O¸fõó²eÛÌðØÊ:=}úáó´wK7¶ÿyÝ¸Ø%dM?W|3³0 pWçÚöËþIÀ¿÷ìÌ8ï¿Iññäãü'iD(öv.$ÖåÿË9lÝ/Nn0ÀáÒY±µ
O«¾'w½¹:= 
s%-<µ?veÔÌµÛÄ¦ÄdÐ	X¦)0õ­}ö¹ÅÌÉwÎÛ¿
Yñô®:eq¸Þ¶!1Õ¯Wbuèçp¦÷a
ÍkkL(xL]ÉÃk.â®×£¡"ó0}gËõþ^¤&åpÂ¥YYÆ[)jb,'t¯y´B GæµVP/amÞß²DÀüÜDeFc[Gð!¡ 9fYù6½?®¾tÜ·$&22tÖ$bµ¬ö21ÆòP¬Ü D1û6!æò².ßyÏR²7Éá_Ì¾Q4ÇàÓZâÛ²Ò~jï.P&KòÔsæß[¦Ði'ª(lÖfÐõõªî_§îÛñêÏºóÚÂsàâ÷PWæ\òâ^ÔäG²wCH¾Ë¶P®= Öêyæ·8å'hâ9Ô;â= ±GDRè¸ð%±= ±·NwÂd|!÷Ô¾Ëh¢ÈÚ5<¾ÙßüSñ¾­10Q  z=}´bÿ_uxDúNñ õy<}v]!$X÷õÄ²2õ»s%	ùÚCwW%¥	
x*ýÃ
$ß×Lº
DTªEïú^«å©Ë×:J®
lÇ¨|ÿ²mþ²µfÄNë@Ì¨<®÷!®j_vR®W,A*¸ÑJzS=Mþ*A«Á¨</¸Ñç=MøEëúüZ¸Ôÿò4ô¾èÉ@3©ó7Ì ß9qÍiÄOÑ-° Á}C«ðØ*n%µÿÊÙêÂ÷.ùNKÆå	»«Qw8²ùä-6Ý%]æ×r1Ú,\j­>\jÅÎxäÏ#¾/E«YÒE%^=}B¬|Oç=}æ[+$£ýí)7«µÕ(ùè3ÌCQ;6£á+gjègÖ­jî=}gÔU@ËÇh§Q¥æÖ»OnÂÆÆ0,£!VÜDF"BùÌ¦%TcÞ÷QOp Sùäßó,\¹T¥<pë¸Jß,ª£Hªc£8å?+	äÏn>³¢ÅjÈmÚt]{èÆ½ÔïÜ(¡? ôÒù-øI:ÃÄx@ªÞoö®'{aÔOÇ]ØÉ8Ýå^ôùÊ¡kdöµðêÅÐzÕof½ÔÙ]Ã9&z¡²Fót·0SÔÇÀnrÀõ¿Á¯Ó|ÄV0¢hÊ¦ÊSÖ_µ=MV26>>Ì¥4õ¡&x?paä+µþN¹ð¤o=}Kï¥æ¯P×à«°hß·¦Âù<G÷BZB;R«ÎBäUJÍ=MhÅ¶Þ¦IÂQ[ÔÛ#¤Â­BH&öh=Mvë*ðI2Ð¤rY·²Ì£ëéøúP,2¯qbªäÙù²ögÊìjHÕóG%bb2øï´,iØHãçDV.åM´pÔ(Â#Iñ÷Éó¿ä&õÿ
;²É53ýj9ú²ÄêTXi0ðÀ¢»£í	ôÀ¢;ïC9¡í	¼$þ88ä§Õòúaiv´BX³PÈ®¬Ò·.Ïõ[ð2×æÌâ ²â0xôÆLtôúÏ#2ósÔøÄ¨VV¤Þs¾"é6¾úåÆRÍ/!úNmÂðM('M0 èßõ±ÝcÉMÞOT0ÖMiß4ñ7¬°µ²tá´²zê©vaÿ×¼ygÑ+¤¾3J NóA6v_fwv-çÁO½ríïï+¦óY¥íùÉ#¢²¨6Ovï£êÇÏÏ¯§
ü8rè|a:Öc&ôüéÜI ;×·ù¤_3Ç®y\öàÏ\Mcep!!ðµÎbæ=M^.yOÓá}xõ+v×-ÈÎaoqð]îùÖâ7ÿ'Ù\£/­ÆÜ*Âµä.büq;ôÞâüô+î¦zs4màû¬óy¬º¢q8a¤ÀFätÈ»¬C:È»,/c$jXusÙ­ó%ÁP·cÚÝF&Ú«q¬qltdjÁA!_qÌEÈF.ôËn^·XOßt^s^l_ÁM:È]øABïô¥ÇÊc¬Y®ñaÁg³×wýAñÑPqTÈX¸ð=}HRÔ¨= ÙÛ)U¥¤ÝUngÝæßªFÚ°Á0q±xSMÝ@éçG!Áp°Vs¸ÿ9¡ÀÏÿ¶O»6	\°ÖpgµàëJÓý¦v½p¤B¤ãbu°òÉ¿NÓí¢¸Î&&*ñÙ;éUÇ+=M5°4ÊÔë¢W{Zýá**
à?æk=Mÿ0ùW)Êiã£ÿós¢pûSÞÎ¡S¼béÇi;s¼ßÕ[)p4=}TÀík¨óÛÞÞ&j= µ­¸0Ô×ù¿BÌ)§ý«vså)¯äN ¿=M>Ðæ©ús°OózóxØvJ(cCÀb©fsUÙ®<PñÊéogp&çc÷°rW¤Äñ *2Øâç$Æ÷q[R§[ù= óÅT«|@!ØEíÒ®1í I_Þ¥À½¡dÃÞæaíýÇ¾	ØÀqÞFwñäà]÷= ½¦ØkæÄÈÓ3q¬©@¼Fèà[§·¬^÷EC²ôè¶sÝìq=MsHAýBªVGp£XlÍ@$ò2å£¶wÓÜ¨2ðhßºÞñüFù§Ô§«ºÈ8¶åÆÐC¯\Üsñq
h*&cóíTE¦¬;­­âyÀµâ¸N%È2H=MºÛ±í*î~èR.÷È®(o=MºÖí= Lpðäø &&ë*WÚM\r¡YOj=MO¿ÓáÉ;*²¦-?©FWMXªKzâU@h¬6J
êø¿84×[rmF§Ìöá·÷ù)[|ôÿHVj¥E¾sd"J= = :ÈL×'Äf^sE%/\Þ58@q{¢¿*>#FCFIHE¨Á=}~£ÁýEµ²ÙW^ú>¿ï¹Ôr&çüÚOÀ¥+èiÐËÇ4LQ¿kñ®Ee¸¡ã¶³Ï+ÀO|IrSÞá¯¥áMÇ3UÊçð:lOÅýrdFêCh{l0Ög rOkZö{F©7_6HÚç§~?¢Ï=}æÓ¢wi«ÑNR²óàÍÙû!õÆþlU¢ÅjÜÊJ'íé3EM²Ór
È<¼ë=M¿¦ßÀÅ2ç/ZØêãQvµÖüS#hûéº²m'È´T\åÍØD²«o~Ì§©Ð/c5!eäßëmÖeÞ"Ús
ÜBÈ¦¯×è§ïÉtÉai¿^'²Üä·z=}Vµ&«o$E§M+ü-¬M-R¶ÙËx@ùeç¥Ð"\4ö¼ó+Ëìa^#÷y!Ñb?X¡¸¨ð²V-o3¾CÌye9îí4ÎÐãzÎ á ¨+z4Ëy°&îw°úÐlPê´¥êZ§Úð°hçû8j=M7+¼ Òù~ã&C@ ó_+([ôj>"
ëÖ/ì/´Î'G= Pó
[>= Û~¾Eì/ÓÆåêiÐ÷¹Â7<KÀ& ¹¯ôßïàå6ÛÎÅ½£{]¯ÉX¹prv¢t<(¼h)I³;ûGl3æçXïû[Gbønê\#èùá x:K= iäÉïó
gdSNÿã
ãÁEâ¢±@s|:2jÝéÇÛ¶Y¬>uÔÃ[²Ì¯dBQùÌÏEò_vñ×l^Ë_ãåÃa¨iÎ8r/eÓÃ½Æ	øÇÕõ§½Æ!f: ïË]Íçð³_ï<´ñPÖçÚ1³_V¬V¼¾Ú©¡o¨dÆlrä¨¡ã³_Óf<utúè?Û¹2_EPºî£Æ8l¡QéUÔ³_÷y.VsÝ :wÎ(½k¤ÔÌ±²ñ.5Vã~[ °sÒ"äb\¤×âjíQa=M«Ì·wFÚj%©¼ã+eÚxjÚ*ÁS±£ù¢¹Ýp=MÌ)®[äw¤¸3up¤1"rè@.uêj|pZp £¨y&Õe¶yA»yBìa¡÷,¡æOÈ²èaïX±,¡æ,ÇÊ¤CH*Æt7Ù¶ãû§IYíÍ²èMd¤ú,èýùÿEª|VrEëX¨j¾èw£±¤ãSi·G6WÔzÉ^³g®{ÆCÝyçÓUoÔÜ!ß^ 'S%·B¼fã%ÏdãÉ%¼r¼Qjß"D$ªû÷vhøÚæÊÊðPLx3Ó­­qe7Q9)= 7­À¹õÅ:×Ô
¹u2¹q36¤{ÚQz'Ëw?ä=}f=}3?=}AýâçnR1SÒ= ®cÉiéJ¢ý^qÅ>aM!¦1Í}ÇØÜ»c÷U5ñR­öepëÑü/¢M4ì!ò!ú,ÿ«¯[lØ²9(~xg6ôßcp=}·Jt]¹«ªæ92´>å(>²FEsÒÄ²üZ26z¨ÂAð¼3t¼n®:%:*ÿ6÷4ä3Ub¿æßLBð¼ú}"Á-"
´iGããÿÙFîàÞ ñ"«èñð×TÿìönôAÜtÏ0h$¹	Í0Ù0P¯ë¨Ä°T#yX$¹í
ö£ñaº¯ð§Zoh¢G¿²·NêÖ·eÒså¶
úSCè+z·GºR$sµRIÖëë¢­3&2Yb%ÔÁiã).v^5YêT4;6c'¶ymìêhàÿ©VÛZBÁÞ´¬S4÷ôÁÛEE°Ë-£9[z·Ñ2Ù  +Çàà
Å2Ì	$YHë
¦EjÌø
ë±0^¥.×¤;.àrBÃ¸üâ.àà¶(däXùx´¢-Ø"SÎä>ûÎ¢§Ç/úC!Àû\=M>"boFÖîÉÅv­)sáÛ´a³zD-	øhP²lp	(6mÎ¢ctlòívS@Í°/ª³,OÇ´VÉEélý5ì«$íÁ@·èvvÌ¡ÍSç>¥5©¦ZÐðª5}:UJUu%+b= 5¥¯y]í÷Ã@¢5PøAGá\êÄPßå]ËÞ½'®1âTÖÇ$öoñ"}ïÉÉß@¿ÛK75í;âTô0Þ[½µòßÝÞwYWRPõnNÔ0Ä[º4:§}ÄèÊ[¹µÏ= XîÍ«»	%ë·ÅÐTò0ùÑo<?«¬çÀöõ¼é	âÏ÷I*7gÑ¨UÅ£ë
èµ6GÙfW%Æ¡KHê É[÷ÔìYI¶sÚ5ª&ï*àa= ùiJ}®vE%.§Ýè°Óèpå¸MxÕl0î·áÝ5DÜ3sÊÏôÊX	%z°$Þ#í%u$Ü._Z7=}YL Ü0l{Jt %Ìÿ\É$ßqµ uc±ÜÚõ6¶$xy?äú Û.e.úc0ûàÂ­¤7´óQ7Î@E¶m|N¢yRö2ºàdÎ=}njs¤làÁèª¯ILqÂÿ4¼Ó¦ë"hmÿÐ,äú¼ÜÿµL]2ÙÝ@¿/	M?\ÜzçûÂ¯[»X´ÝhHÚv««ª&= É	©=MÑÃã¢ ´Ôp[iÂWÇpæÛrOÊoB7M}]ÔØÅÔvi3ûýU[V°NÎú:
í0-³0_wÐÃÙKõtÿ[¡å¦iÎuõÓ|Ë ³ÐË#Ì$E!P«àI)%1 æPÆh¢IâÏ÷«ãº=}Ý§>Öìüü)PÂ[r®+¹IÞ1l.¤7ÁÍò» X¨Ø³ÛÇFï£DÒ´Uõã0â¿Ü¯ú%YMhÄ®ìÊ$35Ðbûoª)µëÐU¨ðq= A¸= Öâ±9p Z¤úÀ$"/Ðæ
â£;Åú-ð¿6BgPO'ÅÑÆÇï·&É=  ðË987:
üe0ßg¶âcé¡\%¬k\R#	Ý±s¸ö­²7=M%t)Ë=MB=M?]¯+wÃ ì:{4xÜ5Èx
hòEL8¯>§|øÔ~ÖÁó©ªnkGh/µvw!-F°èÊzPâ~#"Êxäãæ@þjyN&®U°~ á{²iÜ(=}!s= ÂiýÜIbCÂ%¡/ uñöåÀK×¹[õ#ØSË9û±BDÀ1çØZ#Ás÷¤<qÕ(ù³ü<?¹;ü:³ßØÔ9©#tZ &9ûµâ¶4ô	üÞ*Wnä£ÉcÑÕm÷=}öbpu²°r¹?%T)4Vu2¢ÉpÝIÎìac8­Æ¹Á¨@nÙ¼9Ý86Ý½3@¼%³[ -^<«GÅäDªiHWÚÁª!AÛ¶1"5·´tØÚÛzVìA-òD2ù=}ôoLÓ4
rz3¡ì g= Y¤®ây¯^.CÑàk rÉZi²v©vk#!³+³âüHdl@èvªosÑ"ÇiC8B8eêhâóqCÅn÷U²<s'Ni;Eîh"ÝFmýd%¿x¿óýOrµèdWÂ*	ôÞ=MTWÔ>Ú­ææc<li=}/Íj!Eò,ÈÑ®ýndÅ¹@YxatÎ<ÓMÆðz[·É%¦g¹©ÕÄñ3Á+±èµ1qeÀo&S@7UÝ"Í}«.VÂÅ¾Mþ¾?æë´ÿÒ7Ô%l<o:H«ônq¦ªH1Þ')ñövTçíÐ6eÂèxþ·]Òç ¾h?o¥×>
Tåªñìá1Ù:ØI\æ¦å^d×ËK!câ·Ç!§ìBCF=}äkÂ=}·a3²f¾âA£lAÃpR|KVÙÃ)-ºe×m±©GÇzfbúùÀ´äµììþ)Q~ÇENnfYôå°L¼»/ë´r^ÓÏÛÔ¦àg²XqgåÅ{Êqç}Sß»àÊ¾åqúàéj= Ãå¼æàëÑFèâzÉÎK ;Ù<IU5Ð		ªWzbìùì/r§ÆbÃå [VÊ÷×µÃåT8g¥½òHD¹r§d¦Oß»=MÐàóÎÏ^'¥zM_
ýØ
þ¥óB$§vâü¹³û1Y²Î!ü(!"äpØZò*¤×<©êÓ6D+åÀ«¿aã±PÕ:ùuÆ±P)I#£Z¡\ Âéá½G~dGhwX1lrP¦=}ïÑß¶ß ú&ÉÆs¬{õD÷p·eµé&ßI<3èìVÆ0ìå×@(ïr{ÂYÇr>&Zñ#2B-»æö½w*@6}«fqEÒèøê@PQXå@çr%Ç@Iu¨=MÊWñòlÝ=}ÂÞrñcÞÞ¾ÖI1íØñ­õRA¯é]ÉPò+oNÂ÷ÙwIã²Ò>6.pçIwj"º"«ÍñøQÄ¢Û×;{WÎ8»rÙª1×Ö/LþæìÝ["v+ÄÖGÁ­T\tÚ¦%¡«5­ú±êVW»Uw$9	Z»Ã²Ý+[w±Ed7Tó»+m# Äåï=}ü6^
'ó&Gº&°ç×oNìñ*ÍøÞ´ïËè^ËÉ¬it§Bß)¦ 4üÇ+_v1¯6mRü¼hzQ}­L\ ËYw±ÿ¿Z<×aà(Jþ~ZÔ¤¡yß)Ø÷0ò[¤Ã§ÆV/R;®E²õÔXSãaJÒÙêÿëýµÒÛßéÒc"÷Å:¶ã#e2ùÇwä~ATîÉ0LnoËPáô5í<!qýâ.ÔïT¨¹§\¹/Ð8= Wy
 °!qº-Ë8'Ë© Y|bÌ:yæÿ)ljË¶ôpEºíJj$cy
pRðåù)"¢p"Hð"Â¶6áè¦èu:Âç2ïSÖ'¥^aö´V TLP÷eªgì1~sóRâùé9Ïâgýí¿[ú[PH#Qª¡ÅµYh	"¾{Õ{@Âíõ=}x!{Ú»:m× y0æGå©a¨úgMç=}pOÛ%Ý^L»Ò=MlvîU§b*OHa]~ÑïÜì:«¾êaÜI¢ñJ¿¢jªd¤ý
ñ?l§ôFmã·³¶Uèö¨ø!é*ÍÇ»HëÐ5'j¶IÑÝ¥î=}¿E±ßárSv^âáÓ«ÍcãÑð+ïe³Ü´+ÖÝ6³¡{³á^÷.9¨øÇm±®?PzÄØËJáD,p2öåþVÔëPÁ­1äÀ
²YCf<-*'{®{Bý$PÖLíi?Òùt,f,
Ë+ÐÞÔ·5½Ð¼ ÔP¹¾ QÄ£­AG%7ÉL¥Ñêglìî\ºØµËlvZçÃØmòh<¾ [÷ïÌ¡låo5Ö§­-610Ùs«¤ÿþ?ïáYw|ï8Çû(!Çk	bÌýIöÎÖts(:tÁZ
C	Û/ªHïÒ%¯á¦ªäÊÑ=M·M¬HñÏM»ø'¤ºFäýîajFÓ1TÔ¸çã¶æ©9Âßd=M%¼Ksl2!þ«=MéØ@±ßf¡|Åãò0<ÿ³ZnBo1¼UÚ*L·T@)Q©¸N(G6ÜSX}Â=}õÑf5q½¿ÄR¨SM;>Rò¦SWdC®åáÉ2àL#¹ãÕ£±í}óÔó	in·TVyoÌ²ªòjuúù­ÅìªñïÌ?göÆ{ÿÆùë4º[¯+2p{wèVb~Ù+J{ìöè*~®ú¤ÍF[¯®¥ÄJÑT¯¬ót
Þ1¸!g¶Sôm%ÅØ
§Fêöcëúèb¶ãåIh¤eýÙqõùP«¦2Ñ¤,}Vs0	û= ¡<º w¤âQ9V}_S§5âÊ¯-±UÑìóóN@ùË÷¨gNy_y-ÑÝ°{qVüß]NCÂßoýO´éB-CSþ¢ÿlOÉ/½¾Wõ\Éjwl<dqke$lv'ÓÅÅ&»<Ççvä^(ú1sÂ$=MÕ©¢²&ºâ%+|çù§mßRoÐÚVuY=}åà÷²0°ÏQjËøç$ªjIÔZ"ùã©çÙ6úBCýiï§±?OÐ	ª¬pHÚ¡È¨á²¿wÁ$«ª½Û]ù«¡}v«Ùûesá·)³Ú/DÁßÇ~'HsþÙDR¨óVh_Èû¯Î
c'°Ç­¯<÷kå·ÏP%Bbö¡q©ådXµgwîDÜä@hØ¥ðä8a3mè=M ðCÂ)«âé·hãL|Uð¾XÆ¢ÛøÏrRÑ°K{á¸.Gw½(ïk*(4îî+ÞßÏ(ñ'éX¥Wu½V}0Í¥·+AÚl­î!ö¹Â×
¥DæýÖ'×óüVÜïsêíEÒÀ(ìþåHÃZ2²à÷"tÌ'ÒMFw³*w8tAm:= Ñ«/ôÒç®ªkÊv]fü ®î7Ù	4z¯qïÜú«Ë-µØõð~P´kºsîÚªªzÏ¡<-Íô]P´ÌÈÞÑCÑ*9Ú+ÎÂ+ÞÇJxX´;_]Záð®Z|Ë2ÉßÒ,ñ"	3ÉÑ3òGg ÄïqZ¨7¼o×e~´0=M·ÉèÒÐäPÝå¢ûZè_¤¦f<nL4c:jwHà-oR|+­¯¢ì*'*±Q÷$oUÃÐ
5ÑPù åÀDÉíëßTß= ò%ïXSðò%òeßÓýïlídí(i·s¨Uà~¼ûM¼ë*·«Û×Q-Ôñ¿,íntê¥¥W2ÃOwß,=}cÄ+²À§6ÑgFÊáãI±âÿ³º#]ÀXÝðR©çÕÜ-í=MÙá(goÉ}ÏÃÖX'?ëaÂc­Ú»ixvwg(ÙbsBsè0#Äâe}êIî¨B©Þ|iCéÙá
9eâÊÇó½¿yYj¯PaCL~Ø±fìáÐnà9;mVHÜÙ>è«½]p;ÊpàÛk$dlfflqxÞS%Ãñ%~e}i%ôõ§O´ÖÝs¥W§o	ÁiéÑ4&®þjÕl FÔïÍ¡Î%%qîÎA«
yüÌGÅ&îÊ-¨ÙY·µ¿¯ÓZø>êSÑE¢Îò?ñÉj ämoÿèy²hO¾$£À×O¡®^pÂÐÍË&&pI{	µm£'©Ñ_Á;Ú ¼ãðÍ©à:aöu¦ìOcì/»#l%»÷Ð¦Ã*sè.JÓÃC#Ç×vòê­W©¦wa&8@Äº×ÝÌ¿Ð1r¿¢/¡ÈJûêÝðEÍàZXÛéÚÏ)%Ë:´ô"Éø'ºn§fX¦)ÜÄ¸ª ×Syºl(¸Wì C1|@©¹=  ´òq{NÁ,z^a@·;z]áÍðÁ\L)ÈpMZ¯µ>mË0¨/å½Ãeês!OßÉÚ5ö«yC@TÂøîäªô;÷å#ï´v%%C.®Ýr×@o¼n¢G</Ç#Ö
:<x¸«§ÿ4& ^röävoåêûëäô·L<öUåð = IÁ\Ö©lÐ´æwFÐTB-ç	cê·²îks¦Ãòr¯Ä¦Nq= ìy0ËÐDwifRæe°_}GÍñ-GýhF¿%( Ôö{ý¯|'T<í«¦áÓÁ¯õÿÝ _·óQÚìB^(ëi¿pÈìò5ø¯¢Ñ/²óÏèhêáCwáæ+	cyÌó[úfºÜÅnàfb2­Íôýñ·à ~&=}£+E´
Ðð#¯^ßBâÜWá¾ = ,·h6C4r%/!ec¤íkÇº³^3 {ÔN8mÞÂáot·%É'ýÆAU¹ÖÜ}.®z+òscGÅþZs<±h£öRX
Tÿâm©=}éS»üÕÀhs«¨ègàó+È= ª#ño±§ØöUè,é©p£íôÂqÅ÷Qoj¤1÷ÊXËÅÁÃ >Òþ;ÊXNfAÎL·Ãõ#ÖS¤à×TÅÒðú¹n'd"NuÐ)Bd+ÍÓ¾©ãÛ6þøÙ*ÝÀÈSÙñ(Hk6Ã©ÖþV44ÈÊ»ï= ³,>ø4}÷4óÈË½Ôu·ÕÓv×-t¦U-QÍtÏd¿bõUOCªÎ0¥MØl¹·pÿÝ>ÿj®,ÐøÏ¼>îQäØÑ¾Òeþ½Î¾ÏKdò±Ðw= øªSn­÷Mså[Èöj7¬ï>?ógùZçò¶}/Gè5tõd×/Ûmîüg0ñ´âm7§£GÔÅ6mCV(ªIN}ACE{ú²Ã7yÍªwÚøÒo>B¹í¾l+,kU°HêJ6Õr»\¸p &Ûkß×Ìs n×LaOZ¨´bÂvãòö×_úï"ÇîØL?WÈ¹&sPKìºÿ®Å*¨ÕÕ#:ãÀH\ÙÄxÒþ'âe¾Çs÷9ÃJMé»x¸ÎÄU:ïNÂÂñäÿÉj&\p¢[äk¢"óöo[¬p}=}à¦M	µøjWmãz[EyG7òÑe!_P·ÎþHÇgÙâ§þÑþJïp¡F	+ßÄWyvýä³*ÛÙ´àvÓPÕÁÓHZ^àBZ¼Ø 'ÁòêógæsÐ¡mÃÇ©·Ðz#M«À'jÉ =}Ú+Ïw²±%Õ( I «ñÂÍ«®ý#µÆÄâ2É²½íÚ±½1d@A
LÍ;EIc¾úu15g[E)ªæ·!×¾³#å	@ç,o7bgH¢*u'dlZ×~Ó¹Å1$
Þ|dÁwïº[â#ü·Çº÷Ç|ÓïùúÝ}#BàC4Nr¹Dî°Áë
¢u¨æ¡NY9rg4¸É¦Àt fyä9x&{æ+±üB+uÂáÃPæJôXñÃÖËær<=}ì®r"	Õèþn¢KR|
r
°U×p_|­¹ðÅ¢Åö¢§¶[wÛµ?Ý²Ñð¥ùÆò»÷±¨_¢·T§Qcd>þÂCßM(7aá! jÑÀ®·ºÿ®AÅjº± §-M+:¹5ãuf½÷Iè4G2Ítµô¬[½å"½Í'.¾3µ7êåBu?kEµ]ùÈ{çYüóC§Zéô^¾!ª+t¥D¥îa{zJOÿi¿Ïc¶ñÁi	%F>>ëZ!¹ÎA0âØ©e#S%úu=MÙüKgr× $TE?z/.-/Ûüæwóã!=}je¹+éð-4±ªÀ$Üàßky£3«ýï(áy4£½	B£½¿7ò·²eÆ°Cjü·]Rá·ZyñPÎ<qã'y²ü~¤ÆV+Á|ÒÄ¸®kx¿Ñ­÷!«î¥o­TßÒCÁwt1²ÀÓ")¢XÞMÒÁ^c
ß'v8"¯3h?VåáªWîâäåQ)ñBÐïÙqÑÐ áÃ
$|^iÅ±=M?²ß6÷©ÆvêAÖjåõRY>ÒÛñ@3­iÄÏwThæ ÏS¤W
õUòS'¥øïÔeÞÁªÐØ.1ÿH×öå9H§GGð9J(÷ = ul!.BÊ3ÖI×ÔK -ùu)èw»´ý[ø1[ÇU&ÞQ´ñ4P!«/RrØ+oÚKBÎÀê|ÔYý-QóÕ.T×Rh )müÀáSÆï 2ïkáÔòtÞ^ÑP4(ñ8×ózßSITµá¿d2Ô±£Ç¿Å¿°jõ}[Ô0óBfÞT®µbÖQ±B¥0[øbáß_ÔM¹IîFYâa 0Þs:åàÙ,õÚ¦DÃ«}(¹£ [K[¹hä¾;j½¹½U/ÎÕs£U£¥gÓOUc}Tóñ)¯bÚâu~«È§xòY¯=}YWzÆÒ.%gnïÝrL|[vr\´Á,Ú5>­¢3¡¹£tûLßÁ*5 õd¶þ%¸o4pC
hö°+fßÏh-HæÆÇÈuQ¶ÃÀGñFv±²  Rï÷SÒÕAÒòYIÑM{ª®ã÷»U\YõP6[òíZ´=Mæ{3G¾éÛSçb%¸Ct¿[ëÊh§3Ps)íÚS|fìÙñ?8¬Abÿâ¿>ïöòeYûG´RÕì´'ØmÁ*ùÚë¥¾Oì}Æ#ïv:¨VÁv°÷+¾(®:G¼_ëøÇOú¡äÆ(¦ÿ<h²T$%w4­za±ze<>ëU(±ê$Q}pé5½'î9óC^ÂÖHÒèµíÌúIº2mÌs¹£$CÆÑà³vñJ­õ~j«(»O'¦ Ux:Ò$KzÄzi_µÆûks®$Áàã0µkeÑ]xMpµ¬F~\§aÞ 6hØñsî2´Ò|ÌzïA&´ªÓ­´ã$1ÂY(Û)ÛsÊEpb¯Ù?sýd¹f¹Àdk Ão×D#î½í>³ðVÐõi})ÛG «þ^Èr«;Ô(¿T"ê±<çÀr}Ö§÷áÞkÞO3/h£ÆG\¿oiÿ|Æ®cMÉÙ
 AÙ*"é@pûÙª^u;¢X*BÂàsû©óºj5CQ	<¼Q"d¯ÇÅda8_rWÒmbÀ­æäâcÖj	 éÀøËMuºyÃ´°·XZWìáìQivnÛARYh¦FËðD^
?ÜöªçòîDY]ÐãÝú4æ@õ[-%øFÏ]2GñWÄ½bçâjzÀâÎß2Î+)8ïNáx. Öð_xÎæetÞfun$*wnÔf8É«ä^ÆÔG¼¾î5Á¼ûÀNºc(Enky{¤å·þ(oÝa$3@¡ÏÉI¹¦(Â?ðd©­UÛz¨)É9#9ª<¬Å>gÅÞm}]û%ê¹à_WHÞ§PR_DP=}Þ¡Ó08JO¥K¦µ4âmeÚDä]&øF)ÈýÎ_]Ó]ÞAÂ¾m\Dq	Ràih·nA3oÇ¬ÙP$:¢Ç*oòj' Â<¥¿ªicmjûOÛn$Â÷EDBÚÉöÞÄl¸*òðÙ I$Â¦Ö>Å£éE-hÖ:â¢T	jïøÿ~",yrZ½ý[4m"³í1øçz¡b¢=M9"4àÎ©õóèfÎRÃrìëÔÄ¯Ð.>@äY@¬Û'Ïú¬¸0 4ü&ä¬ðn<Ï×¤ð±º/I¹;DùÐyJÛ§öB$Ó°Fj0cé%õG}ÕkùC¶nF¡»ìÍ¦±ûÖ¤T!7ÿo²¬}Ç¡Ûôø9Ö¥y'iÏ¾pÖUè¡ÅÇÖ6[æÇÓ¢ÚïS kh©M¬=M& ²¢ZõX=  Ì= ±£¬ì÷TaÁJÅôÁ"Ç´Ë=M[n³±®V³~®F7æ|óÕYlÖ¥õ:ãhÃóGhæ= ¸©á<â2	nÒvS-	_Y^ìA±U az\ =M¦ÌÛý~pWUß¤tù6À»022¬=Mªü Ú4Øs¶CXíâvËC¯û	Ì×:6ÔûcÛìý0X,80Jµ{0;6¼;Jzd;¹0ûPµ;;qfµ{6Ì»«À$= <;êâ¨å~èÂ§wìÛ;]¶r56´H@î'qRõ~0®è>øf%11á9û§4åïiG
þò¨qLgýö*¿ïÔÑÕqÜcý 3T÷L´"ü-Ìy,4¬:&4ëºF6-¸Ö£syP¿ðå/Ì(Sª
0Û)ß[3 >³qû¨úqZ¹o=}ºóZïV.&½ÚµÅ#ðÁâ¯¥L¡AF	4C ))ªÄÞtÕõ5>OJDwà ÇäÊmw=MÙ#¥G%åúÙçN= ±£®&õM0Éõqd5%Õ)ÆÎÚþ¯1ìÒ.ý>¾=}ü×<¬Ó=}¡=}Û¨}<ÈEAéÍ]çé¿$À9áv,çÜ-ÁöA¤»]gòPÒG>Ôâ³¹æ JzÜ³æZWÁ*È~õ@
ö	muÈã f:£	Y!­Ð Î.T=  ^&JãÀo.N¦ËXmàLý¾_ñ ØJc-Ðèù%wûU=}w0p]èH­¡¤JÿQá®Ó®½lUuÌþ}¥]³ÍÆ§/~²}_$>Òû bZ{æ!ö\!v<\@¶±]Ã¶Á#n)«Å{ÂnA«TþØjÍ³Æ^Ì[ lUÛI\#
6S UÀ
Ç~ç*e×Ýjsî¾Oûßb(úK
úôCmÀûEõ|yü$;YæóÍD= Ó9ÛqÆ·3& iÒ1Ò*èõ¶"["sÚ»*,ò6°¢á¨Èí>²ÈmªÓâ6LÁYÙ´r©JÜMÓËáÈ ¦W{O1{Ã@¬<Ó¨©ÊO5ÃéÜ´<¯949ìQàÅ¾wC;BÜùÅ®= ­¼~²lÅÈ¡ 
~z<Å7/¥;é698{-òÑê¬F$ÞÑï¸0\¦Ï'÷¥#|2ô¡¾c5<5ZÌÙÝ<'+µý¢ñt$sêrïï]uq®NÜ6 üMT.[¶j¼[º,'<°î²éñÅh4AÃeÎ0«;³JÙT´pR=M¨ÿ^¼ÍVÁ0ZiíæÔc§½Óãx,Ø±ÑsZÀàûïq]VMÃ8¯obè¹q¶­IÔæ*:XÜ®*h{ûË
r7¡Ü 5ÿ#û3¿\¤gN77´+ªôÐXÞ´W=}õÈ8Â$:6HÔ8¦ßò¦àïS1¯°»jQ¥ãJ­»ý$x®$ ô¹¥[ùï7LÔ_bÞgB(PÖ­º5:'£¡d¢á#´­jzÊçáz<XQ®52ùóPäôóWçU÷·fóÂ	æô4ú<Z¼9Îlú4\¾/¢5<ú<0<¼<7*\Àü¿<Ð¼®$T¼,	\ù4ô²r¶4¬;{¯<{íçh/¾(¶Y|oVê,ø¬®Iß¥,ø'ªÇ	~ÃÖËgÊ¿ã» öü7hüïø²~Ì·q}{7M¿i$yZ@ÒË¿"=MÎþ.,þÞxp«ÐØba5»ÍZÈ²nLèïºâl×ýÉ!ÓcÙMª_r»£Ô+ÙÔ¥ÉEÉÑJ4
6É¥bKyË8´	­'ð{7Å£\d1iûç5ÐNS0¸£q3Ùa|^ÞfrP¶@=}á+¿§ÜÚÁüDþ:¾ºÑ;nõ(éúX?~¢Ý­{5÷×~×Ï4}Ådè1¸¨Áj¨~ì.ã4JîÓ
ó3¶fij{^!ÊÑµµîã9j¯1(/çÂÌ¬µü{StÅ«n zúNÞ¥	z-jÀ)v3@ìZLÐ=M
àÓcáú[ö\É$_ÚÄXÜpÌ1qØ)²üegªoñÝ¸%Å×ÔCeLLÍX!Ùw¬ a8	D= ûÀX¯ôdZ6³°M8j]±G æ±³+ÑêëëKJ¯^:Kã«â¡O¦µÚè©2= *%È¢*¡àjÕAÇó/ãË*²Ê\äáûyiñ<AÝ±N¾£òÞ|^~¤LêExÙ¶=Mèþ²Áµ°1gØYBêvícõDq¯¯GÒv%a¨¡¢Y7D½âã|'õkÇ8v¾Åp4ÑæÅÛ;éÎ. I00À¤b?æÄÛÜ|= \IvP©#yÃçä.SsRkZÀ\p£Þ±BÏÑE­¼ p'+.ãý¼Ø>&÷D:$W;÷¿HDK=}U1ZÈQg$PWÏÿÈá²Ð?7¿§ÕÝ']°»]c×M=}Ìºìê¸ÊâoóK²R!:ú|z> m·ê½±8$÷Æ>ÊåXÙ©UDv{Ú¤VÝ9Y¾Õ-iá	ÄÇH£ã^nü{±s®£Ö§i~¹­Æ«r@xØo|ñ£ý­òô÷ú®ZôÛáP3kpÑ09j¸Èoßu"@{â&Uû Ñ¡´=}²'!£G#ã2Áp%#éHtÑå&uNPÖ ¢¿ØàLgÌýmZ¾H9¤~ñµ½ÊÓQæ³}ª¯G4¹)ÒÔðyß M?J3å1üa %àÁìýó'ç?W¸«7söâÔpÄ1èêìð#HÜÎ½ 6±´þ¼§ÐPÃ9{&©»|lûéÂÉLêWýÝÊk](=}÷úìaCå7²¬¼ê:õS»±ÌûwØ0$··ïðÿíÓhªâ3­¼ÐåoÛ¾GCæH4XÞéørºÑf*0EÞ¤ðéf É¬ZúMF7urKSÔ¢#JNÍ*ùöaêBÌûñáDb87ù>1PoVæÝzvºNÐNÓ¢ß=}jÃ.s?B¹Öüº !*¥¨NnéÒHºkë =M¢m£s=M[CCAÚ:'Kô1ÝVÄsµ4ès1úRÿE®{fccÏ^¶¾ÆÊHT6ágBèîÂ¶ÍßÍ§Ò £Òpä	 «[r!ïëèYKföáG$H{I@<c=M'«[Ñ¦^¿3Å&­xUþXÂ§BíaØ/æ9C}Õnú¡×ÆY)é©y3Ë WÕÒL«]É³X¼Öÿ5ºhá?sS¶]WS"ªð]æ³h@ª¹{"Wã}¦öªc®MØ/Â¯ÆÏVB¢ÙzàgüúOÆ²¿SWÏ
"×NQ$ÓÜ«ÚÒæ¶·<æfî,f'*\ÏýOÞo$ðe1ósª®ÅG-qã+ÝãîÔ$ÿóºkÉÔ=}v6m$*'»L^)=M4â
ª]î|)»w"úCGqTYíÎo×è¿âç\fwøLà8»7|W9­ÆÑÒ×'19I¶=Mf$½Â=M=MÄ7«çÞàVö©§æÙÂçÿ	poSó >i7E»·ï&÷îÌâeäwÞÃ¬à£Ï- jæd£VÔ.å5_HÇÇ«rJøC¿?IzÈMýu¿ø_üÞ«Dæ©¬WïòÅ£F9åVP= ÆÎr=}QlßgPçN~bh+¤6WJ×I¾ÛN¾obbùFâh¤nIätðÓ£JçÓ#B fU_X)´úbá©¤Ûïñ=}Çû¾«ÚiðN$òÎ¢D±ÇÎè*Þ'L4v7VÔyÛþ¦§ÍéÊØ¹ïûN8{µ;"þÍ/E°ÊkEiÑö©È¤Gò@/uÀc½p¿éân¯ôtoÀ]vêÔ¬,×Ñê2-ç)O¸gwXn/;ºÙS#æbO«o¼\Iþoáa_ï¯t_Öoò¤ãÝ¸	Z!=MgUAÐì= U·'Ë¶úNÃ4vÖaM#OX'ÅÒñ8æZäHòq¾7úp5v$kw´Æ°DÚx&%±ã°ÙRÚÒuHwH®c±c	%	;·yÏ4iðá[5L$= 9µ·³·1ê[³9ÙöÚû¨úÁîìè¥íÿwA;ç7:t~b®VDkm^î$ è¦Â½Ê±Ù^¿gÚÇõ¿«Ä¨}Tëªg\¯²Xï!³ò^{¡¤Xï
Ä)¥ÙLÃ=MMÃ)-^ÍÚ{¡öJ"ÓÍèºÃ(CªÊ{áE^åúÃ¥¸¯íÎ¹ªÃ#
ñnÀ6@È®cjÐÑb^Áî4ê[þs¥Ooûõ7úðû¨ð"xrey=}«¹³pz	^W2Wò2r§,gdþèÕÌRÐq¡gDVgqìsV O¬áÉwÅ	Ñó5¦øhÒÉÙæ÷pÝèE^!]éÉo¬SYÏýjðÄÝ{¤§¼Ù¹ÑTÓc wÇEãwmù×¼c®bPMéí/æGKÿÎØvÈuÄk(Dä;ê
çì°+~ Va$ÓI¡  ³4ð^q«QqNkú­¤Qr@"ëÛYÝWjËrô¦ÍW]Ab-QÅæLÎ"0h­÷ U ÔÎÑÌûÉªþ+«ªþr§Héæ6Â4ä9ÀÂ°ä	-±»EzPâù=M_ÿ§%Æi{<= 6Hvgañ×ÂÄ4àÞÀ¤ËÆ6fÀ_RëÔßóÛ_÷øNzoÞ7®ÞfY= PSªXs@c»ÇoÌ';mï»G5^ãªÐ¸?-
¾*¥["ÄÒ¬©¦¬¶þæWKîeèÔ×= §f®pv¨M¡d¡
aPï£Ïý×~ÄösmD¼Ào$XÔ¦ãÁ=}ÞTHøM3^Á·p=MGkm.R"3<Õ p7ªÚ×øºâ3¢+¢¥2íú?èXæz×³¨Ò²°TTJÅ8Êo|	è
ââaTÆO"åèM%TL´ÅÝ"W6h{K¥²$3µ0ßF9;ç2õÝe{x(1?æÞ§;1u¬ÅÖËÏ:¢QAáO¶}5$­¹íÂ­d*s8°ÖÛÚs]ßG©D¬¶Ð5Ï±9Ý	ÄRø µ@+íQ,LSZù¤ÀºR
P¨R|ê$Ú^O>ådÄ£ÝdGåZ}¨NÑ:Øäk*Grù[
¶}A£7î?ß~i>ÈþÌliïó
%'¸Ò¦'c)L±{Ôì*rw­=}æ¿6ø= Úü[iIðàò§k¼×S¡7Î¶ÕÓnUì¤§LË+µëÅÒ}(B=M©ö.ä¡Àâ×(EdêµÉSdJ:æç-¨¥'g¤¨Z¥Øm¡f¶ûáñãÝ·â~çæ3¹GÔ'ÒðTÜ.jõç³ùÞ]²m<Y	³âsCoQ;Ãn¶ I]u= @x£ºcYOY[/èRz#]Ì×·Ó= GÿMôe­ÿþCry$#	ý&ÜÐ9Ìy¿^Y±åÛmuÕÁIQ:NÔ8$QLB"
Êj¿oÄ¹äsË³ÌBé»öf~fpýÑä)÷WOu²e^Ta»EAÅ=M¼0*dú²Éhïq=MÚ«£/°âòvÂØËñaÚð<ª0»@« ;|*>uyK 50Óª¬ª)óuxÔ+CØÛ,§Ûºàèªóª¸Ú«¯#¹|1:|¼°e7]jÃ¡~e7]jòXò²Èñ|á9ìI±²¼"|p:Ü$»¾îÕ8Ø·#·µs±ÐÑ\Ü¸n 0à<G®ÈÙ¸haº^´êùKÓG¤úÔÐg£çÕn6G%Ì_Æúä¤eçÞ{èTºð£ñîx:jó%Õ¡èjOÚÙ©íä2Ì³á/lã¸pLÙ/#n°2©^JÓ¡]DÍ@ÀùÉôä R³0îînTÃàuÂ0õ¿Dµ¿ÒØ§QFÑ¾Lçßc[úNÚí¤Ë&X¤²aäôÎéJÙ´J´Ö\ò«2= »°\2ËK¨Ô5²)Uâ´¹X©}Zès¯v´®2ZòvßP jïâ°ØzËãÚÿ×g)pô6Tôü0"âHÔ$µ#/Q-UÌ-=}4®T´­Ht­RÔ®>$­G®ADíDxíV(íOmLpmF|D¹ÆnU¿LÍ¾;}±xqu?E²ZÒÀ¯eÀk¢~¶Z5_?ªXsIÿ´ÕÂjõ=}åG¥Cx»cyb'Ælî@ö6¯QÃHyð*-zÝG¯¡fòÿtuË¯ÁoC ®CÁª-nã \+ÿgÂÇåIH/NÜ*ài³=MdVc:ÄµÈâa·ð ÃñÏ0éOËpA |Þ]û^M®ÁÞWõM»aEÎL0W~U®qú,¯Óôðj'E7²±ü£×Pë­ªl0úÈ­NxÛt
ÏÁ Vy±q´Ú_= dF>ÜPU@Zà|Ý]'{,´4K2D&P´qè=MÄvZÕôÉm³ Ì)Q»àÐt0¬+	¦³æÂØ±½°eglb2/ÓÛÏÍSÐK7¯ÊáNÙ´DõøqÝÜÑÓeJï põû\#M´I$7ÒqÒ­YZhúÛ_RÖ VkÓ¯êÏËªÍ{Ö)Ð\7ÜÏÍÐé´áÐÁæ=M° !ú)Ã§÷V'!¢å³»èHV·=MòOÃÃÑsñâéÞÂS
ºIJl¬eæ¿Þøe6âÕ$´É&]á0ì¿Ê±H³0[WbC"se­=M}BDCõQÍj<}¼ ;n=M!d Ý,}´¨³*öWþyL.8i³Ê¤T0%Q	°Ã±íxÙ|Z.¦.³Éz STÚ3ëôá  ßª®Ó¡()Ö@í= U¼z0£¿éï¤lÔó·Âðªó*h ùj¬.©¸*ûlÐû¡ªãè÷;Ê,<Bp$Ù®®# ;"õtÿ?	¸Ê¸"G¸:Q4YPn|+gòyì ä£mÆµ= ©Âipé¹cFnN0Pº
ã¨òV0¢"E¢ðTî}x	=Mk(M ±ÕX±Aâàåâ[§®IrüUrúA2f§©V'7êÂLA Æíó ©8¹¾ô ¬7;üÒü{2ÿ$ÓH¹0ä-6ðÜã«#ïÜVXéÛ8ô*:h1ì4$âvÀªÚ_ü¼22ZÇEPàÉæß¾KC°md°kô/_P6ÄW²ù·*¦RB² ¥é©µùßëêl¶%ðE\TïÄúÂ÷ÙäÖ	'®õOÌéêêÊ{³ }!ëT/ »õwÜ #£9ÎR²j!ô öÍV±wÒõösyî4ÓQ'¥".WlÈwÊoô)ç×÷8[¸§_¬ªú\áðçÿM«ßP²ªnýÒ|&ÃõÕø¶Úæ9Âwêãæåí«Íè	g§×÷C³´Ôá®P3}^ìR+XwÁM£¯b»ßã
âÂÈÉ$tçÚÎ,#ÌÅoú<ÞJK$©+$ºãÐÌØòÖ È±©)ò"÷zeëÈüÚøÖ8¡«:	0É"t¯ü7bêÑòÈòØÒSsSáýæâdò$ÞdÖA®LQ3¦{àéûüåüòäRKÄÀ5CÆ=}ë uëPïúeÁ^¡/³u)MF	2ºMHÎÅWÈèh*â{@«i÷»Áú[[Ì´ä²¥Z=}Y«±%:| ÊÜÒzÊpwÍ&<¨àcà
6 ¬DÒ«íÉÈÉ÷ àÈ° 7þn'WJVJXÊU2ÉSXbàx¢òd câÒaïª?SBlºÑÎp1Yz¤(í-÷ÓWp¸|Fì·gß b'ê3\2ì7´zlmÞ:lÖ/m©F*Þkå6
n?5<ê¤VàIªHì²\zEÜZfÕ½Ó= v¼Ý|1$7:ìµ~m¼ÉÖ°1¹øK|óªó6ðªóªóªóªù)Ô²÷û°:ÎQÐá·cJµ§:[;¼"°á!{klÂ®ì èÐ6Ã´-»m³ì®ûßÚëâöc 7Ê³7hºã<°)|íZhbJæãålÆÛúÑÔã´6Ð'ZÛßì­ûñvï*vÔ/U$WaÌsû0Àyp)¼õ²£Ú= £Úþw,ïÎ]ÛaÏy4Æo¦Ò¢¡^"oþww\^ÖñÔ°Ì®_;¹ßTÚêµz8¬¹¾:¤µi!øÔ= Ü
ewÒ^l|Ý¦W|L\Õß.zÎz°HÑahttµvê2·&¦3»½ ®bÉ»Ü$b¤õPÆüÜY¢Z^vïß;÷;Å4¢õZy±x-R¼º(Ø8JP ts8oÅÏ+ãöÒ±áþbÈ©786÷áB¨SÅñ¹½¥8!¯º±ÁX&´ÌÙå<y°|¦÷(1L%­A8á4r4:s{¢Ñ1´*P, ÐµT8dµÒñT'À;¢â¬ßB¤:@9)-?kûÔûyM1øó/cþ{ãò«þ²Ù~8+aR»LßðõÌ%sõ©ýðuOº"·°c/áô ¦^{#S]=}õc³)öÞåöx.¹.cÃÂËBÐxR ouZ XZ¢ÖÖÃ(´Æâ¬óoÉ@\£HÎlïÁæxtÝ¡·7'£Ùth&Ç)7åvªq§EÐÙâU/.ß3Ð
÷í>¤¤c8c q§TïÔs/ÂÒcé$a§ÈÖx­¦TÍÒ~åÂ²9[MzÜò¹«(d&}èÜAD	Ï-õPÀ£+ãîÂ³<²«ô7®³AöôÐu¨åÉå¶9£=  àè&¥1=}GzÔQ|Q+$gg.×./U¼Ù2ppDÊ²Ý_ðÿ¦4àZüí?2¬ ö
¨<M»¢ó®Gn'¶R.£ÏFò ¥ýàéî§Xz #ñ$èäV~9T7¾ÉpºoðnçLBé+ªây2MôrÿiêºÁNåúÂsÓÜ®ö{ãÔV¥ 21¡Âä2mz¸p6&ËÔÜ¥Â·\Î^\{8bßu;M<%yH° <ª¡4¡ÐØTêêÀéÈ,Fî(@>Y.¦õ>Ôüu,XÚÈ,MÒ×$Q-E 7tzÆ¬üÛ)ÁÉ¾$­¼%%4z ðµY»Ä¸jWõò= <T_Ý2Á:ü³Oìø÷k»o!ÌQEnmnÁ9ªUêV{¯Öê\WÃ·hvÉÌ©U8ZÆy?ÿÚLõdf#øàDå£1vÃ]§= ÐÊgcÌýZE8§Øïïà3nU|6Â*C×ÍI2= !ÜzÎXxÆ=M¼ðÁ¤àwð=}Ô»]ÝýåZ1¦	¹ ¹Nê¢Ôy@P-VÅ=M<uwâZüÚ*¤Jè8¿âhpõüE úÒ.±?;N'C¼7Wô.Õ.gnK*ú[=}¸KJ)%ìÖ^qe,½M9fð­Há\ÿíºHÃ»hìÏÆBÓÞwË sÝzß£-?;|Þ?àìZ2n!D\m{½é[¢uBd»¾/ÅçÄÞzYm_øÐÜH>*/a\Þ¥bÌÿääKÈ§î,vè]±tI8Ä{þáãL@ä°àÈåÍ2AÆÒ.¶!4yíÁò[:¤LõTMÒÐ8ê²ü¤´.ÅÍ,½í,Üe/è4kûtyÈà¼l¯k¡û)Ì-¬ôÍ::¢;à5<©é¹¹u0 ©ó¶j ïõÁa²Á®9y
-rudù¯ÓµõäuoÁû³w[= üµÈ´µã]Ìßé]X­¼°Á¥Ìæi~*£snQjPÃíN.èoÕÂ^¯^hulØ$.:KÛíd£Å0%i÷íLOÉ!\wPä~q[4=}µÁ4Ù°·Á;YFÎ?@N-yý!PRèÔðHpµ@OúýU"àc´I{}Ñ9ª¥ öm:hßÎëÏ.XÌ*æ}ÑÂy[¹g^¾¡8A- 5å¶J 	ßÜy¿y@ uM¡×¾9lÉ~7oG<É1~¼aÌ[¾µÊSÝê|¤hpÝT[0p-o)*iñ^|z­Ôàr:Æ±!àä/N+\y;ô¯}9ly¡ðPq$êVY<Äÿ,"5,D0]'ýà2Êe0´ñÓû¸Y<¸Vý@^\i¾¤?¼&@ÉÇü,%C_98X-{ëpLÞ:;{DW<ÀTECë<¤îS24:d!%,Ã {ÿµp?/Æm,¶4AM¼GñòFQ¤Ìðl»åx9jVB.R/Eû¸½b%Þìkâ¤MÛvµmAT¹±Nøý°ÀJ^tÅ°ùÁ¢vèÍf5Èý!ª)æßeT[mN|äzTî·ZøÆ¯=}òü0wÜDFÈí#)ßPßcÁý´9+ü= R/¼F:Ë\VßüåR¡;!,½$4ßÑèê¹ÇÕ1{E|[&$,Å,ßÕÌ¹ôÃ¯Á¬ut0mï¥Y<ÝZ§øàYnuÇ7åm¼x¡BBÑ2Ø-/s]Ìl½¹ý3]|+HLñ|= [id9 .Ñ¤=}*<f7üUiäIÜq4l[[î[ý ¸fßT}­'·dÁi}ì¼9ì¼.¸,·K®¼Æºô±èöLõLÌ;FÁÿÔÜ¸.X6|a¦ýü¼8¼5;òhìõ@úP¬4YC8?Ë¶ÊùiôMñ<W>~0x©Ò7ÙõåØ©ËÌt²&ÿòõ8d<­Ò>kU)Ëòø«ï±¼m­)K-ïSòÊêúhfó~Æ~ôÀÑjªô	=MZW,9ØÛ°)§ÎØµª¡HYFÕÛ§­ìÛØQÉb/OG{%^G´Z¿e%Z²0â-÷¦¤1Gð«èUWÏÛh¾"×éê.AÑ¿4°RN5~øïkØ½,Ë%)XA;susÂ}=}l0?|<Å"ô EA¼zy0O¾V À E:{Òý8ÂÖwôFEë5Ç[Om<-?¦"8ÿ {N³©Õ}½¶QYÂñæKÂÝ;Ãö¸e·¦Ù0ãdÉúÙN"wt bQ!»Ñèâh·ÙÞ:Ü³N*Ùqù6 ì»rû©Jðsé9vKX;Yä9¨5¬üÏVldtñ6óÛ;BYzfh(2}cY¶A_3ÙKdK#ÑÜ»/{<ºÜ4>»¸%xÙbx
Ë ÙÞý¥ºr|-[6ç×@¯è«²	Ø?«ä#,=MÌW:CQ	X§ß£­L:ù ÃNeÑB0ñM½<{
·ÔúïmùÌø¿QÇØ÷W<³kÞí<&Ä:øö%¦!ö(ÛElmº´Å9\|t¹}þy{Yy¢½KÇ$!à+JÄ»gDI[Ußâ"'ëÕ%cIY&ÁTÑL¢ÕÏâßí°V	µU$3mpÿB§kv^Q£´.Áfbâ5Õº»9õä$zf©ÑºÖò½ÄVq¬ñiNlä ±¸Úe¡<p@ÿ¿T+êf9.²7îåðõÿ©Ñ<hGRz +¬NÅ.%¥ýTû\Bµ*ý¯àªQ$ì"[¿çÿé&ìäp'#¥[w= AQáÆÆ¬D6¤NPF{XÌñ
òEM¼ªÎWÂóÌðt-à4X²©GS K¿Úð5á²$(ÔüV,7÷TnNÔ*{|¯Ö>SÒ9tÔÿÊFÐK6'ÁßÆ= DíeEQBÈ¤÷ÞgÃVÐe³±Ø\_¬(Ît/è@Î
¾@/Qs4ÑØ<ì½Ã¤Xt}ÑfÜ´bMôÅj\²N­m=MùÉÖÅ"hVl%VXË*§øã¼= ãjr9·M´ùé<¿ß(0#Â 4Æp/ÒO­çÍínc=}nÎ[5ÔdÔbþH¶æàNmJÛðÍíDhe´lØ~c8¬¹kåóðÑý1y«ð2W]AòVà|+ijôå¶°?[= lúk­be4#"A¾|i~"jG6Aopy,TFÌ^CËüo6×ò¿ctKÃ A5K¦Bu~n7òøAsÎqQqB³Ô(«NíÚ×2õ&A£Mæ	(·]Ûgs¼[¸sü·­+¥jFç80ã3ÃI?à= «Ü4ÀíEÉt5#òòMn3".yà½d×%37ú^¼aN=Mî¼ÔßÊ£ödMÅvSû¼0ømyû®AOô:WÕ~ý1)P<5 â6B×(ìMð¤Æ_F;ºv4o>Ø¶</Ïä*ÄÐó­kN5¨ösúkþI¯7I v)÷Æïw¯ú*êî¹±jÃ½.æcCJy)lr+2ÎÈJ4:¨ð!A£Mtdq¤pFªÉÍ{­SèH),7gèÔÉôµNbñ ó;ßõª´XúmÀv3cÀázû$õâù;§ÈéóT¨ôü÷5÷àäm¨ûÞÜîAq²1¬vmÀ-ÈÄ$&6-­ÐR($dM­ºååÇØ¨= ¨PFÂnòPß­øÍdA«¹¦öºWn	m9.Q4ÓjK¸°ó·C¾òÓ*¸:÷ùÍ3.&o¸7Vio¿\LÈc×»¤ÝkÞ´Ï	n e¸,Gú¸õæxÜû¸Ì}¯¬/r¨¥¸É¬S¾j¹ø§Ô$>5$D°E9aL¡YIP|yòÖhî*y(äAéÔj\2eEût4ïh]æ3#ªÿáÞñ6¡F¾4®¶&ºN£UéÊæREÛ(çpkOõû,íØüà|[1ut!Ê#Üh¹&ÈzðÚOEµ^{{|In	÷b³ô<zÓMõÔíèsÜÀ8¤*õ°öÚýëµÀfîéô4:&úAqb¦÷ZKÕêÍz¬ÅE¬[°r°qÂÿF +SQÈ87ðµ9§ySÂ(ÐoK= Ã¦âÀn£'¬6ð¡o¢æ©9.â¿;¥&«"|fëØ¥Ê«»Y= ²Þm)ß%©ÌUÃkøttÁÄ8/
vP¾¿¸mÕäFí´-
Xe©wçØ{Å¿dÌH~^é~¹ýÒ= Å3ækú]/$:Û
»Ò*lêq>'2= |uiÜ÷\®¬ôlxÆÊîgºnÐNyØù~<ëm;8$	2¾Q&®w¿÷]1àïÍÿþ[6^üê7Ê= eñÅBé«>£oFÜ= hÙ|Ê*6XpeÉ×ùG$0Ü83ÐB4eå¼Ôï:ö¸w)Q}æÏEoÍ#ô7,+&-.	D¦À2QßH1ÀÌàWÂÐö\fAT­"Ë;Dò[Qí0f&;	M*Ü³ôhX976~sÔ0úù[0ðKv¸   |À¤)||ì5¼w(?ëêLucù ]	=M*õ¤³4â!Cøxs1n©·ðu¥mÓÅú¤³L)û8ÜZ{øòV[»6|$ÆÉ=MNu\¶c5ÖM6n.¡t}5êCëbÔçà9hí¯¬,K¤ü¯ÅG}bÝK~ã 3dâ ;oß¹B¥=MMh2µþ507ºÑH½»KÅvÌ2°áÌóybc¥ðëò 4yZs9#ðjï¢VxB"ôcèL,qÍÝ@±~L´æè :Wú»t-kÄåYÑ>Z[6<DñÕüº±fó"nåmé¿&4Ã¦.~Þ«­ÈG}bÝ©#ï.ÖC7¨ðß¹BÊúqaÀÎ16£¢
<ßÉj"Ï«ié4ô>{Wù/3a,K^koß©BZæß²¶= ¯óâ]=MÌÃ
 Þå+ª¦ùÄk%-PO'æ.)Í·|GK¶Å~Â®£Rjp³èÿÊ(ù5£ÈÇ~bÝçðx¯µý8)Èúö>&¿¯ Tõ÷¾ u¦ºäqß]µõ¿´ÌØë Kdàplµ7¦Íkå´Þú²	7Âµ wø¦Íkå¹yÌí¨õ¢Ò[±äÐkåuú5 õr¼¿JrùÀkåe¶ñïYä%gZ(«vå?kU7ëISp#MRÀoÝ 3¢5Â%ÖÆZ¢Rc>&¿Ë¼ÜVoîQ|f'8Ñ÷Ýg3i.ãO)52cièÖR&¿Wò ËS ÝÎÐÓÇ+9ÂsÑ÷Ýg4ä<èeÿðÊä4ºß8Ç±~DT´6Å8Ë¤"I«0T¢©æÞW÷í ÛÂubÑ­ÜªvåA{¬>#é+v=Mr=MçGgC¢}ªÔ! »yìnèè%PÆ±$ñ:y®ÄOxQi®*Ï¾Ï±~6Ú2ûTQµ$¤ôº¿¼Âj"Ïkåò» v»\7i³¤áÝÂ_Xc Úëæìmë+ûtÉôß= Úaåék»#
ÛÄv³c<[û¾q}RÃã-ÿ°®:ùÀãq©äIg>rÉ)ô(¢¯a1ûZ@êçíâCò;Ynö0UÜ2<ßÿês}÷Ý9.W¶¹¸4øy&ÑTÑ\ôyÄäÁTHês=MçÉj"Ï+su$Óx¬KuÀ\q:¯2³õ<áHg8ãé®¬-2
%ÕÔåðùÈÙ×¨°³­ýõÃW=Mb'û!ýàµ1Ç¨à:RóK½øºI»MüÎ4U7£KXgcß|l¡,»·»õ8@çGg=}r×¢² ÉåY9® ·¾Ì	Çx<X6á÷Pàô¬¶¦T+¸(sÏôöÝu1ø1ÍyB¤[=M»#~ëRÊsÍßø	×$¨Á\®¬t´ÖR4}xýGpÃü¹m<âË9j9ï#ÜÌÙb}9ï#Rð%/=}bøB¿cð0|1«
´FåOKj2+ut'má¢îl>o­e4¦>q&£ÕöSúÕ¬Ý×£{ñÐ+)º8Ä©oT¼BÑáþ2¦³¡8^ñþpò Êxê¿gÅøóé9Uï4ëYZ¿k\Ñ^2Fñë¼&õÙX-W³÷6:´ÚVÊc*0#>Ò½WD|ÝØ ,)LlÞ´B\>grc!6vã2:·C;ÿ¨´>²¸Ú²uæ
hKx
½AJ,»F[c(T#ÛK R±~6Ð#~Ì= {6F&¾gîöò¿°Î3Î·¥
ÔQe@³ôuLVÃyvV^LÝ¤Bg	aûæm7aVà#¦÷úßÏRå{7'ô1(ý-O÷Ýã3X:ËeÌñ{ÀÐL¦Å~V~± ¦§bÏÙRÓç >åméß#,ð/*L²kM"¿}âtDãSÝ$¼-©ãs&OÒy·)ÅÇt{»Úë-?÷ÝéùîÇ=M'Y<ÁXrZÝÿ©ðkÎ=MÁUÌ	rT?w»-\®åÝérÝð÷1º¶oìAæ:Ü\B~?W>|JFfÈ»ÆÀùè*&pÌ°Ë.Ùá!.ÀÓ·z4YçÝç=MfÒN#áÛJjgD½W74ÆÒà0µþBà%2PÀoÝiôÎ¬¤ö6ÝndJy²J2Ñs<!8ÔÛo&¿ïÛ;§y&w'/»=}èÆÏÑJçqèú|£r4eb¥ï­å1	9¦tÔDJÒôá»CÆÀ-8iÞîì+¡»ãLFe¼Ù½?R·;¿ Ï#tCå?1V©vr§¢|àîÄ|úAÝI%$ "0%ï<ò1×Lq ÅÍV¦ÊkÃµºÝ#â÷ÝTXlUÀ[·6»ÉÐJÞHg÷øÑä~,(Ë\6rÔëEÑ>"¨Öç£±Î Þ¨áTIgHÀ	v¤ÛSÒéçÏ%Ag>*ºâSÂ'Ü$2´ðeÜ±~Ü&Ü²ÞiÀ%ìK±áHïÖñÄ	®ù+Ö{´\9£©æK*è±§V+¡xBR4î|Ì¿È¤GT$²ß(º?á(1%j´'Ø2¿o£º×\9}ãàøð3v5s­Ïv-;¡}É~EÇ?=}µèïVªS©I'¼¬íÅ~<lìß)â)¢ÍzØ)âDÛÏ
J²D½ ?ò{	!i¬¼[F=MD<z¾¾º8èÈ3lÂÞ¹¹t7´÷b<&½ï¬ *ç1)Ï«5íô3Ìâ[¡¤FáïÔy/ÕT!SÖaMÿ=}1÷´Ä;æ\OG¿ð¯<uB²6[¡Ë¦|zx¬H©*ÅLZXÃ4Úé&j#ý·ZÄÅpÇåÙö¹ÚýGÐ=M§~°A\ñiÖâÃ½ö5ýApÿ^m$NÖO º$1f;×J­e	ö¢A¤ÄU(¨F;G;êqsl¾¦Ôkñ=M_H½%xÐ6øÂ=}q/](à7>ÍyB.uÊ1ÕÇ¡íþÎ^}í×ä¬¾µ@%uúoún#¼´DÑRºÈFwÌÓWXsQ¡íårOo?ãY×üÀ¾õøî-Â ÿx¤NBÿAÝøþ«Wb±Jý¹SbU¨ÐÇ_¦=M~ÄÆôhD2ý+ãIÍ|ä$q$¦=}½~ý<ðeM7 qË°9%ëècÿé©f ÌÑA)Kwí§¬G¯õgå¬Y4Ù)Öf7AÆ´7IÈú8üûmÉtV±Ê Þ{+^¼ÿC)¿¶±¿BÞSY*ñ]ºL|Ç6{Çó;a!Ïm5É!Ïe¹7¯xQÆwã
ú.òs%ú°ä}°HlÇ<·iÅÚ\lÜ´ÉùËõIÃÀ-,ÚÔY\Rñ0mðÃð­E.ÞìØïÃÐ+·OÌ#ÅÇW(ßÿ
	ü.¼ó?Ü%oqçãÆØSÄ'MòòÇ1ÆuÛPß·Ôq¨N7nFïÞÿ5J°eIq£ÿÑ5¹#4"[¦-ôû+XýþµÌHÞI2óÞ"ý¢"WgrËÎ¾ëÐZõNSuÊ$X2u°UÐÒÍ¼l½9Éa	Ù\/÷Øp/'uª*¢2nZsyý´³Û´"r¢pí·[°Êê !sÓiYH= ì0¯eWôvNáõG:rÚÝéöÇ.ØEÒë°@(b­ð¶½§ Sò³aÓ¸ ñ=MG¸ ðW= ;Òd¾²åÒ:-IÜi¦OÞÇhFÚn½ë:x\	ÅôÕn>¶Ì8¡HXv(«ÌôSÏæq:XóB°ã_Qþ\;úÚ°<õUú1±ÓNð(pPz­ëÚªÐfÖ4åMÝµ°XÀdeàu*EÈè5äNäÈÄ}êÀDK¶¥¹¶e&¢¹zX«º÷ÈLõ1÷ÏXòÅPÆä¹àr7OÔÍ×~õ¯6à¼6A h-ts}ÔVD.¶zOà÷³åÿ«pw= µPÜð¸n_9àL++ãQ3o ­{[æ(õÛUt åà%âAn &©¾Þm¡áDmPÈÕÛºÍ
ìD9¥Yz¾&5
F)Ìd<t´T	 ó!tbØ=MrxÅÈèyNø (sÅúNþu©²VûÊ/Um£&ÜÕð.>T7^bËÔT¨\ßf³Iôþ¼Î¬ÿøê)8ÞÜ}Ã¨SÍ%âºk¶Hv5	Ø-ãE±t:OóÆõ>·r¶ônÐòRp:¡GÿaMÄq³ªYõ^WòèìN¬ô©_ïaaK¶Â!qïk!Yj:ðn|e2êé~ÊÅ(S°,£«!:Ò«Q_æÙA@Ä«ÿA5^	ð	£5ÖGºyïFÇ5uÞô0e¢kIïFtPªà.rþ_I&gqkâhóÇ×ù	æ=  é¾ã!= ñ4 Xà| VrÜSpÛÞÅ¼X<§£ò{Ç¸Ê^ëkâ,ô8²óÑ±ÝRÅ^¨àøVäÿnßqúUÑæõKz½¦ÀA°)ßÏÇ¹[ÿrÖhËâXU8 h;ÀÆ7?8z 0¸uo¨N
ýôöx­uTû'NÚ¢sÿ£q ³Ï×Í¯üU]9­UØ¢¦0"ÊÎ%ñ	µu´ÕùB®®ZÉó{ð¿¥S¨ói;ÈÞçå(z»û)= ß"tNbºù÷KéésíÂûº:¥È^-m~zIä´·ºË@û»aµ÷ÑzÌ¤ëJzDHc°° jI(ë÷ëÌ= ï+BÁdVú»whR,®º[sE£ /ÁÑ6@5ÉNLì/òGb|´Ií|ÈThv¢©Ç5µ½§¥Kµú}ð¼XÀÅî « ââ­&1ºIa<Ì°Z¾b´uËnòä´^+úIº¤rq®c6HÿÓßI8¥+þ¤9R9= c^.Ø(â.1ÛiÚ#j~,¸NÌÔa¶= >VäUãÐ''Ëï
B	På\r½Êÿm«óÞ±T¨QU]#16kÓÛ0I9Ïbb¤êeðÚÉ¥è|ãp8dÌ§<ÄZ>èuï÷ÎãO= Ðgó%>è6é¾"\ÜÃ0S´+R´TëûXïË\V£ªÌÝ§\º¬¶:åÀn>òé|qV.d1|Ëþ8V$8§ÅPldýªp{¶T¦-xÃ2c¼§Qù&öÚÂ3*ûý#.)ßIØH.o­BØX= Î¢Ô÷q~¨ VÝêÆÚ&(hþ¢'¤×¿6=Máþ²çÏ·n!èb.ãq£÷ÍÜ¶Ö2ïe%î²O÷kNá·à.ÛÊòQ(&Ð×)ô/"Õk¬\)Þt|ÈÜ+ß|6cCS?	xoñ&\³2/¨ÓtC WÍüÄvfiYÌË°h¢rÌÍ¡Ã¨µbé£ÿÏR	<í¿YÚÔR%ê(Îü6P¬'Nk¾;= ×¹#ãrAÈË-òÅ¶Þrq= u@úæÜñ+qS´yã¦¤oTÓnt)dkßúù®ÓÅnãÕ$Êþ= ëR$t)Û*(= 	Ðb!?Ì¢.OÖþ×ÈEK]9a»r¢±)b9´_63¥©ñwÖäØj.µ¬, *i¼ËügBöx®+{
-îRuðÙwLb6h[¼ý	ó1øù¢ÕjÈ= Æ<vÎ8"ã¢ãÄîbà é=MNÌù\w¼7PßxAÄÿdY¡8\N¡ú¢È|ÓR%¹ÌaoîâévpÎf®TeKÍ_²h×ÿµzR¯uÀ*Ay¬¦^.n\PàÕÐÃèEGUÈ² o÷3à)/×ö¹Ä2~á¦	 /ÌY³ô|_e}±ü Û]11fsº1_£døì¢ ùÉ¦×+îÊ¤Ci³M)+IÍçSî:hµ;J·ËØê<êÏä:ô©î:³è<5Þü9ËWü9|;Õ6tI,-×.ºD~ôÊÃ×ªâÿ
7õîcò4¾.üÇøDöß]Iý$¶ªêÊæªóªóª8óª0V2©7Y*a"ÜÆ®rôB8S]ELrrW·¬ðTùÄC*m2Q1{2+b÷ñEËÏXBÖó
ÛäHî¸Ø'µìy§ªÜPQïçÒZ>00ëÜ9e]2¡µJ°AVÀÛ§íÐkdpHÿ­uü5óö*!x÷Æòã5é WùÂ¹nÓ6d°«ÃBê?2ØÔùÃP°*my:ç·³ùø³..)^¤þø§ HD½ã&-ßÞÔþ[~ÄzÄ56§Ù®ÞÆnôØ|ÀútÓ¯<síÒy^(³N·Z*÷Ýâ/Wúð¨¶Xîø­y³Æ¤ú ñõqK§a;/ð??À¿ U	@isÄ HÁ_îgÐhÑgòèXÉc0LÙ<<"<è¨¥E6T÷	= $+²J%ÆÌÜµéF·[Åý¿>á}^{VmªC^LQµkX'Å øð\­ÙlóBTYL,I!dhT_NO= FÏ_VÏ= B_¼æÍWîÎC¦ÎK&Î>VÎFÖ"L#jÆ¶¨çùjn¬Ë¶¤ç;ë\%<h6-ãÁ¡©B=}ò}X/BÏM-.=}³½ÄQ9Å¨óTð{ñ_=}KúuÂ¤90©®
5Ï>`});

var HEAPU8, HEAPU32, wasmMemory;

function updateMemoryViews() {
 var b = wasmMemory.buffer;
 HEAPU8 = new Uint8Array(b);
 HEAPU32 = new Uint32Array(b);
}

/** @type {function(...*):?} */ function _INT123_compat_close() {
 abort("missing function: INT123_compat_close");
}

_INT123_compat_close.stub = true;

var _emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);

var abortOnCannotGrowMemory = requestedSize => {
 abort("OOM");
};

var _emscripten_resize_heap = requestedSize => {
 HEAPU8.length;
 abortOnCannotGrowMemory();
};

var UTF8Decoder = new TextDecoder("utf8");

var _fd_close = fd => 52;

var _fd_read = (fd, iov, iovcnt, pnum) => 52;

function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
 return 70;
}

var printCharBuffers = [ null, [], [] ];

/**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */ var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
 var endIdx = idx + maxBytesToRead;
 var endPtr = idx;
 while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
 return UTF8Decoder.decode(heapOrArray.buffer ? heapOrArray.subarray(idx, endPtr) : new Uint8Array(heapOrArray.slice(idx, endPtr)));
};

var printChar = (stream, curr) => {
 var buffer = printCharBuffers[stream];
 if (curr === 0 || curr === 10) {
  (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
  buffer.length = 0;
 } else {
  buffer.push(curr);
 }
};

var _fd_write = (fd, iov, iovcnt, pnum) => {
 var num = 0;
 for (var i = 0; i < iovcnt; i++) {
  var ptr = HEAPU32[((iov) >> 2)];
  var len = HEAPU32[(((iov) + (4)) >> 2)];
  iov += 8;
  for (var j = 0; j < len; j++) {
   printChar(fd, HEAPU8[ptr + j]);
  }
  num += len;
 }
 HEAPU32[((pnum) >> 2)] = num;
 return 0;
};

var wasmImports = {
 /** @export */ a: _INT123_compat_close,
 /** @export */ b: _emscripten_memcpy_js,
 /** @export */ f: _emscripten_resize_heap,
 /** @export */ d: _fd_close,
 /** @export */ c: _fd_read,
 /** @export */ g: _fd_seek,
 /** @export */ e: _fd_write
};

function initRuntime(wasmExports) {
 wasmExports["i"]();
}

var imports = {
 "a": wasmImports
};

var _malloc, _free, _mpeg_frame_decoder_create, _mpeg_decoder_feed, _mpeg_decoder_read, _mpeg_frame_decoder_destroy;


this.setModule = (data) => {
  WASMAudioDecoderCommon.setModule(EmscriptenWASM, data);
};

this.getModule = () =>
  WASMAudioDecoderCommon.getModule(EmscriptenWASM);

this.instantiate = () => {
  this.getModule().then((wasm) => WebAssembly.instantiate(wasm, imports)).then((instance) => {
    const wasmExports = instance.exports;
 _malloc = wasmExports["j"];
 _free = wasmExports["k"];
 _mpeg_frame_decoder_create = wasmExports["m"];
 _mpeg_decoder_feed = wasmExports["n"];
 _mpeg_decoder_read = wasmExports["o"];
 _mpeg_frame_decoder_destroy = wasmExports["p"];
 wasmMemory = wasmExports["h"];
 updateMemoryViews();
 initRuntime(wasmExports);
 ready();
});

this.ready = new Promise(resolve => {
 ready = resolve;
}).then(() => {
 this.HEAP = wasmMemory.buffer;
 this.malloc = _malloc;
 this.free = _free;
 this.mpeg_decoder_feed = _mpeg_decoder_feed;
 this.mpeg_decoder_read = _mpeg_decoder_read;
 this.mpeg_frame_decoder_create = _mpeg_frame_decoder_create;
 this.mpeg_frame_decoder_destroy = _mpeg_frame_decoder_destroy;
});
return this;
};}

function MPEGDecoder(options = {}) {
  // injects dependencies when running as a web worker
  // async
  this._init = () => {
    return new this._WASMAudioDecoderCommon()
      .instantiate(this._EmscriptenWASM, this._module)
      .then((common) => {
        this._common = common;

        this._sampleRate = 0;
        this._inputBytes = 0;
        this._outputSamples = 0;
        this._frameNumber = 0;

        this._input = this._common.allocateTypedArray(
          this._inputSize,
          Uint8Array,
        );

        this._output = this._common.allocateTypedArray(
          this._outputSize,
          Float32Array,
        );

        const decoderPtr = this._common.allocateTypedArray(1, Uint32Array);
        this._samplesDecodedPtr = this._common.allocateTypedArray(
          1,
          Uint32Array,
        );
        this._sampleRatePtr = this._common.allocateTypedArray(1, Uint32Array);
        this._errorStringPtr = this._common.allocateTypedArray(1, Uint32Array);

        const error = this._common.wasm.mpeg_frame_decoder_create(
          decoderPtr.ptr,
          options.enableGapless === false ? 0 : 1, // default to enabled
        );

        if (error) {
          throw Error(this._getErrorMessage(error));
        }

        this._decoder = decoderPtr.buf[0];
      });
  };

  Object.defineProperty(this, "ready", {
    enumerable: true,
    get: () => this._ready,
  });

  this._getErrorMessage = (error) =>
    error + " " + this._common.codeToString(this._errorStringPtr.buf[0]);

  // async
  this.reset = () => {
    this.free();
    return this._init();
  };

  this.free = () => {
    this._common.wasm.mpeg_frame_decoder_destroy(this._decoder);
    this._common.wasm.free(this._decoder);

    this._common.free();
  };

  this.decode = (data) => {
    let output = [],
      errors = [],
      samples = 0;

    if (!(data instanceof Uint8Array))
      throw Error(
        "Data to decode must be Uint8Array. Instead got " + typeof data,
      );

    feed: for (
      let dataOffset = 0, dataChunkLength = 0;
      dataOffset < data.length;
      dataOffset += dataChunkLength
    ) {
      const dataChunk = data.subarray(dataOffset, this._input.len + dataOffset);
      dataChunkLength = dataChunk.length;
      this._inputBytes += dataChunkLength;

      this._input.buf.set(dataChunk);

      // feed data in chunks as large as the input buffer
      let error = this._common.wasm.mpeg_decoder_feed(
        this._decoder,
        this._input.ptr,
        dataChunkLength,
      );

      if (error === -10) {
        continue feed; // MPG123_NEED_MORE
      }

      // decode data in chunks as large as the input buffer
      read: while (true) {
        this._samplesDecodedPtr.buf[0] = 0;

        error = this._common.wasm.mpeg_decoder_read(
          this._decoder,
          this._output.ptr,
          this._output.len,
          this._samplesDecodedPtr.ptr,
          this._sampleRatePtr.ptr,
          this._errorStringPtr.ptr,
        );

        const samplesDecoded = this._samplesDecodedPtr.buf[0];
        this._outputSamples += samplesDecoded;

        if (samplesDecoded) {
          samples += samplesDecoded;
          output.push([
            this._output.buf.slice(0, samplesDecoded),
            this._output.buf.slice(samplesDecoded, samplesDecoded * 2),
          ]);
        }

        if (error == -11) {
          continue read; // MPG123_NEW_FORMAT, usually the start of a new stream
        } else if (error === -10) {
          continue feed; // MPG123_NEED_MORE
        } else if (error) {
          const message = this._getErrorMessage(error);
          console.error("mpg123-decoder: " + message);

          this._common.addError(
            errors,
            message,
            0,
            this._frameNumber,
            this._inputBytes,
            this._outputSamples,
          );
        }
      }
    }

    return this._WASMAudioDecoderCommon.getDecodedAudioMultiChannel(
      errors,
      output,
      2,
      samples,
      this._sampleRatePtr.buf[0],
    );
  };

  this.decodeFrame = (mpegFrame) => {
    const decoded = this.decode(mpegFrame);
    this._frameNumber++;
    return decoded;
  };

  this.decodeFrames = (mpegFrames) => {
    let output = [],
      errors = [],
      samples = 0,
      i = 0;

    while (i < mpegFrames.length) {
      const decoded = this.decodeFrame(mpegFrames[i++]);

      output.push(decoded.channelData);
      errors = errors.concat(decoded.errors);
      samples += decoded.samplesDecoded;
    }

    return this._WASMAudioDecoderCommon.getDecodedAudioMultiChannel(
      errors,
      output,
      2,
      samples,
      this._sampleRatePtr.buf[0],
    );
  };

  // constructor

  // injects dependencies when running as a web worker
  this._isWebWorker = MPEGDecoder.isWebWorker;
  this._WASMAudioDecoderCommon =
    MPEGDecoder.WASMAudioDecoderCommon || WASMAudioDecoderCommon;
  this._EmscriptenWASM = MPEGDecoder.EmscriptenWASM || EmscriptenWASM;
  this._module = MPEGDecoder.module;

  this._inputSize = 2 ** 16;
  this._outputSize = 2889 * 16 * 2;

  this._ready = this._init();

  return this;
}

class MPEGDecoderWebWorker extends WASMAudioDecoderWorker {
  constructor(options) {
    super(options, "mpg123-decoder", MPEGDecoder, EmscriptenWASM);
  }

  async decode(data) {
    return this.postToDecoder("decode", data);
  }

  async decodeFrame(data) {
    return this.postToDecoder("decodeFrame", data);
  }

  async decodeFrames(data) {
    return this.postToDecoder("decodeFrames", data);
  }
}

assignNames(MPEGDecoder, "MPEGDecoder");
assignNames(MPEGDecoderWebWorker, "MPEGDecoderWebWorker");

export { MPEGDecoder, MPEGDecoderWebWorker };
