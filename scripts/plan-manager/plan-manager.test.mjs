import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';

import { PlanManager, createAbortableDelay, isPlanAbortError } from './PlanManager.mjs';

function delay(ms, signal) {
  return createAbortableDelay(ms, { signal });
}

test('runs tasks sequentially and returns their results', async () => {
  const order = [];
  const plan = new PlanManager([
    async ({ step }) => {
      order.push(`start-${step.index}`);
      await delay(10);
      order.push(`end-${step.index}`);
      return 'first';
    },
    async ({ step }) => {
      order.push(`start-${step.index}`);
      await delay(5);
      order.push(`end-${step.index}`);
      return 'second';
    },
  ]);

  const results = await plan.run();
  assert.deepEqual(results, ['first', 'second']);
  assert.deepEqual(order, ['start-0', 'end-0', 'start-1', 'end-1']);
});

test('cancel stops the current task and prevents further work', async () => {
  const plan = new PlanManager([
    async ({ signal }) => {
      await delay(100, signal);
    },
    async () => {
      throw new Error('Should not run second task when aborted');
    },
  ]);

  const runPromise = plan.run();
  setTimeout(() => plan.cancel(), 20);

  await assert.rejects(runPromise, (error) => isPlanAbortError(error));
});

test('external abort signal cancels the plan and active task', async () => {
  const external = new AbortController();
  let cleanedUp = false;

  const plan = new PlanManager([
    async ({ signal }) => {
      try {
        await delay(100, signal);
      } finally {
        cleanedUp = true;
      }
    },
  ]);

  const runPromise = plan.run({ signal: external.signal });
  setTimeout(() => external.abort(), 15);

  await assert.rejects(runPromise, (error) => isPlanAbortError(error));
  assert.equal(cleanedUp, true);
});

test('pressing escape on the configured input aborts the plan', async () => {
  const input = new PassThrough();
  const plan = new PlanManager([
    async ({ signal }) => {
      await delay(100, signal);
    },
  ], { stdin: input });

  plan.listenForEscape({ input });

  const runPromise = plan.run();
  setTimeout(() => {
    // Emit the escape character as if it came from a TTY.
    input.write('\u001b');
  }, 20);

  await assert.rejects(runPromise, (error) => isPlanAbortError(error));
});

test('onStep callbacks fire for each task exactly once', async () => {
  const calls = [];
  const plan = new PlanManager([
    async () => 'ok',
    async () => 'done',
  ]);

  const results = await plan.run({
    onStepStart(step) {
      calls.push(`start-${step.index}`);
    },
    onStepComplete(step) {
      calls.push(`end-${step.index}-${step.result}`);
    },
  });

  assert.deepEqual(results, ['ok', 'done']);
  assert.deepEqual(calls, ['start-0', 'end-0-ok', 'start-1', 'end-1-done']);
});
