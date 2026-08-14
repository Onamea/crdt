import { WORKER_SOURCE } from "./sandbox.worker.js";
/**
 * Security layers applied by sandbox.worker.ts
 * ─────────────────────────────────────────────
 * 1. WebWorker thread isolation – user code runs in a separate OS thread with
 *    no access to the main thread's memory, DOM, or module scope.
 * 2. Primordial freezing (SES-like) – all shared built-in prototypes
 *    (Object.prototype, Function.prototype, Array.prototype, …) are frozen
 *    before user code runs, preventing prototype-pollution attacks such as
 *      Object.prototype.valueOf = () => globalThis
 * 3. Function.prototype.constructor redirect – replaced with a throwing stub
 *    before freezing, closing the prototype-chain escape:
 *      [].constructor.constructor("return fetch")()  →  throws TypeError
 * 4. eval / Function neutralisation – both are shadowed to `undefined` on
 *    `self`, so indirect eval `(0, eval)(…)` and bare `Function(…)` throw.
 * 5. `with` + Proxy confinement – a Proxy whose `has` trap always returns
 *    `true` forces every free-variable lookup (including `globalThis`, `self`,
 *    `eval`) through our `get` trap, which returns only allow-listed values.
 * 6. Global shadowing – fetch, WebSocket, Deno, postMessage, Atomics, timing
 *    functions, and more are overwritten with `undefined` on `self`.
 * 7. Isolated `this` – user function called via `.call(Object.create(null))`
 *    so `this` is an empty null-prototype object, not WorkerGlobalScope.
 * 8. Timeout – the Worker is forcibly terminated after `timeoutMs`.
 */
/**
 * Evaluates `code` in an isolated WebWorker sandbox and returns whether the
 * user-supplied function returned `true` for the given `body`.
 *
 * The worker is spawned from a Blob URL so no file-system permission is needed.
 * It is always terminated (and the Blob URL revoked) once a result or error is
 * received, or when `timeoutMs` elapses.
 *
 * @throws {Error} if the code is syntactically invalid, does not evaluate to a
 *   function, throws at runtime, or the worker does not respond within `timeoutMs`.
 */
export const runInSandbox = (code, body, timeoutMs = 5000) => new Promise((resolve, reject) => {
    const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url, { type: "module" });
    const cleanup = () => {
        worker.terminate();
        URL.revokeObjectURL(url);
    };
    const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Sandbox execution timed out"));
    }, timeoutMs);
    worker.onmessage = ({ data }) => {
        clearTimeout(timer);
        cleanup();
        if (data.ok === false) {
            reject(new Error(data.error));
        }
        else {
            resolve(data.value);
        }
    };
    worker.onerror = ({ message }) => {
        clearTimeout(timer);
        cleanup();
        reject(new Error(message ?? "Worker error"));
    };
    worker.postMessage({ code, body });
});
