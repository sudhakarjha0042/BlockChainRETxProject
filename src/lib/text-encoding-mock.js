// This is a mock for text-encoding that Gun tries to load
module.exports = {
  TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : function TextEncoder() {
    this.encode = function(str) {
      const buf = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        buf[i] = str.charCodeAt(i);
      }
      return buf;
    };
  },
  TextDecoder: typeof TextDecoder !== 'undefined' ? TextDecoder : function TextDecoder() {
    this.decode = function(buf) {
      return String.fromCharCode.apply(null, buf);
    };
  }
};
