// Worker source for the JavaScript sandbox.
// This module exports the module-Worker script as a string so the caller can
// create a Blob URL — keeping the worker code portable across Deno and browsers
// without requiring any file-system permissions.
export const WORKER_SOURCE = `(function () {
  // ── Step 1: Capture safe references BEFORE any mutation ─────────────────
  // Everything the sandbox infrastructure needs must be captured here so that
  // subsequent hardening steps cannot accidentally break sandbox plumbing.
  var _Function                  = Function;
  var _defineProperty            = Object.defineProperty;
  var _freeze                    = Object.freeze;
  var _create                    = Object.create;
  var _hasOwn                    = Object.prototype.hasOwnProperty;
  var _getOwnPropertyDescriptor  = Object.getOwnPropertyDescriptor;
  var _ownKeys                   = Reflect.ownKeys;
  var _getPrototypeOf            = Object.getPrototypeOf;
  var _WeakSet                   = WeakSet;
  var _Proxy                     = Proxy;
  // Capture postMessage before we shadow it so our handler can still reply.
  var _postMessage               = self.postMessage.bind(self);
  // Capture generator/async constructors BEFORE any redirect or freeze.
  // These are not reachable by name, only via function-expression instances.
  var GeneratorFunction          = (function* () {}).constructor;
  var AsyncFunction              = (async function () {}).constructor;
  var AsyncGeneratorFunction     = (async function* () {}).constructor;

  // ── Step 2: Neutralise dynamic code evaluation ───────────────────────────
  // Redirect Function.prototype.constructor to a throwing stub BEFORE freezing
  // primordials. This closes the prototype-chain escape:
  //   [].constructor.constructor  ->  Array -> Function.prototype.constructor
  // After this, that chain resolves to restrictedFunction which throws.
  function restrictedFunction() {
    throw new TypeError("Function constructor is not allowed in sandbox");
  }
  function restrictedEval() {
    throw new TypeError("eval is not allowed in sandbox");
  }
  // Redirect .constructor on all function-creating prototypes to the stub.
  // This closes the escape: (function*(){}).constructor("return fetch")()
  var FN_PROTOTYPES = [
    _Function.prototype,
    GeneratorFunction.prototype,
    AsyncFunction.prototype,
    AsyncGeneratorFunction.prototype,
  ];
  for (var _pi = 0; _pi < FN_PROTOTYPES.length; _pi++) {
    try {
      _defineProperty(FN_PROTOTYPES[_pi], "constructor", {
        value: restrictedFunction,
        writable: false,
        configurable: false,
      });
    } catch (_) {}
  }

  // ── Step 3: Transitively freeze all reachable intrinsics ─────────────────
  // Rather than a hand-curated list, we walk the complete object graph
  // reachable from all known ECMAScript intrinsic roots and freeze every
  // object encountered. This mirrors the SES harden() strategy and covers
  // TypedArrays, iterator prototypes, Intl, WebAssembly, accessor functions,
  // and anything else reachable that a hand-written list might miss.
  (function freezeIntrinsics() {
    var visited = new _WeakSet();
    var queue = [];

    function enqueue(val) {
      if (val === null || val === undefined) return;
      var t = typeof val;
      if (t !== "object" && t !== "function") return;
      if (visited.has(val)) return;
      queue.push(val);
    }

    function processNext() {
      var obj = queue.pop();
      if (visited.has(obj)) return;
      visited.add(obj);
      try { _freeze(obj); } catch (_) {}
      // Walk all own properties (string + symbol keys) via descriptors so that
      // accessor functions (get/set) are also reached and frozen.
      try {
        var keys = _ownKeys(obj);
        for (var i = 0; i < keys.length; i++) {
          try {
            var desc = _getOwnPropertyDescriptor(obj, keys[i]);
            if (!desc) continue;
            if ("value" in desc) enqueue(desc.value);
            if (desc.get) enqueue(desc.get);
            if (desc.set) enqueue(desc.set);
          } catch (_) {}
        }
      } catch (_) {}
      // Walk up the [[Prototype]] chain so inherited objects are also frozen.
      try { enqueue(_getPrototypeOf(obj)); } catch (_) {}
    }

    // Seed: all named ECMAScript intrinsic roots. The transitive walk will
    // automatically reach every prototype, method, accessor, and iterator
    // prototype reachable from these.
    var ROOTS = [
      // Fundamental
      Object, Function, Array, String, Number, Boolean, Symbol,
      RegExp, Date, Math, JSON, Reflect,
      // Errors
      Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError,
      // Collections
      Map, Set, WeakMap, WeakSet,
      // Buffers and DataView
      ArrayBuffer, DataView,
      // Typed arrays (walking ArrayBuffer won't reach TypedArray subclasses)
      Int8Array, Uint8Array, Uint8ClampedArray,
      Int16Array, Uint16Array,
      Int32Array, Uint32Array,
      Float32Array, Float64Array,
      // Async / generators (covers %IteratorPrototype% via prototype chain)
      Promise,
      GeneratorFunction, AsyncFunction, AsyncGeneratorFunction,
    ];

    // Optional globals — present in some environments but not others.
    var OPTIONAL_NAMES = [
      "BigInt", "BigInt64Array", "BigUint64Array",
      "FinalizationRegistry", "WeakRef",
      "Atomics", "SharedArrayBuffer",
      "Intl", "WebAssembly",
    ];
    for (var _oi = 0; _oi < OPTIONAL_NAMES.length; _oi++) {
      var _opt = self[OPTIONAL_NAMES[_oi]];
      if (_opt !== undefined && _opt !== null) ROOTS.push(_opt);
    }

    for (var _ri = 0; _ri < ROOTS.length; _ri++) {
      enqueue(ROOTS[_ri]);
    }
    while (queue.length > 0) {
      processNext();
    }
  }());

  // ── Step 4: Shadow dangerous globals on self ─────────────────────────────
  // Defence-in-depth: even if a proxy escape is found, these globals are gone.
  var SHADOW_KEYS = [
    // Network / I/O
    "fetch", "XMLHttpRequest", "WebSocket",
    // Worker-specific
    "importScripts", "open", "close",
    // Deno namespace
    "Deno",
    // Storage / inter-thread messaging
    "caches", "indexedDB", "localStorage", "sessionStorage",
    "serviceWorker", "BroadcastChannel", "postMessage",
    // Dynamic code execution
    "eval", "Function",
    // Timing (prevents async side channels and eval-after-timeout tricks)
    "setTimeout", "setInterval", "clearTimeout", "clearInterval",
    "queueMicrotask", "requestAnimationFrame",
    // Shared-memory timing attacks
    "Atomics", "SharedArrayBuffer",
    // Fingerprinting / side channels
    "performance", "crypto",
  ];
  for (var _si = 0; _si < SHADOW_KEYS.length; _si++) {
    try { self[SHADOW_KEYS[_si]] = undefined; } catch (_) {}
  }

  // ── Step 5: Proxy confinement ─────────────────────────────────────────────
  // Explicit allow-list. Only these identifiers resolve inside user code.
  var SAFE = {
    Math:                 Math,
    JSON:                 JSON,
    String:               String,
    Number:               Number,
    Boolean:              Boolean,
    Object:               Object,
    Array:                Array,
    Map:                  Map,
    Set:                  Set,
    WeakMap:              WeakMap,
    WeakSet:              WeakSet,
    Date:                 Date,
    RegExp:               RegExp,
    Error:                Error,
    TypeError:            TypeError,
    RangeError:           RangeError,
    ReferenceError:       ReferenceError,
    SyntaxError:          SyntaxError,
    parseInt:             parseInt,
    parseFloat:           parseFloat,
    isNaN:                isNaN,
    isFinite:             isFinite,
    encodeURI:            encodeURI,
    decodeURI:            decodeURI,
    encodeURIComponent:   encodeURIComponent,
    decodeURIComponent:   decodeURIComponent,
    Symbol:               Symbol,
    undefined:            undefined,
    Infinity:             Infinity,
    NaN:                  NaN,
  };

  // A Proxy whose 'has' trap always returns true forces all free-variable
  // lookups in the 'with' block — including globalThis, self, eval — through
  // our 'get' trap, which returns only allow-listed values.
  var sandboxProxy = new _Proxy(_create(null), {
    has: function () { return true; },
    get: function (_target, key) {
      if (key === Symbol.unscopables) return undefined;
      var k = String(key);
      return _hasOwn.call(SAFE, k) ? SAFE[k] : undefined;
    },
  });

  // ── Step 6: Message handler ───────────────────────────────────────────────
  self.onmessage = function (event) {
    var code = event.data.code;
    var body = event.data.body;
    try {
      // Built via the captured _Function so the real Function constructor is
      // used here (it is not accessible to user code).
      var wrap   = _Function("__sb__", "with (__sb__) { return (" + code + ") }");
      var userFn = wrap(sandboxProxy);
      if (typeof userFn !== "function") {
        _postMessage({ ok: false, error: "Code must evaluate to a function" });
        return;
      }
      // Null-prototype object as 'this' — no path back to WorkerGlobalScope.
      var result = userFn.call(_create(null), body);
      _postMessage({ ok: true, value: result === true });
    } catch (err) {
      _postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  };
}());
`;
