# Data Models

## Object Instance Representation

Objects are serialized in JSON format. The base `ObjectInstanceResponse` schema:

```json
{
  "elementId": "urn:platform:object:12345",
  "displayName": "Packaging Line 1",
  "typeElementId": "urn:platform:type:Equipment",
  "parentId": "urn:platform:object:building-a",
  "isComposition": true,
  "isExtended": false,
  "metadata": null
}
```

When `includeMetadata=true` is requested, populate the `metadata` field with relationship information:

```json
{
  "elementId": "urn:platform:object:12345",
  "displayName": "Packaging Line 1",
  "typeElementId": "urn:platform:type:Equipment",
  "parentId": "urn:platform:object:building-a",
  "isComposition": true,
  "isExtended": false,
  "metadata": {
    "relationships": {
      "HasComponent": ["urn:platform:object:conveyor-1", "urn:platform:object:sealer-1"],
      "References": ["urn:platform:object:operator-station-1"]
    }
  }
}
```

## Object Field Descriptions

### Required Fields

- **elementId** (string): Unique string identifier. Must have no leading/trailing whitespace or non-printable characters.
- **displayName** (string): Human-readable name for UI presentation
- **typeElementId** (string): ElementId of the object's type definition
- **isComposition** (boolean): Whether this object encapsulates child component objects (HasComponent relationship)
- **isExtended** (boolean, default: false): Whether this object carries attributes beyond its type schema

### Optional Fields

- **parentId** (string | null): ElementId of the parent object; null for root objects
- **metadata** (object | null): Full relationship metadata; only populated when `includeMetadata=true`

**Note:** Objects do not carry a `namespaceUri`. Object instances exist in the server's implicit address space. Namespace is a property of types, not instances.

## ObjectType Representation

All required fields must be present:

```json
{
  "elementId": "urn:platform:type:Equipment",
  "displayName": "Manufacturing Equipment",
  "namespaceUri": "urn:platform:namespace:production",
  "sourceTypeId": "urn:platform:type:BaseAsset",
  "version": "1.2.0",
  "schema": {
    "type": "object",
    "properties": {
      "manufacturer": { "type": "string" },
      "model": { "type": "string" },
      "status": {
        "type": "string",
        "enum": ["Running", "Stopped", "Maintenance"]
      },
      "temperature": { "type": ["number", "null"] }
    }
  },
  "related": null
}
```

**Fields:**
- **elementId** (string, required): Unique string identifier
- **displayName** (string, required): Human-readable name
- **namespaceUri** (string, required): Namespace URI
- **sourceTypeId** (string, required): Base/source type identifier this type derives from
- **version** (string | null): Semantic version string (recommended)
- **schema** (object, required): JSON Schema definition. Use `["number", "null"]` type unions for nullable fields.
- **related** (object | null): Related type metadata

## Namespace Representation

```json
{
  "uri": "urn:platform:namespace:production",
  "displayName": "Production Equipment"
}
```

**Fields** (all required):
- **uri** (string): Namespace URI
- **displayName** (string): Human-readable namespace name

## RelationshipType Representation

Every relationship type must define its reverse:

```json
{
  "elementId": "urn:platform:reltype:HasComponent",
  "displayName": "Has Component",
  "namespaceUri": "urn:platform:namespace:core",
  "reverseOf": "ComponentOf"
}
```

**Fields** (all required):
- **elementId** (string): Unique string identifier
- **displayName** (string): Human-readable name
- **namespaceUri** (string): Namespace URI
- **reverseOf** (string): ElementId or name of the inverse relationship — all relationships are bidirectional

Common built-in relationship types:
- `HasParent` / `HasChildren` — hierarchical organization
- `HasComponent` / `ComponentOf` — compositional relationships

## ServerInfo Response

The `GET /info` endpoint (no authentication required) returns:

```json
{
  "specVersion": "1.0",
  "serverVersion": "2.3.1",
  "serverName": "My Manufacturing Platform",
  "capabilities": {
    "query": { "history": true },
    "update": { "current": true, "history": false },
    "subscribe": { "stream": true }
  }
}
```

**Fields:**
- **specVersion** (string, required): The i3X spec version this server implements
- **serverVersion** (string | null): Server software version
- **serverName** (string | null): Human-readable server/platform name
- **capabilities** (object, required): Which optional features are supported

## Data Quality Indicators

Use exactly these four quality values — no others:

| Quality | When to Use |
|---------|-------------|
| `Good` | Value is reliable and current |
| `GoodNoData` | No data available; this is expected, not an error |
| `Bad` | Value is unreliable or from a failed source |
| `Uncertain` | Value reliability cannot be determined |

When `value` is null, `quality` must be `Bad` or `GoodNoData`.

## Value Request/Response

### GetObjectValueRequest (POST /objects/value)

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
- **elementIds** (string[], required): Array of element IDs to query
- **maxDepth** (integer, default: 1, min: 0): Controls recursion through HasComponent relationships. `0` = infinite (subject to server limits); `1` = no recursion

### Current Value Response

Return a bulk response. Each item in `results` corresponds to one `elementId` in request order:

```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "elementId": "urn:platform:object:12345",
      "result": {
        "isComposition": false,
        "value": 125.5,
        "quality": "Good",
        "timestamp": "2025-01-15T12:00:00Z"
      }
    }
  ]
}
```

For composition objects with `maxDepth > 1`, populate `components`:

```json
{
  "isComposition": true,
  "value": null,
  "quality": "Good",
  "timestamp": "2025-01-15T12:00:00Z",
  "components": {
    "urn:platform:object:child-1": {
      "value": 42.0,
      "quality": "Good",
      "timestamp": "2025-01-15T12:00:00Z"
    }
  }
}
```

If the server reaches its depth limit before fulfilling `maxDepth`, return **HTTP 206** (not 200).

### GetObjectHistoryRequest (POST /objects/history)

```json
{
  "elementIds": ["urn:platform:object:12345"],
  "startTime": "2025-01-15T00:00:00Z",
  "endTime": "2025-01-15T23:59:59Z",
  "maxDepth": 1
}
```

### Historical Value Response

```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "elementId": "urn:platform:object:12345",
      "result": {
        "isComposition": false,
        "values": [
          { "value": 120.0, "quality": "Good", "timestamp": "2025-01-15T10:00:00Z" },
          { "value": 125.5, "quality": "Good", "timestamp": "2025-01-15T12:00:00Z" }
        ]
      }
    }
  ]
}
```

## Subscription Models

### CreateSubscriptionRequest

```json
{
  "clientId": "my-app-instance-001",
  "displayName": "Dashboard Monitor"
}
```

`clientId` is **required** and scopes the subscription to a client identifier. `displayName` is optional.

### CreateSubscriptionResponse

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

### RegisterMonitoredItemsRequest (POST /subscriptions/register)

Both `clientId` and `subscriptionId` are passed in the body — not in the URL path:

```json
{
  "clientId": "my-app-instance-001",
  "subscriptionId": "sub-12345",
  "elementIds": ["urn:platform:object:12345", "urn:platform:object:12346"],
  "maxDepth": 1
}
```

### SubscriptionSyncRequest (POST /subscriptions/sync)

Uses monotonically increasing `sequenceNumber` (64-bit unsigned, starting at 1) to ensure no data loss. Omit `lastSequenceNumber` on the first call:

```json
{
  "clientId": "my-app-instance-001",
  "subscriptionId": "sub-12345",
  "lastSequenceNumber": 42
}
```

Server queues updates with sequence numbers. Client acknowledges the last received sequence when polling for new data. Each subscription has independent numbering. Return HTTP 206 if the queue overflowed and updates were dropped.

### SubscriptionDetail (from POST /subscriptions/list)

```json
{
  "subscriptionId": "sub-12345",
  "displayName": "Dashboard Monitor",
  "monitoredObjects": [
    { "elementId": "urn:platform:object:12345", "maxDepth": 1 }
  ]
}
```
