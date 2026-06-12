# Testing Your Client Application

## Unit Testing with Mock API

Mock responses should reflect the standard response envelope (`success`/`result` for success; `success`/`responseDetail` for failure):

```javascript
// mockApiClient.js
export const createMockClient = () => ({
  getObjects: jest.fn().mockResolvedValue({
    success: true,
    result: [
      { elementId: 'machine-001', typeElementId: 'urn:ns:type:Machine', displayName: 'Machine A', isComposition: false, isExtended: false, parentId: null }
    ]
  }),

  getObjectValues: jest.fn().mockResolvedValue({
    success: true,
    results: [
      {
        success: true,
        elementId: 'machine-001',
        result: {
          isComposition: false,
          value: 100,
          quality: 'Good',
          timestamp: '2025-01-15T12:00:00Z',
          components: null
        }
      }
    ]
  }),

  getInfo: jest.fn().mockResolvedValue({
    success: true,
    result: {
      specVersion: '1.0',
      serverVersion: '1.0.0',
      serverName: 'Test Server',
      capabilities: {
        query: { history: true },
        update: { current: true, history: false },
        subscribe: { stream: true }
      }
    }
  })
});

// test.spec.js
import { createMockClient } from './mockApiClient';

test('should fetch objects successfully', async () => {
  const client = createMockClient();
  const response = await client.getObjects();

  expect(response.success).toBe(true);
  expect(response.result).toHaveLength(1);
  expect(response.result[0].displayName).toBe('Machine A');
  expect(response.result[0].typeElementId).toBeDefined();
});

test('should handle bulk value response', async () => {
  const client = createMockClient();
  const response = await client.getObjectValues(['machine-001']);

  expect(response.success).toBe(true);
  expect(response.results[0].success).toBe(true);
  expect(response.results[0].result.quality).toBe('Good');
});
```

## Integration Testing

```javascript
describe('i3X API Integration', () => {
  let token;
  let testElementId;

  beforeAll(async () => {
    // Get token from your auth mechanism
    token = process.env.TEST_TOKEN;

    // Check server info first
    const infoResponse = await fetch(`${process.env.TEST_API_URL}/info`);
    const info = await infoResponse.json();
    console.log(`Testing against spec version: ${info.result.specVersion}`);

    // Get a test object
    const objectsResponse = await fetch(`${process.env.TEST_API_URL}/objects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const objects = await objectsResponse.json();
    testElementId = objects.result[0].elementId;
  });

  test('should read object value', async () => {
    const response = await fetch(`${process.env.TEST_API_URL}/objects/value`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ elementIds: [testElementId] })
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].success).toBe(true);
    expect(data.results[0].result).toHaveProperty('value');
    expect(data.results[0].result).toHaveProperty('quality');
    expect(['Good', 'GoodNoData', 'Bad', 'Uncertain']).toContain(data.results[0].result.quality);
  });

  test('should handle 206 partial content gracefully', async () => {
    const response = await fetch(`${process.env.TEST_API_URL}/objects/value`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ elementIds: [testElementId], maxDepth: 0 })
    });

    // 200 or 206 are both valid success codes
    expect([200, 206]).toContain(response.status);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```
