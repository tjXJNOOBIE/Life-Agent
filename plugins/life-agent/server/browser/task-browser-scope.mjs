export async function runWithTaskBrowserRuntime(runtime, operation) {
  if (!runtime || typeof runtime.destroy !== 'function') throw new Error('task browser runtime is required');
  if (typeof operation !== 'function') throw new Error('operation is required');

  let operationError = null;
  try {
    return await operation(runtime);
  } catch (error) {
    operationError = error;
    throw error;
  } finally {
    try {
      await runtime.destroy({ reason: operationError ? 'root-task-failed' : 'root-task-complete' });
    } catch (teardownError) {
      if (!operationError) throw teardownError;
    }
  }
}
