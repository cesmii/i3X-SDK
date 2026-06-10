# Performance Optimization

## Performance Optimization

### 1. Batch Requests

When possible, batch multiple operations using `elementIds` arrays:

```javascript
// Batch read current values for multiple objects
const batchReadObjects = async (token, elementIds) => {
  const response = await fetch('https://api.i3x.dev/v1/objects/value', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      elementIds: elementIds,
      maxDepth: 1  // Control recursion depth
    })
  });

  const data = await response.json();
  return data.results;
};

// Batch read object metadata
const batchGetObjects = async (token, elementIds) => {
  const response = await fetch('https://api.i3x.dev/v1/objects/list', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ elementIds })
  });

  const data = await response.json();
  return data.results;
};
```

### 2. Control Recursion Depth

Use the `maxDepth` parameter to limit data retrieval for compositional hierarchies:

```javascript
const getObjectWithChildren = async (token, elementIds, depth = 1) => {
  const response = await fetch('https://api.i3x.dev/v1/objects/value', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      elementIds: elementIds,
      maxDepth: depth  // 0 = infinite, 1 = no child recursion, 2+ = limited depth
    })
  });

  // Check for HTTP 206 — server hit its own depth limit
  const isPartial = response.status === 206;
  const data = await response.json();

  return { results: data.results, isPartial };
};
```

### 3. Time-Bounded Historical Queries

When querying historical data, always specify time bounds to limit result size:

```javascript
const getHistoricalData = async (token, elementIds, startTime, endTime) => {
  const response = await fetch('https://api.i3x.dev/v1/objects/history', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      elementIds: elementIds,
      startTime: startTime,  // RFC 3339 format
      endTime: endTime,
      maxDepth: 1
    })
  });

  const data = await response.json();
  return data.results;
};
```

### 4. Prefer Sync over Stream for Reliability

For applications where data loss is unacceptable, use the sync endpoint instead of SSE streaming. Sync uses sequence numbers to guarantee delivery even if the client crashes:

```javascript
// Reliable polling with sequence number acknowledgment
// Pass lastSequenceNumber from the previous response; omit on the first call
const pollSubscription = async (token, clientId, subscriptionId, lastSequenceNumber) => {
  const body = { clientId, subscriptionId };
  if (lastSequenceNumber !== undefined) {
    body.lastSequenceNumber = lastSequenceNumber;
  }
  const response = await fetch('https://api.i3x.dev/v1/subscriptions/sync', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  // HTTP 206 = queue overflowed, some updates were dropped
  if (response.status === 206) {
    console.warn('Subscription queue overflowed — some updates were dropped');
  }

  const data = await response.json();
  return data.result;  // Array of {sequenceNumber, updates: [...]} batches
};
```

### 5. Cache Static Data Aggressively

Namespaces, object types, and relationship types change rarely. Cache them with a long TTL:

```javascript
const TYPE_CACHE_TTL = 300000; // 5 minutes

const getCachedObjectTypes = (() => {
  let cache = null;
  let cacheTime = 0;

  return async (token) => {
    if (cache && Date.now() - cacheTime < TYPE_CACHE_TTL) {
      return cache;
    }
    const response = await fetch('https://api.i3x.dev/v1/objecttypes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    cache = data.result;
    cacheTime = Date.now();
    return cache;
  };
})();
```
