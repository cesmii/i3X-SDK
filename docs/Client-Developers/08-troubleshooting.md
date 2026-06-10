# Troubleshooting Common Issues

## Troubleshooting Common Issues

### Issue: Rate Limiting

**Symptoms**: 429 Too Many Requests responses

**Note**: Rate limiting is server-specific behavior; the i3X specification does not define a 429 response.

**Solution**: Implement exponential backoff and respect retry-after headers

```javascript
const fetchWithBackoff = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status !== 429) {
      return response;
    }
    
    const retryAfter = response.headers.get('Retry-After') || Math.pow(2, i);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  }
  
  throw new Error('Max retries exceeded');
};
```

### Issue: Feature Not Supported (HTTP 501)

**Symptoms**: HTTP 501 Not Implemented response

**Solution**: Check server capabilities via `GET /info` before calling optional features. History, update, and streaming subscriptions are optional.

```javascript
const info = await fetch('https://api.i3x.dev/v1/info').then(r => r.json());

if (!info.result.capabilities.query.history) {
  console.warn('This server does not support historical queries');
  // Fall back to current values only
}
```

### Issue: Partial Results (HTTP 206)

**Symptoms**: HTTP 206 Partial Content response from value or history queries

**Explanation**: The server reached its internal depth limit before completing the requested `maxDepth`. This is not an error — the response contains valid data, just not as deep as requested.

**Solution**: Process partial results normally. To retrieve the missing composition data, issue follow-up requests targeting the specific `elementId`s that were not fully expanded:

```javascript
const response = await fetch('https://api.i3x.dev/v1/objects/value', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ elementIds, maxDepth: 5 })
});

if (response.status === 206) {
  console.warn('Partial results returned — server depth limit reached');
}

const data = await response.json();
// data.results contains the partial results — still process them
```

### Issue: Large Data Set Handling

**Solution**: Use time-bounded queries and subscriptions for streaming

```javascript
// For historical data, use time-bounded queries
const getHistoryInChunks = async (token, elementIds, startTime, endTime) => {
  const response = await fetch('https://api.i3x.dev/v1/objects/history', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      elementIds: elementIds,
      startTime: startTime,
      endTime: endTime,
      maxDepth: 1
    })
  });

  const data = await response.json();
  return data.results;
};

// For real-time streaming, use subscriptions
// Note: subscription management uses flat POST endpoints — subscriptionId goes in the body
const streamObjectData = async (token, elementIds, callback) => {
  // Create subscription
  const createRes = await fetch('https://api.i3x.dev/v1/subscriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: 'my-app-001', displayName: 'Stream Monitor' })
  });
  const createData = await createRes.json();
  const subscriptionId = createData.result.subscriptionId;

  // Register objects to monitor (clientId and subscriptionId in body)
  await fetch('https://api.i3x.dev/v1/subscriptions/register', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: createData.result.clientId, subscriptionId, elementIds, maxDepth: 1 })
  });

  // Stream via SSE (only if server advertises stream support)
  const streamRes = await fetch('https://api.i3x.dev/v1/subscriptions/stream', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: createData.result.clientId, subscriptionId })
  });

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();

  const read = async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          callback(JSON.parse(line.slice(6)));
        }
      }
    }
  };

  read();
  return { subscriptionId };
};
```

### Issue: Subscription Returns 404 on Sync or Stream

**Symptoms**: A previously working subscription suddenly returns 404 Not Found from `/subscriptions/sync` or `/subscriptions/stream`

**Explanation**: Servers delete subscriptions that receive neither a `/sync` call nor an active SSE stream within their Time-To-Live (TTL) interval. Once deleted, a subscription cannot be revived — all queued values are discarded.

**Solution**: Poll `/sync` more frequently than the server's TTL. On a 404, re-create the subscription, re-register your objects, and optionally backfill the gap with a `/objects/history` query:

```javascript
const data = await syncResponse.json();
if (syncResponse.status === 404) {
  // Subscription expired — re-create and re-register
  const { subscriptionId } = await subscribeToObjects(token, elementIds, callback);
  // Optionally backfill missed values via POST /objects/history
}
```

### Issue: Unexpected `success: false` in Bulk Results

**Symptoms**: Top-level `success` is false even though some items succeeded

**Explanation**: In bulk operations, the top-level `success` is false if *any* item fails. Check individual items in `results`:

```javascript
const data = await response.json();

// Don't just check data.success — inspect each result
const succeeded = data.results.filter(r => r.success);
const failed = data.results.filter(r => !r.success);

if (failed.length > 0) {
  console.warn('Some items failed:', failed.map(r => ({
    elementId: r.elementId,
    detail: r.responseDetail?.detail
  })));
}

// Process successful results
succeeded.forEach(r => processValue(r.elementId, r.result));
```
