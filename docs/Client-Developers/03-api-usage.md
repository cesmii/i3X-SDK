# API Patterns and Usage

## API Patterns and Usage

### Common Operations

#### 0. Checking Server Capabilities

Before making requests, discover what the server supports. `GET /info` requires no authentication:

```javascript
const getServerInfo = async () => {
  const response = await fetch('https://api.i3x.dev/v1/info', {
    headers: { 'Accept': 'application/json' }
  });
  const data = await response.json();
  return data.result;  // { specVersion, serverVersion, serverName, capabilities }
};

// Check before calling optional features
const info = await getServerInfo();
if (info.capabilities.query.history) {
  // Safe to call /objects/history
}
if (info.capabilities.subscribe.stream) {
  // Safe to use SSE streaming
}
```

#### 1. Discovering Available Objects

Query the API to discover what manufacturing objects are available:

```javascript
const discoverObjects = async (token) => {
  const response = await fetch('https://api.i3x.dev/v1/objects', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  const data = await response.json();
  return data.result;
};
```

You can also explore available namespaces and object types:

```javascript
// Get all namespaces
const getNamespaces = async (token) => {
  const response = await fetch('https://api.i3x.dev/v1/namespaces', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.result;
};

// Get all object types (optionally filtered by namespace)
const getObjectTypes = async (token, namespaceUri = null) => {
  const url = namespaceUri
    ? `https://api.i3x.dev/v1/objecttypes?namespaceUri=${encodeURIComponent(namespaceUri)}`
    : 'https://api.i3x.dev/v1/objecttypes';
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.result;
};
```

#### 2. Reading Object Values

Retrieve current values from manufacturing objects using POST. Note that the `elementIds` field is always an array:

```javascript
const readObjectValues = async (token, elementIds, maxDepth = 1) => {
  const response = await fetch('https://api.i3x.dev/v1/objects/value', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      elementIds: elementIds,
      maxDepth: maxDepth  // 0 = infinite recursion, 1 = no child recursion
    })
  });

  const data = await response.json();
  // data.results is an array of per-item results matching request order
  // Each item: { success, elementId, result: { isComposition, value, quality, timestamp, components } }
  return data;
};

// Retrieve historical data
const readObjectHistory = async (token, elementIds, options = {}) => {
  const response = await fetch('https://api.i3x.dev/v1/objects/history', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      elementIds: elementIds,
      startTime: options.startTime || new Date(Date.now() - 3600000).toISOString(),
      endTime: options.endTime || new Date().toISOString(),
      maxDepth: options.maxDepth || 1
    })
  });

  // HTTP 206 means server hit its depth limit — results are partial
  if (response.status === 206) {
    console.warn('Partial results: server depth limit reached');
  }

  return await response.json();
};
```

#### 3. Querying Multiple Objects

Retrieve multiple objects by their element IDs:

```javascript
const getObjectsByIds = async (token, elementIds) => {
  const response = await fetch('https://api.i3x.dev/v1/objects/list', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      elementIds: elementIds
    })
  });

  const data = await response.json();
  return data.results;
};

// Get related objects
const getRelatedObjects = async (token, elementIds, relationshipType = null) => {
  const response = await fetch('https://api.i3x.dev/v1/objects/related', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      elementIds: elementIds,
      relationshiptype: relationshipType,
      includeMetadata: true
    })
  });

  const data = await response.json();
  return data.results;
};
```

#### 4. Subscribing to Real-time Updates

Subscription management uses flat POST endpoints with `clientId` and `subscriptionId` in the request body. Sync (reliable polling) is required on all servers; streaming (SSE) is optional.

```javascript
const CLIENT_ID = 'my-app-001';  // Stable unique identifier for this client

// Create a subscription and use sync for reliable polling
const subscribeToObjects = async (token, elementIds, callback) => {
  // Step 1: Create a subscription — clientId is required
  const createResponse = await fetch('https://api.i3x.dev/v1/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      clientId: CLIENT_ID,
      displayName: 'Dashboard Monitor'
    })
  });

  const createData = await createResponse.json();
  const subscriptionId = createData.result.subscriptionId;

  // Step 2: Register objects to monitor
  await fetch('https://api.i3x.dev/v1/subscriptions/register', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      clientId: CLIENT_ID,
      subscriptionId: subscriptionId,
      elementIds: elementIds,
      maxDepth: 1
    })
  });

  // Step 3: Open SSE stream for real-time updates (only if server advertises stream support)
  const streamResponse = await fetch('https://api.i3x.dev/v1/subscriptions/stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clientId: CLIENT_ID, subscriptionId: subscriptionId })
  });

  // Process the SSE stream
  const reader = streamResponse.body.getReader();
  const decoder = new TextDecoder();

  const processStream = async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      // Parse SSE data lines
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          callback(data);
        }
      }
    }
  };

  processStream();
  return { subscriptionId };
};

// Use sync endpoint for reliable polling — guaranteed no data loss via sequence numbers
const syncSubscription = async (token, clientId, subscriptionId, lastSequenceNumber) => {
  const body = { clientId, subscriptionId };
  if (lastSequenceNumber !== undefined) {
    body.lastSequenceNumber = lastSequenceNumber;  // Omit on first call only
  }
  const response = await fetch('https://api.i3x.dev/v1/subscriptions/sync', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  // HTTP 206 means queue overflow — some updates were dropped
  if (response.status === 206) {
    console.warn('Subscription queue overflowed — some updates were dropped');
  }
  const data = await response.json();
  return data.result;  // Array of {sequenceNumber, updates: [...]} batches
};

// Deleting a subscription
const deleteSubscription = async (token, subscriptionId) => {
  await fetch('https://api.i3x.dev/v1/subscriptions/delete', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clientId: CLIENT_ID, subscriptionIds: [subscriptionId] })
  });
};
```

#### 5. Handling API Responses

All responses use a standard `{success, result}` envelope. Errors use `{success, responseDetail: {title, status, detail}}` (RFC 9457). Always check `success` before reading `result`:

```javascript
const handleResponse = async (response) => {
  // HTTP 206 means partial content (depth limit or queue overflow) — not a failure
  if (response.status === 206) {
    console.warn('Partial results returned due to server limit');
  }

  const data = await response.json();

  if (!data.success) {
    const rd = data.responseDetail;
    throw new Error(`API Error ${rd.status}: ${rd.detail}`);
  }

  return data.result;
};

// For bulk operations, check each item individually
const handleBulkResponse = (data) => {
  const succeeded = data.results.filter(r => r.success);
  const failed = data.results.filter(r => !r.success);

  if (failed.length > 0) {
    console.warn(`${failed.length} items failed:`, failed.map(r => r.responseDetail));
  }

  return succeeded.map(r => ({ elementId: r.elementId, ...r.result }));
};
```
