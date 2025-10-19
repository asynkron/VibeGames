const ESCAPE_KEY = '\u001b';

// Utility helpers kept close to the PlanManager implementation so the public
// surface stays tiny while tests can still exercise the tricky bits.

function createAbortError(message = 'Aborted') {
  if (typeof DOMException === 'function') {
    return new DOMException(message, 'AbortError');
  }
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function isAbortError(error) {
  if (!error) return false;
  if (error.name === 'AbortError') return true;
  if (typeof error.code === 'string' && error.code.toUpperCase() === 'ABORT_ERR') return true;
  return false;
}

function waitForAbort(signal) {
  if (!signal) {
    return {
      promise: new Promise(() => {}),
      cleanup() {},
    };
  }

  if (signal.aborted) {
    return {
      promise: Promise.reject(signal.reason ?? createAbortError()),
      cleanup() {},
    };
  }

  let handler;
  const promise = new Promise((_, reject) => {
    handler = () => {
      reject(signal.reason ?? createAbortError());
    };
    signal.addEventListener('abort', handler, { once: true });
  });

  return {
    promise,
    cleanup() {
      if (handler) signal.removeEventListener('abort', handler);
    },
  };
}

function forwardAbort(source, target) {
  if (!source || !target) return () => {};

  const forward = () => {
    if (target.signal.aborted) return;
    const reason = source.reason ?? createAbortError();
    try {
      target.abort(reason);
    } catch (_) {
      /* ignore */
    }
  };

  if (source.aborted) {
    forward();
    return () => {};
  }

  source.addEventListener('abort', forward, { once: true });
  return () => source.removeEventListener('abort', forward);
}

export class PlanManager {
  constructor(tasks = [], options = {}) {
    this.tasks = Array.isArray(tasks) ? [...tasks] : [];
    this.stdin = options.stdin ?? (typeof process !== 'undefined' ? process.stdin : null);
    this.logger = options.logger ?? console;
    this._currentController = null;
    this._escapeDisposer = null;
    this._isRunning = false;
  }

  addTask(task) {
    if (typeof task !== 'function') {
      throw new TypeError('Task must be a function that returns a promise.');
    }
    this.tasks.push(task);
  }

  setTasks(tasks) {
    this.tasks = Array.isArray(tasks) ? [...tasks] : [];
  }

  cancel(reason = createAbortError()) {
    if (!this._currentController) return;
    if (this._currentController.signal.aborted) return;
    this._currentController.abort(reason);
  }

  listenForEscape({ input = this.stdin, autoResume = true } = {}) {
    if (!input) return () => {};

    const handleData = (chunk) => {
      const data = chunk?.toString?.('utf8') ?? '';
      for (let i = 0; i < data.length; i += 1) {
        if (data[i] === ESCAPE_KEY) {
          this.cancel();
          break;
        }
      }
    };

    let rawModeWasEnabled = false;
    if (typeof input.setRawMode === 'function') {
      try {
        rawModeWasEnabled = input.isRaw ?? false;
        input.setRawMode(true);
      } catch (_) {
        /* ignore */
      }
    }

    let resumeCalled = false;
    if (autoResume && typeof input.resume === 'function') {
      input.resume();
      resumeCalled = true;
    }

    input.on('data', handleData);

    const dispose = () => {
      input.off('data', handleData);
      if (typeof input.setRawMode === 'function') {
        try {
          input.setRawMode(rawModeWasEnabled);
        } catch (_) {
          /* ignore */
        }
      }
      if (resumeCalled && typeof input.pause === 'function') {
        input.pause();
      }
    };

    this._escapeDisposer = dispose;
    return dispose;
  }

  async run({ signal, onStepStart, onStepComplete } = {}) {
    if (this._isRunning) {
      throw new Error('PlanManager is already running.');
    }

    this._isRunning = true;
    this._currentController = new AbortController();
    const runController = this._currentController;
    const externalSignals = [];

    if (signal) externalSignals.push(signal);

    const results = [];

    try {
      const total = this.tasks.length;

      for (let index = 0; index < this.tasks.length; index += 1) {
        const task = this.tasks[index];
        if (typeof task !== 'function') continue;

        if (runController.signal.aborted) {
          throw runController.signal.reason ?? createAbortError();
        }
        if (signal?.aborted) {
          throw signal.reason ?? createAbortError();
        }

        const stepInfo = { index, total };
        if (typeof onStepStart === 'function') {
          try {
            onStepStart(stepInfo);
          } catch (err) {
            this.logger?.warn?.('onStepStart callback failed', err);
          }
        }

        // Each task gets its own AbortController so nested async work can
        // observe cancellation independently of the overall plan.
        const taskController = new AbortController();
        const tearDown = [
          forwardAbort(runController.signal, taskController),
          ...externalSignals.map((src) => forwardAbort(src, taskController)),
        ];

        const { promise: abortPromise, cleanup: abortCleanup } = waitForAbort(taskController.signal);

        let result;
        try {
          // Mirror the existing race behaviour but ensure we also stop the
          // task promise by triggering its abort signal.
          result = await Promise.race([
            Promise.resolve().then(() => task({ signal: taskController.signal, step: stepInfo })),
            abortPromise,
          ]);
        } catch (error) {
          abortCleanup();
          tearDown.forEach((fn) => fn());
          if (taskController.signal.aborted) {
            throw taskController.signal.reason ?? createAbortError();
          }
          throw error;
        }

        abortCleanup();
        tearDown.forEach((fn) => fn());

        if (taskController.signal.aborted) {
          throw taskController.signal.reason ?? createAbortError();
        }

        results.push(result);

        if (typeof onStepComplete === 'function') {
          try {
            onStepComplete({ ...stepInfo, result });
          } catch (err) {
            this.logger?.warn?.('onStepComplete callback failed', err);
          }
        }
      }

      return results;
    } finally {
      if (this._escapeDisposer) {
        try {
          this._escapeDisposer();
        } catch (_) {
          /* ignore */
        }
        this._escapeDisposer = null;
      }
      this._isRunning = false;
      this._currentController = null;
    }
  }
}

export function isPlanAbortError(error) {
  return isAbortError(error);
}

export function createAbortableDelay(ms, { signal } = {}) {
  if (typeof ms !== 'number' || Number.isNaN(ms)) {
    throw new TypeError('Delay must be a number of milliseconds.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (signal && typeof signal.removeEventListener === 'function') {
        signal.removeEventListener('abort', onAbort);
      }
      fn();
    };

    const onAbort = () => {
      finish(() => {
        reject(signal.reason ?? createAbortError());
      });
    };

    const timer = setTimeout(() => {
      finish(() => resolve());
    }, ms);

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}
