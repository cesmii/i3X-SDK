# Integration Patterns

## React/JavaScript Applications

```javascript
import { useEffect, useState } from 'react';

const useManufacturingData = (elementId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAuthToken();
        const response = await fetch('https://api.i3x.dev/v1/objects/value', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ elementIds: [elementId] })
        });
        const body = await response.json();
        // First result in the bulk response
        setData(body.results[0]?.result ?? null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up polling or SSE subscription
    const interval = setInterval(fetchData, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [elementId]);

  return { data, loading, error };
};
```

## Python Applications

```python
import requests
from typing import Dict, List, Optional
from datetime import datetime, timedelta

class I3XAPIClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        })

    @classmethod
    def get_info(cls, base_url: str) -> Dict:
        """Get server capabilities — no auth required."""
        response = requests.get(f'{base_url}/info')
        response.raise_for_status()
        return response.json()['result']

    def get_objects(self, type_element_id: Optional[str] = None) -> List[Dict]:
        params = {}
        if type_element_id:
            params['typeElementId'] = type_element_id
        response = self.session.get(
            f'{self.base_url}/objects',
            params=params
        )
        response.raise_for_status()
        return response.json()['result']

    def get_object_values(
        self,
        element_ids: List[str],
        max_depth: int = 1
    ) -> List[Dict]:
        response = self.session.post(
            f'{self.base_url}/objects/value',
            json={
                'elementIds': element_ids,
                'maxDepth': max_depth
            }
        )
        response.raise_for_status()
        data = response.json()
        # HTTP 206 = partial results (depth limit reached)
        if response.status_code == 206:
            import warnings
            warnings.warn('Partial results: server depth limit reached')
        return data.get('results', [])

    def get_object_history(
        self,
        element_ids: List[str],
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Dict]:
        payload = {'elementIds': element_ids}
        if start_time:
            payload['startTime'] = start_time.isoformat() + 'Z'
        if end_time:
            payload['endTime'] = end_time.isoformat() + 'Z'

        response = self.session.post(
            f'{self.base_url}/objects/history',
            json=payload
        )
        response.raise_for_status()
        return response.json().get('results', [])

# Usage example
info = I3XAPIClient.get_info('https://api.i3x.dev/v1')
print(f"Spec version: {info['specVersion']}")
print(f"History supported: {info['capabilities']['query']['history']}")

client = I3XAPIClient('https://api.i3x.dev/v1', token='your-token-here')

objects = client.get_objects()
values = client.get_object_values([objects[0]['elementId']])
history = client.get_object_history(
    [objects[0]['elementId']],
    start_time=datetime.now() - timedelta(hours=1)
)
```
