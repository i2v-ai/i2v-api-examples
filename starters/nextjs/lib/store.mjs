import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(path);
  database.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS jobs (
      tenant TEXT NOT NULL,
      operation TEXT NOT NULL,
      provider_key TEXT UNIQUE NOT NULL,
      credential TEXT NOT NULL,
      payload TEXT NOT NULL,
      task_id TEXT UNIQUE,
      result TEXT,
      PRIMARY KEY (tenant, operation)
    );
    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL
    );
  `);
  const owned = database.prepare('SELECT * FROM jobs WHERE tenant = ? AND operation = ?');
  const byTask = database.prepare('SELECT * FROM jobs WHERE task_id = ?');
  const insert = database.prepare(
    'INSERT INTO jobs (tenant, operation, provider_key, credential, payload) VALUES (?, ?, ?, ?, ?) ON CONFLICT(tenant, operation) DO NOTHING',
  );
  const attach = database.prepare(
    'UPDATE jobs SET task_id = ? WHERE tenant = ? AND operation = ? AND (task_id IS NULL OR task_id = ?)',
  );
  const writeResult = database.prepare('UPDATE jobs SET result = ? WHERE task_id = ?');
  const logDelivery = database.prepare(
    'INSERT INTO deliveries VALUES (?, ?) ON CONFLICT(id) DO NOTHING',
  );
  const transaction = (fn) => {
    database.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      database.exec('COMMIT');
      return result;
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  };
  const updateTerminal = (task) => {
    const job = byTask.get(task.taskId);
    if (!job || (job.result && ['success', 'fail'].includes(JSON.parse(job.result).status))) {
      return false;
    }
    writeResult.run(JSON.stringify(task), task.taskId);
    return true;
  };

  return {
    close: () => database.close(),
    owned: (tenant, operation) => owned.get(tenant, operation),
    add(tenant, operation, providerKey, credential, payload) {
      return transaction(() => ({
        created: insert.run(tenant, operation, providerKey, credential, payload).changes === 1,
        job: owned.get(tenant, operation),
      }));
    },
    attach(tenant, operation, taskId) {
      if (typeof taskId !== 'string' || !taskId) throw new Error('Missing task ID.');
      if (!attach.run(taskId, tenant, operation, taskId).changes) {
        throw new Error('The operation already has a different task ID.');
      }
    },
    result: (task) => transaction(() => updateTerminal(task)),
    delivery(eventId, task) {
      return transaction(() => {
        if (!byTask.get(task.taskId)) return false;
        if (logDelivery.run(eventId, task.taskId).changes) updateTerminal(task);
        return true;
      });
    },
  };
}
