# Data Model Understanding

## Data Model Understanding

### Object Instance Structure

Objects in the i3X API follow this structure:

```json
{
  "elementId": "unique-object-identifier",
  "displayName": "Human Readable Name",
  "typeElementId": "object-type-element-id",
  "parentId": "parent-object-id-or-null",
  "isComposition": true,
  "isExtended": false
}
```

Full metadata (including relationship information) is available when requesting with `includeMetadata=true`:

```json
{
  "elementId": "unique-object-identifier",
  "displayName": "Human Readable Name",
  "typeElementId": "object-type-element-id",
  "parentId": "parent-object-id-or-null",
  "isComposition": true,
  "isExtended": false,
  "metadata": {
    "relationships": {
      "HasComponent": ["child-element-id-1", "child-element-id-2"],
      "References": ["related-element-id"]
    }
  }
}
```

### ObjectType Structure

ObjectTypes define the schema for objects:

```json
{
  "elementId": "type-element-id",
  "displayName": "Type Name",
  "namespaceUri": "urn:namespace:identifier",
  "sourceTypeId": "base-type-element-id",
  "version": "1.0.0",
  "schema": {
    "type": "object",
    "properties": {
      "attribute1": { "type": "string" },
      "attribute2": { "type": "number" }
    }
  },
  "related": null
}
```

Fields:
- `elementId` (required): Unique string identifier
- `displayName` (required): Human-readable name
- `namespaceUri` (required): Namespace URI
- `sourceTypeId` (required): Base/source type identifier
- `version` (optional): Semantic version string
- `schema` (required): JSON Schema definition
- `related` (optional): Related type metadata

### Value Response Structure

Current value responses are returned as a bulk result array. Each item in the results array has:

```json
{
  "success": true,
  "result": {
    "isComposition": false,
    "value": 75.5,
    "quality": "Good",
    "timestamp": "2025-01-15T12:00:00Z",
    "components": null
  }
}
```

For composition objects queried with `maxDepth > 1`, child component values appear under `components`:

```json
{
  "success": true,
  "result": {
    "isComposition": true,
    "value": null,
    "quality": "Good",
    "timestamp": "2025-01-15T12:00:00Z",
    "components": {
      "child-element-id-1": {
        "value": 42.0,
        "quality": "Good",
        "timestamp": "2025-01-15T12:00:00Z"
      },
      "child-element-id-2": {
        "value": 100.0,
        "quality": "Good",
        "timestamp": "2025-01-15T12:00:00Z"
      }
    }
  }
}
```

### Historical Value Response

Historical values per object:

```json
{
  "success": true,
  "result": {
    "isComposition": false,
    "values": [
      { "value": 74.1, "quality": "Good", "timestamp": "2025-01-15T11:00:00Z" },
      { "value": 75.5, "quality": "Good", "timestamp": "2025-01-15T12:00:00Z" }
    ]
  }
}
```

### Standard Response Envelope

All API responses use a standard envelope:

**Success:**
```json
{
  "success": true,
  "result": { ... }
}
```

**Failure:**
```json
{
  "success": false,
  "responseDetail": {
    "title": "Not Found",
    "status": 404,
    "detail": "ElementId not found"
  }
}
```

**Bulk operations** return per-item results in the same order as the request:
```json
{
  "success": false,
  "results": [
    { "success": true, "elementId": "id-1", "result": { ... } },
    { "success": false, "elementId": "id-2", "responseDetail": { "title": "Not Found", "status": 404, "detail": "Element not found: id-2" } }
  ]
}
```

The top-level `success` is false if any item fails.

### Data Quality Indicators

i3X uses four standard quality states:

| Quality | Meaning |
|---------|---------|
| `Good` | Value is reliable |
| `GoodNoData` | No data available, not an error condition |
| `Bad` | Value is unreliable |
| `Uncertain` | Value reliability cannot be determined |

When `value` is null, `quality` must be `Bad` or `GoodNoData`.

### Value Request/Response

#### GetObjectValueRequest (POST /objects/value)

```json
{
  "elementIds": [
    "urn:platform:object:12345",
    "urn:platform:object:12346"
  ],
  "maxDepth": 1
}
```

**Parameters:**
- `elementIds` (string[], required): Array of element IDs to query
- `maxDepth` (integer, default: 1, min: 0): Controls recursion through HasComponent relationships. `0` = infinite (server-limited); `1` = no recursion

**Note:** If the server reaches its depth limit before `maxDepth`, it returns HTTP 206 (Partial Content) rather than silently returning incomplete data.

#### GetObjectHistoryRequest (POST /objects/history)

```json
{
  "elementIds": [
    "urn:platform:object:12345"
  ],
  "startTime": "2025-01-15T00:00:00Z",
  "endTime": "2025-01-15T23:59:59Z",
  "maxDepth": 1
}
```

**Parameters:**
- `elementIds` (string[], required): Array of element IDs to query
- `startTime` (string | null): RFC 3339 start time for filtering
- `endTime` (string | null): RFC 3339 end time for filtering
- `maxDepth` (integer, default: 1, min: 0): Controls recursion depth

### Object List/Query Requests

#### GetObjectsRequest (POST /objects/list)

```json
{
  "elementIds": ["urn:platform:object:12345", "urn:platform:object:12346"],
  "includeMetadata": false
}
```

#### GetObjectTypesRequest (POST /objecttypes/query)

```json
{
  "elementIds": ["urn:platform:type:Equipment"]
}
```

#### GetRelationshipTypesRequest (POST /relationshiptypes/query)

```json
{
  "elementIds": ["urn:platform:reltype:HasComponent"]
}
```

#### GetRelatedObjectsRequest (POST /objects/related)

```json
{
  "elementIds": ["urn:platform:object:12345"],
  "relationshiptype": "HasComponent",
  "includeMetadata": true
}
```

**Parameters:**
- `elementIds` (string[], required): Array of element IDs to query
- `relationshiptype` (string | null): Filter by relationship type
- `includeMetadata` (boolean, default: false): Include full metadata in response

### Subscription Models

#### CreateSubscriptionRequest (POST /subscriptions)

```json
{
  "clientId": "my-app-instance-001",
  "displayName": "Dashboard Monitor"
}
```

`clientId` is **required** and scopes the subscription to a specific client identifier. `displayName` is optional.

#### CreateSubscriptionResponse

```json
{
  "success": true,
  "result": {
    "subscriptionId": "sub-12345",
    "clientId": "my-app-instance-001",
    "displayName": "Dashboard Monitor"
  }
}
```

#### RegisterMonitoredItemsRequest (POST /subscriptions/register)

```json
{
  "clientId": "my-app-instance-001",
  "subscriptionId": "sub-12345",
  "elementIds": ["urn:platform:object:12345", "urn:platform:object:12346"],
  "maxDepth": 1
}
```

#### SubscriptionSyncRequest (POST /subscriptions/sync)

The sync endpoint uses sequence numbers to ensure no updates are lost. Clients acknowledge the last received batch via `lastSequenceNumber`. Omit `lastSequenceNumber` on the first call:

```json
{
  "clientId": "my-app-instance-001",
  "subscriptionId": "sub-12345",
  "lastSequenceNumber": 42
}
```

The response returns new updates with monotonically increasing sequence numbers starting at 1. Each subscription has independent numbering. HTTP 206 indicates queue overflow — some updates were dropped.
