// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from "worker-loader!./timerWorker.js";

export class TimerWorker {
  setTimeout(callback, timeoutMs) {}
  clearTimeout(callbackId) {}
  terminate() {}
}

export function createTimerWorker() {
  const callbacks = new Map();

  const worker = new Worker();

  worker.onmessage = (event) => {
    const callback = callbacks.get(event.data.callbackId);
    if (!callback) {
      return;
    }
    callbacks.delete(event.data.callbackId);
    callback();
  };

  let nextCallbackId = 1;

  function setTimeout(callback, timeoutMs = 0) {
    const callbackId = nextCallbackId++;
    callbacks.set(callbackId, callback);
    worker.postMessage({ callbackId, timeoutMs });
    return callbackId;
  }

  function clearTimeout(callbackId) {
    if (!callbacks.has(callbackId)) {
      return;
    }
    worker.postMessage({ callbackId });
    callbacks.delete(callbackId);
  }

  function terminate() {
    callbacks.clear();
    worker.terminate();
  }

  return { setTimeout, clearTimeout, terminate };
}
