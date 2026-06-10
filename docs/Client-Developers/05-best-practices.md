# Best Practices for Client Development

## Best Practices for Client Development

### 1. Check Capabilities First

Always call `GET /info` before using optional features. This endpoint requires no authentication:

```javascript
const initClient = async (baseUrl, token) => {
  // No auth required for /info
  const infoResponse = await fetch(`${baseUrl}/info`);
  const info = (await infoResponse.json()).result;

  return {
    token,
    baseUrl,
    capabilities: info.capabilities,
    specVersion: info.specVersion
  };
};
```

### 2. Error Handling

All responses use a `{success, result}` envelope. Implement robust error handling that checks this:

```javascript
const safeApiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);

    // 206 = partial content (depth limit) — not a failure
    if (response.status === 206) {
      console.warn('Partial results: server depth limit reached');
    } else if (!response.ok) {
      const data = await response.json();
      const rd = data.responseDetail;
      throw new Error(`API Error ${rd?.status}: ${rd?.detail}`);
    }

    const data = await response.json();

    if (!data.success) {
      const rd = data.responseDetail;
      throw new Error(`API Error ${rd.status}: ${rd.detail}`);
    }

    return data.result ?? data.results;
  } catch (error) {
    console.error('API call failed:', error);

    // Implement retry logic for transient failures
    if (error.message.includes('503') || error.message.includes('timeout')) {
      return retryWithBackoff(url, options);
    }

    throw error;
  }
};
```

### 3. Caching Strategy

Implement intelligent caching to reduce API load:

```javascript
class ApiCache {
  constructor(ttl = 60000) { // Default 1 minute TTL
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
}
```

### 4. Rate Limiting Awareness

Respect API rate limits to ensure service availability:

```javascript
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.requests = [];
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

### 5. Efficient Batch Data Retrieval

When retrieving data for multiple objects, use batch endpoints with `elementIds` arrays:

```javascript
// Batch retrieve values for multiple objects
const batchGetObjectValues = async (token, elementIds) => {
  const response = await fetch('https://api.i3x.dev/v1/objects/value', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      elementIds: elementIds,
      maxDepth: 1
    })
  });

  const data = await response.json();
  return data.results;
};

// Get objects filtered by type
const getObjectsByType = async (token, typeElementId) => {
  const response = await fetch(
    `https://api.i3x.dev/v1/objects?typeElementId=${encodeURIComponent(typeElementId)}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const data = await response.json();
  return data.result;
};
```

### 6. Handling Partial Results (HTTP 206)

When querying with `maxDepth`, the server may return HTTP 206 if it reaches its own depth limit. This is not an error — treat it as a partial success:

```javascript
const getValueWithDepth = async (token, elementIds, maxDepth) => {
  const response = await fetch('https://api.i3x.dev/v1/objects/value', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ elementIds, maxDepth })
  });

  const isPartial = response.status === 206;
  const data = await response.json();

  return { data: data.results, isPartial };
};
```
