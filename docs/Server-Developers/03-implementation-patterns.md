# Implementation Patterns

This document provides concrete code examples for implementing i3X server endpoints.

## Pattern 1: Server Info Endpoint (Required, No Auth)

`GET /info` must be accessible without authentication and serves as both a health check and capability advertisement:

```python
from flask import Flask, jsonify

app = Flask(__name__)

SERVER_INFO = {
    "specVersion": "1.0",
    "serverVersion": "1.0.0",
    "serverName": "My Manufacturing Platform",
    "capabilities": {
        "query": {"history": True},
        "update": {"current": True, "history": False},
        "subscribe": {"stream": True}
    }
}

@app.route('/info', methods=['GET'])
def server_info():
    """Health check and capabilities — no authentication required."""
    return jsonify({"success": True, "result": SERVER_INFO}), 200
```

## Pattern 2: Standard Response Helpers

All responses must use the `{success, result}` or `{success, responseDetail}` envelope:

```python
def success_response(result, status_code=200):
    """Wrap a result in the standard success envelope."""
    return jsonify({"success": True, "result": result}), status_code

def error_response(code: int, title: str, detail: str = None):
    """Wrap an error using RFC 9457 responseDetail."""
    return jsonify({
        "success": False,
        "responseDetail": {"title": title, "status": code, "detail": detail or title}
    }), code

def bulk_response(results: list, status_code=200):
    """
    Return a bulk response. results is a list of dicts:
    {"success": bool, "elementId": str|None, "result": any}
    Failed items include "responseDetail" instead of "result".
    Top-level success is False if any item failed.
    """
    top_level_success = all(r["success"] for r in results)
    return jsonify({
        "success": top_level_success,
        "results": results
    }), status_code
```

## Pattern 3: Basic Object Endpoints

```python
from typing import List, Dict, Optional

class ObjectRepository:
    """Your internal data access layer"""

    def get_object(self, element_id: str) -> Optional[Dict]:
        """Retrieve object from your data store"""
        pass

    def list_objects(
        self,
        type_element_id: Optional[str] = None,
        root_only: bool = False,
        include_metadata: bool = False
    ) -> List[Dict]:
        """List objects with optional filtering"""
        pass

    def get_objects_by_ids(
        self,
        element_ids: List[str],
        include_metadata: bool = False
    ) -> List[Dict]:
        """Retrieve multiple objects by their elementIds"""
        pass

    def get_related_objects(
        self,
        element_id: str,
        relationship_type: Optional[str] = None,
        include_metadata: bool = False
    ) -> List[Dict]:
        """Get objects related to a given object"""
        pass

repo = ObjectRepository()

@app.route('/objects', methods=['GET'])
@require_auth
def list_objects():
    """List all objects with optional filtering"""
    try:
        type_element_id = request.args.get('typeElementId')
        root_only = request.args.get('root', 'false').lower() == 'true'
        include_metadata = request.args.get('includeMetadata', 'false').lower() == 'true'

        objects = repo.list_objects(
            type_element_id=type_element_id,
            root_only=root_only,
            include_metadata=include_metadata
        )

        return success_response(objects)

    except Exception as e:
        return error_response(500, 'Internal Server Error', 'Internal server error')

@app.route('/objects/list', methods=['POST'])
@require_auth
def get_objects_by_ids():
    """Get objects by elementId(s)"""
    try:
        data = request.get_json()
        element_ids = data.get('elementIds', [])
        include_metadata = data.get('includeMetadata', False)

        if not element_ids:
            return error_response(400, 'Bad Request', 'elementIds is required')

        results = []
        for eid in element_ids:
            obj = repo.get_object(eid)
            if obj:
                results.append({"success": True, "elementId": eid, "result": obj})
            else:
                results.append({"success": False, "elementId": eid,
                                 "responseDetail": {"title": "Not Found", "status": 404, "detail": f"Element not found: {eid}"}})

        return bulk_response(results)

    except Exception as e:
        return error_response(500, 'Internal Server Error', 'Internal server error')

@app.route('/objects/related', methods=['POST'])
@require_auth
def get_related_objects():
    """Get related objects for one or more elementIds"""
    try:
        data = request.get_json()
        element_ids = data.get('elementIds', [])
        relationship_type = data.get('relationshipType')
        include_metadata = data.get('includeMetadata', False)

        results = []
        for eid in element_ids:
            related = repo.get_related_objects(eid, relationship_type, include_metadata)
            results.append({"success": True, "elementId": eid, "result": related})

        return bulk_response(results)

    except Exception as e:
        return error_response(500, 'Internal Server Error', 'Internal server error')
```

## Pattern 4: Value and History Data Access

```python
from datetime import datetime
from typing import Optional, List

SERVER_MAX_DEPTH = 5  # Your server's maximum supported depth

class DataRepository:
    """Your internal time-series data access layer"""

    def get_object_value(
        self,
        element_ids: List[str],
        max_depth: int = 1
    ) -> tuple[List[Dict], bool]:
        """
        Retrieve current values for objects.
        Returns (results, depth_limited) where depth_limited=True triggers HTTP 206.
        """
        pass

    def get_object_history(
        self,
        element_ids: List[str],
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        max_depth: int = 1
    ) -> List[Dict]:
        pass

data_repo = DataRepository()

@app.route('/objects/value', methods=['POST'])
@require_auth
def get_object_value():
    """Get current values for one or more objects"""
    try:
        data = request.get_json()
        element_ids = data.get('elementIds', [])
        max_depth = data.get('maxDepth', 1)

        if not element_ids:
            return error_response(400, 'Bad Request', 'elementIds is required')

        results = []
        depth_limited = False
        for eid in element_ids:
            try:
                # value_result shape: {isComposition, value, quality, timestamp, components}
                # was_truncated is True only when SERVER_MAX_DEPTH actually cut the
                # composition tree short — not merely because a deep maxDepth was requested
                value_result, was_truncated = data_repo.get_object_value([eid], max_depth)
                depth_limited = depth_limited or was_truncated
                results.append({"success": True, "elementId": eid, "result": value_result})
            except KeyError:
                results.append({"success": False, "elementId": eid,
                                 "responseDetail": {"title": "Not Found", "status": 404, "detail": f"Element not found: {eid}"}})

        top_level_success = all(r["success"] for r in results)
        response_body = {"success": top_level_success, "results": results}

        # Return 206 only when the server's depth limit truncated the result
        status_code = 206 if depth_limited else 200
        return jsonify(response_body), status_code

    except Exception as e:
        app.logger.error(f"Error retrieving values: {str(e)}")
        return error_response(500, 'Internal Server Error', 'Internal server error')

@app.route('/objects/history', methods=['POST'])
@require_auth
def get_object_history():
    """Get historical values for one or more objects"""
    try:
        data = request.get_json()
        element_ids = data.get('elementIds', [])
        start_time_str = data.get('startTime')
        end_time_str = data.get('endTime')
        max_depth = data.get('maxDepth', 1)

        if not element_ids:
            return error_response(400, 'Bad Request', 'elementIds is required')

        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00')) if start_time_str else None
        end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00')) if end_time_str else None

        results = []
        for eid in element_ids:
            try:
                history = data_repo.get_object_history([eid], start_time, end_time, max_depth)
                # history shape: {isComposition, values: [{value, quality, timestamp}]}
                results.append({"success": True, "elementId": eid, "result": history})
            except KeyError:
                results.append({"success": False, "elementId": eid,
                                 "responseDetail": {"title": "Not Found", "status": 404, "detail": f"Element not found: {eid}"}})

        return bulk_response(results)

    except ValueError as e:
        return error_response(400, 'Bad Request', str(e))
    except Exception as e:
        return error_response(500, 'Internal Server Error', 'Internal server error')

@app.route('/objects/value', methods=['PUT'])
@require_auth
def update_object_values():
    """Update current values for one or more objects (bulk)"""
    try:
        data = request.get_json()
        updates = data.get('updates', [])  # [{elementId, value: {value, quality, timestamp}}]

        if not updates:
            return error_response(400, 'Bad Request', 'updates is required')

        results = []
        for update in updates:
            eid = update.get('elementId')
            vqt = update.get('value', {})
            try:
                data_repo.update_object_value(eid, vqt)
                results.append({"success": True, "elementId": eid, "result": None})
            except KeyError:
                results.append({"success": False, "elementId": eid,
                                 "responseDetail": {"title": "Not Found", "status": 404, "detail": f"Element not found: {eid}"}})

        return bulk_response(results)

    except Exception as e:
        return error_response(500, 'Internal Server Error', 'Internal server error')

@app.route('/objects/history', methods=['PUT'])
@require_auth
def update_object_history():
    """Update historical values for one or more objects (bulk)"""
    try:
        data = request.get_json()
        updates = data.get('updates', [])  # [{elementId, value: {value, quality, timestamp}}]

        if not updates:
            return error_response(400, 'Bad Request', 'updates is required')

        results = []
        for update in updates:
            eid = update.get('elementId')
            vqt = update.get('value', {})
            try:
                data_repo.update_object_history(eid, vqt)
                results.append({"success": True, "elementId": eid, "result": None})
            except KeyError:
                results.append({"success": False, "elementId": eid,
                                 "responseDetail": {"title": "Not Found", "status": 404, "detail": f"Element not found: {eid}"}})

        return bulk_response(results)

    except Exception as e:
        return error_response(500, 'Internal Server Error', 'Internal server error')
```

## Pattern 5: Authentication Middleware

```python
from functools import wraps
from flask import request
import jwt

class AuthService:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key

    def validate_token(self, token: str) -> Optional[Dict]:
        try:
            return jwt.decode(token, self.secret_key, algorithms=['HS256'])
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None

auth_service = AuthService('your-secret-key')

def require_auth(f):
    """Decorator to require authentication. Do NOT apply to /info."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return error_response(401, 'Unauthorized', 'Authorization header required')

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return error_response(401, 'Unauthorized', 'Invalid authorization header format')

        user = auth_service.validate_token(parts[1])
        if not user:
            return error_response(401, 'Unauthorized', 'Invalid or expired token')

        request.current_user = user
        return f(*args, **kwargs)

    return decorated_function
```

## Pattern 6: Namespace and ObjectType Endpoints

```python
class TypeRepository:
    def list_namespaces(self) -> List[Dict]:
        pass

    def list_object_types(self, namespace_uri: Optional[str] = None) -> List[Dict]:
        pass

    def get_object_type_by_id(self, element_id: str) -> Optional[Dict]:
        pass

    def list_relationship_types(self, namespace_uri: Optional[str] = None) -> List[Dict]:
        pass

    def get_relationship_type_by_id(self, element_id: str) -> Optional[Dict]:
        pass

type_repo = TypeRepository()

@app.route('/namespaces', methods=['GET'])
@require_auth
def list_namespaces():
    return success_response(type_repo.list_namespaces())

@app.route('/objecttypes', methods=['GET'])
@require_auth
def list_object_types():
    namespace_uri = request.args.get('namespaceUri')
    return success_response(type_repo.list_object_types(namespace_uri))

@app.route('/objecttypes/query', methods=['POST'])
@require_auth
def query_object_types():
    data = request.get_json()
    element_ids = data.get('elementIds', [])
    if not element_ids:
        return error_response(400, 'Bad Request', 'elementIds is required')

    results = []
    for eid in element_ids:
        obj_type = type_repo.get_object_type_by_id(eid)
        if obj_type:
            results.append({"success": True, "elementId": eid, "result": obj_type})
        else:
            results.append({"success": False, "elementId": eid,
                             "responseDetail": {"title": "Not Found", "status": 404, "detail": f"Object type not found: {eid}"}})
    return bulk_response(results)

@app.route('/relationshiptypes', methods=['GET'])
@require_auth
def list_relationship_types():
    namespace_uri = request.args.get('namespaceUri')
    return success_response(type_repo.list_relationship_types(namespace_uri))

@app.route('/relationshiptypes/query', methods=['POST'])
@require_auth
def query_relationship_types():
    data = request.get_json()
    element_ids = data.get('elementIds', [])
    if not element_ids:
        return error_response(400, 'Bad Request', 'elementIds is required')

    results = []
    for eid in element_ids:
        rel_type = type_repo.get_relationship_type_by_id(eid)
        if rel_type:
            results.append({"success": True, "elementId": eid, "result": rel_type})
        else:
            results.append({"success": False, "elementId": eid,
                             "responseDetail": {"title": "Not Found", "status": 404, "detail": f"Relationship type not found: {eid}"}})
    return bulk_response(results)
```

## Pattern 7: Subscription Endpoints

Note: All subscription management uses flat POST endpoints with `subscriptionId` in the request body — not per-subscription URL paths.

`clientId` is required on every subscription endpoint (400 Bad Request when missing), and every operation is scoped to it: a subscription owned by a different client returns the same 404 as a nonexistent one, so subscription IDs cannot be probed across clients.

```python
import uuid

class SubscriptionRepository:
    """All lookups are keyed by (clientId, subscriptionId). A subscription owned
    by a different client is treated exactly like a nonexistent one (404), so
    clients cannot probe for other clients' subscription IDs."""

    def __init__(self):
        self.subscriptions = {}

    def create_subscription(self, client_id: str, display_name: Optional[str]) -> Dict:
        sub_id = str(uuid.uuid4())
        self.subscriptions[sub_id] = {
            'subscriptionId': sub_id,
            'clientId': client_id,
            'displayName': display_name,
            'monitoredObjects': [],
            'queue': [],
            'sequenceNumber': 0
        }
        return {'subscriptionId': sub_id, 'clientId': client_id, 'displayName': display_name}

    def get_subscription(self, client_id: str, sub_id: str) -> Optional[Dict]:
        sub = self.subscriptions.get(sub_id)
        return sub if sub and sub['clientId'] == client_id else None

    def delete_subscriptions(self, client_id: str, sub_ids: List[str]) -> List[Dict]:
        results = []
        for sub_id in sub_ids:
            if self.get_subscription(client_id, sub_id):
                del self.subscriptions[sub_id]
                results.append({"success": True, "subscriptionId": sub_id, "result": None})
            else:
                results.append({"success": False, "subscriptionId": sub_id,
                                 "responseDetail": {"title": "Not Found", "status": 404, "detail": "Subscription not found"}})
        return results

    def register_items(self, client_id: str, sub_id: str, element_ids: List[str], max_depth: int = 1) -> bool:
        sub = self.get_subscription(client_id, sub_id)
        if not sub:
            return False
        for eid in element_ids:
            sub['monitoredObjects'].append({'elementId': eid, 'maxDepth': max_depth})
        return True

    def unregister_items(self, client_id: str, sub_id: str, element_ids: List[str]) -> bool:
        sub = self.get_subscription(client_id, sub_id)
        if not sub:
            return False
        sub['monitoredObjects'] = [
            m for m in sub['monitoredObjects'] if m['elementId'] not in element_ids
        ]
        return True

    def sync(self, client_id: str, sub_id: str, last_sequence_number: Optional[int]) -> Optional[Dict]:
        """Return pending updates, acknowledging all up to last_sequence_number.

        Spec notes: -1 acknowledges (clears) the entire queue; an omitted or
        invalid last_sequence_number MUST NOT clear the queue. Servers MUST
        also return an error if the subscription has an open SSE stream.
        """
        sub = self.get_subscription(client_id, sub_id)
        if not sub:
            return None
        if last_sequence_number == -1:
            sub['queue'] = []
        elif last_sequence_number is not None:
            sub['queue'] = [u for u in sub['queue'] if u['sequenceNumber'] > last_sequence_number]
        return sub['queue']  # List of {sequenceNumber, updates: [...]}

sub_repo = SubscriptionRepository()

@app.route('/subscriptions', methods=['POST'])
@require_auth
def create_subscription():
    data = request.get_json() or {}
    client_id = data.get('clientId')
    if not client_id:
        return error_response(400, 'Bad Request', 'clientId is required')
    result = sub_repo.create_subscription(
        client_id=client_id,
        display_name=data.get('displayName')
    )
    return success_response(result)

@app.route('/subscriptions/list', methods=['POST'])
@require_auth
def list_subscriptions():
    data = request.get_json() or {}
    client_id = data.get('clientId')
    if not client_id:
        return error_response(400, 'Bad Request', 'clientId is required')
    sub_ids = data.get('subscriptionIds', [])
    results = []
    for sub_id in sub_ids:
        sub = sub_repo.get_subscription(client_id, sub_id)
        if sub:
            results.append({
                'success': True,
                'subscriptionId': sub_id,
                'result': {
                    'subscriptionId': sub['subscriptionId'],
                    'displayName': sub.get('displayName'),
                    'monitoredObjects': sub['monitoredObjects']
                }
            })
        else:
            results.append({
                'success': False,
                'subscriptionId': sub_id,
                'responseDetail': {'title': 'Not Found', 'status': 404, 'detail': f'Subscription not found: {sub_id}'}
            })
    top_success = all(r['success'] for r in results)
    return jsonify({'success': top_success, 'results': results}), 200

@app.route('/subscriptions/delete', methods=['POST'])
@require_auth
def delete_subscriptions():
    data = request.get_json()
    client_id = data.get('clientId')
    sub_ids = data.get('subscriptionIds', [])
    if not client_id:
        return error_response(400, 'Bad Request', 'clientId is required')
    if not sub_ids:
        return error_response(400, 'Bad Request', 'subscriptionIds is required')
    results = sub_repo.delete_subscriptions(client_id, sub_ids)
    top_success = all(r['success'] for r in results)
    return jsonify({'success': top_success, 'results': results}), 200

@app.route('/subscriptions/register', methods=['POST'])
@require_auth
def register_monitored_items():
    data = request.get_json()
    client_id = data.get('clientId')
    sub_id = data.get('subscriptionId')
    element_ids = data.get('elementIds', [])
    max_depth = data.get('maxDepth', 1)

    if not client_id:
        return error_response(400, 'Bad Request', 'clientId is required')
    if not sub_id:
        return error_response(400, 'Bad Request', 'subscriptionId is required')
    if not element_ids:
        return error_response(400, 'Bad Request', 'elementIds is required')
    if not sub_repo.register_items(client_id, sub_id, element_ids, max_depth):
        return error_response(404, 'Not Found', f'Subscription not found: {sub_id}')

    results = [{"success": True, "elementId": eid, "result": None} for eid in element_ids]
    return bulk_response(results)

@app.route('/subscriptions/unregister', methods=['POST'])
@require_auth
def unregister_monitored_items():
    data = request.get_json()
    client_id = data.get('clientId')
    sub_id = data.get('subscriptionId')
    element_ids = data.get('elementIds', [])

    if not client_id:
        return error_response(400, 'Bad Request', 'clientId is required')
    if not sub_id:
        return error_response(400, 'Bad Request', 'subscriptionId is required')
    if not sub_repo.unregister_items(client_id, sub_id, element_ids):
        return error_response(404, 'Not Found', f'Subscription not found: {sub_id}')

    results = [{"success": True, "elementId": eid, "result": None} for eid in element_ids]
    return bulk_response(results)

@app.route('/subscriptions/sync', methods=['POST'])
@require_auth
def subscription_sync():
    """Poll for queued updates with sequence number acknowledgment."""
    data = request.get_json()
    client_id = data.get('clientId')
    sub_id = data.get('subscriptionId')
    last_sequence_number = data.get('lastSequenceNumber')  # Omitted on first call

    if not client_id:
        return error_response(400, 'Bad Request', 'clientId is required')
    if not sub_id:
        return error_response(400, 'Bad Request', 'subscriptionId is required')

    result = sub_repo.sync(client_id, sub_id, last_sequence_number)
    if result is None:
        return error_response(404, 'Not Found', f'Subscription not found: {sub_id}')

    return success_response(result)

@app.route('/subscriptions/stream', methods=['POST'])
@require_auth
def subscription_stream():
    """Open an SSE stream for real-time updates."""
    import json

    data = request.get_json()
    client_id = data.get('clientId')
    sub_id = data.get('subscriptionId')

    if not client_id:
        return error_response(400, 'Bad Request', 'clientId is required')
    if not sub_id:
        return error_response(400, 'Bad Request', 'subscriptionId is required')
    if not sub_repo.get_subscription(client_id, sub_id):
        return error_response(404, 'Not Found', f'Subscription not found: {sub_id}')

    def generate():
        # Your implementation to yield SSE events as values change
        # yield f"data: {json.dumps(update)}\n\n"
        pass

    return app.response_class(generate(), mimetype='text/event-stream')
```

## Pattern 8: Unimplemented Optional Features

Return HTTP 501 for optional endpoints your server does not support. Do not return 404:

```python
@app.route('/objects/value', methods=['PUT'])
@require_auth
def update_object_value_not_implemented():
    """Value writes not supported on this server."""
    return error_response(501, 'Not Implemented', 'Value writes are not supported by this server')
```

## Best Practices

### Consistent Error Responses

Always use the standard error envelope — never return framework-default error formats:

```python
@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "responseDetail": {"title": "Not Found", "status": 404, "detail": "Not found"}}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "responseDetail": {"title": "Internal Server Error", "status": 500, "detail": "Internal server error"}}), 500
```

### Request Logging

```python
import time

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    duration = time.time() - request.start_time
    app.logger.info(f"{request.method} {request.path} {response.status_code} {duration*1000:.1f}ms")
    return response
```

### Connection Pooling

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    'postgresql://user:pass@localhost/db',
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=3600
)
```
