'use client';

import { useEffect, useState } from 'react';

function retryDelay(value) {
  if (value === null) return 0;
  if (/^\d+$/.test(value)) return Number(value) * 1000;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : 0;
}

export default function Page() {
  const [token, setToken] = useState('');
  const [model, setModel] = useState('gpt-image-2');
  const [prompt, setPrompt] = useState('A ceramic mug on an oak table');
  const [referenceImageUrl, setReference] = useState('');
  const [quote, setQuote] = useState(null);
  const [cap, setCap] = useState('');
  const [operation, setOperation] = useState('');
  const [current, setCurrent] = useState(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const input = { model, prompt, referenceImageUrl };

  useEffect(() => {
    if (!retryAt) return;
    const timer = setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => clearTimeout(timer);
  }, [retryAt]);

  async function call(path, body) {
    const result = await fetch('/api/' + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + token, ...(body && { 'Content-Type': 'application/json' }) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const delay = retryDelay(result.headers.get('Retry-After'));
    if (delay) setRetryAt(Date.now() + delay);
    const data = await result.json();
    if (!result.ok) throw new Error(data.error ?? `Request failed (${result.status})`);
    return data;
  }

  async function run(action) {
    setPending(true);
    setMessage('');
    try { await action(); }
    catch (error) { setMessage(error.message); }
    finally { setPending(false); }
  }

  function update(setter, value) {
    setter(value);
    setQuote(null);
    setCap('');
  }

  async function requestQuote() {
    const result = await call('quote', input);
    setQuote(result);
    setOperation(crypto.randomUUID());
    setCurrent(null);
  }

  const resultUrl = current?.output?.[0]?.url;
  const outputHref = typeof resultUrl === 'string' &&
    (resultUrl.startsWith('https://') || (current.mode === 'mock' && resultUrl.startsWith('/fixture/')))
    ? resultUrl : null;

  return (
    <main>
      <header>
        <a href="https://i2v.ai/docs">i2v.ai documentation</a>
        <h1>Generate media from your app</h1>
        <p>Quote a specific request, set your USD limit, and keep the operation ID for recovery.</p>
      </header>
      <section aria-labelledby="request-title">
        <h2 id="request-title">Media request</h2>
        <label>Application token
          <input type="password" value={token} onChange={e => update(setToken, e.target.value)} autoComplete="off" />
        </label>
        <label>Model
          <select value={model} onChange={e => {
            setReference('');
            update(setModel, e.target.value);
          }}>
            <option value="gpt-image-2">GPT Image 2</option>
            <option value="seedance-2-mini">Seedance 2 Mini</option>
          </select>
        </label>
        <label>Prompt
          <textarea value={prompt} onChange={e => update(setPrompt, e.target.value)} maxLength={2000} />
        </label>
        {model === 'seedance-2-mini' && <label>Reference image URL
          <input type="url" value={referenceImageUrl} onChange={e => update(setReference, e.target.value)} />
        </label>}
        <button disabled={pending || !token} onClick={() => run(requestQuote)}>Get quote</button>
        {quote && <div className="quote">
          <p>{quote.mode === 'mock' ? 'Simulated quote' : 'Maximum reservation'} <strong>${quote.maximum.amount} USD</strong></p>
          <label>Approved USD limit
            <input inputMode="decimal" value={cap} onChange={e => setCap(e.target.value)} />
          </label>
          <button disabled={pending || !cap || !operation || !!current} onClick={() => run(async () =>
            setCurrent(await call('submit', { ...input, operationId: operation, expectedRevision: quote.expectedRevision, maxCostUsd: cap }))
          )}>Submit within this limit</button>
        </div>}
      </section>
      <section aria-labelledby="task-title">
        <h2 id="task-title">Task status</h2>
        <label>Operation ID
          <input value={operation} onChange={e => {
            update(setOperation, e.target.value);
            setCurrent(null);
          }} />
        </label>
        <div className="actions">
          <button disabled={pending || !token || !operation} onClick={() => run(async () =>
            setCurrent(await call('task?operationId=' + encodeURIComponent(operation)))
          )}>Check status</button>
          <button disabled={pending || !token || !operation} onClick={() => run(async () =>
            setCurrent(await call('recover', { operationId: operation }))
          )}>Recover submission</button>
          {['retryable', 'not_found'].includes(current?.receipt?.status) && <button disabled={pending || !!retryAt} onClick={() => run(async () =>
            setCurrent(await call('replay', { operationId: operation }))
          )}>Replay original submission</button>}
        </div>
        {!!retryAt && <p role="status">Wait until {new Date(retryAt).toLocaleTimeString()} before replaying this submission.</p>}
        {current && <p role="status">{current.mode === 'mock' ? 'Simulated · ' : ''}
          {current.lifecycle?.phase ?? current.status ?? current.receipt?.status ??
            (current.recoveryRequired ? 'Acceptance unknown. Recover the original submission.' : 'Task accepted.')}
          {current.taskId && <> · <code>{current.taskId}</code></>}
        </p>}
        {outputHref && <a href={outputHref} target="_blank" rel="noreferrer">Open generated media</a>}
      </section>
      {message && <p role="alert">{message}</p>}
    </main>
  );
}
