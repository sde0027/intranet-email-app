# Intranet Email API Contract

Version: 1.0  
Base URL (local deployment): `http://<server-host>:3000`  
Content type: JSON unless an endpoint uploads/downloads a file.

This document describes the routes implemented by the current backend snapshot. It is the frontend integration reference; it does not imply that routes not listed here exist.

## Authentication model

- Authentication uses the server-side session cookie `intranet.sid`.
- The cookie is HTTP-only, `SameSite=Lax`, and has an eight-hour rolling lifetime. `Secure` is controlled by `COOKIE_SECURE` (HTTPS is currently deferred).
- Send the cookie with every authenticated request. Browser clients should use `credentials: "include"`.
- Successful login regenerates the session ID. The server stores the user ID and role in the session, then resolves the current account, active status, and role from SQLite on authenticated requests.
- Inactive or deleted accounts are rejected with `401` and their session is destroyed.
- Logout destroys the current session.

## Authorization

| Access label | Meaning |
|---|---|
| Public | No authenticated session required |
| Authenticated | Any active authenticated employee or admin |
| Admin | Authenticated account with current database role `ADMIN` |

Employees can retrieve their own profile at `GET /api/employees/me`. Profile editing and employee administration remain admin-only. Profile-photo retrieval is available to authenticated users.

## Authentication endpoints

| Method | Path | Access | Success |
|---|---|---:|---:|
| POST | `/api/auth/login` | Public; rate-limited | 200 |
| POST | `/api/auth/logout` | Session-based | 200 |

### Login request

```json
{ "email": "employee@example.com", "password": "your-password" }
```

Successful response:

```json
{
  "message": "Login successful.",
  "user": {
    "id": 12,
    "name": "Employee Name",
    "email": "employee@example.com",
    "role": "EMPLOYEE",
    "designation": "",
    "phone": "",
    "profile_photo_url": null
  }
}
```

Invalid credentials return `401`. Missing email/password returns `400`. Rate limiting returns `429` and a `Retry-After` header.

Logout success:

```json
{ "message": "Logout successful." }
```

## Employee endpoints

All paths below are under `/api/employees`.

| Method | Path | Access | Success |
|---|---|---|---:|
| GET | `/me` | Authenticated | 200 |
| GET | `/:id/photo` | Authenticated | 200 image |
| POST | `/` | Admin | 201 |
| GET | `/` | Admin | 200 |
| PATCH | `/:id/status` | Admin | 200 |
| PATCH | `/:id/profile` | Admin | 200 |

### Get current employee

`GET /api/employees/me`

Response:

```json
{
  "employee": {
    "id": 12,
    "name": "Employee Name",
    "email": "employee@example.com",
    "role": "EMPLOYEE",
    "is_active": 1,
    "designation": "",
    "phone": "",
    "profile_photo_url": null,
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

The employee object intentionally excludes `password_hash` and the stored photo filename.

### Create employee

`POST /api/employees`

```json
{
  "name": "Employee Name",
  "email": "employee@example.com",
  "password": "temporary-password",
  "designation": "Accounts Executive",
  "phone": "9876543210"
}
```

Required: `name`, `email`, `password`. Password minimum: 8 characters. Name maximum: 120 characters. Designation maximum: 120 characters. Phone maximum: 30 characters. Duplicate email returns `409`.

### List employees

`GET /api/employees`

Response: `{ "count": number, "employees": Employee[] }`.

### Update employee status

`PATCH /api/employees/:id/status`

```json
{ "is_active": false }
```

`is_active` must be a boolean. An admin cannot deactivate their own account through this endpoint.

### Update employee profile

`PATCH /api/employees/:id/profile`

Accepts JSON or `multipart/form-data`. Supported fields: `name`, `email`, `designation`, `phone`, and optional file field `profile_photo`.

- Individual fields may be updated; omitted fields are preserved.
- Blank designation/phone values are treated as not supplied and preserve existing values.
- Name cannot be blank.
- Email is normalized and must be unique; duplicate email returns `409`.
- Profile photos must be valid JPEG, PNG, or WebP and no larger than 5 MB.
- Empty update requests return `400`.

### Get profile photo

`GET /api/employees/:id/photo`

Returns the image bytes with `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`. Missing photo returns `404`.

## Email endpoints

All endpoints below require an authenticated active account. All paths are under `/api/emails`.

| Method | Path | Success | Purpose |
|---|---|---:|---|
| POST | `/send` | 201 | Send a message |
| GET | `/inbox` | 200 | Retrieve inbox |
| GET | `/sent` | 200 | Retrieve sent messages |
| GET | `/trash` | 200 | Retrieve Trash |
| POST | `/drafts` | 201 | Create draft |
| GET | `/drafts` | 200 | List drafts |
| GET | `/drafts/:id` | 200 | Retrieve draft |
| PATCH | `/drafts/:id` | 200 | Update draft |
| DELETE | `/drafts/:id` | 200 | Delete draft |
| GET | `/unread-count` | 200 | Retrieve unread count |
| GET | `/:id` | 200 | Retrieve a message |
| PATCH | `/:id/read` | 200 | Mark message read |
| PATCH | `/:id/unread` | 200 | Mark message unread |
| POST | `/:id/reply` | 201 | Reply |
| POST | `/:id/reply-all` | 201 | Reply all |
| POST | `/:id/forward` | 201 | Forward |
| GET | `/:id/attachments` | 200 | List message attachments |
| GET | `/attachments/:attachmentId/download` | 200 file | Download attachment |
| DELETE | `/:id` | 200 | Move message to Trash |
| PATCH | `/:id/restore` | 200 | Restore message from Trash |
| DELETE | `/:id/permanent` | 200 | Permanently delete message from Trash |

### Pagination

Inbox, sent, drafts, and Trash accept `page` and `limit` query parameters.

- Defaults: `page=1`, `limit=20`.
- Both must be positive integers.
- Maximum `limit`: 100.
- Invalid values return `400`.
- Paginated responses use a resource array (`messages` or `drafts`) and a `pagination` object:

```json
{
  "messages": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

### Send message

`POST /api/emails/send` accepts JSON or `multipart/form-data`. JSON `to`, `cc`, and `bcc` fields are arrays. Each entry may be either a positive employee ID (number) or an employee email address (string). Email addresses are matched case-insensitively. For multipart requests, recipient arrays are JSON-encoded strings. Attachments are uploaded as file fields handled by the attachment upload middleware.

Example JSON body:

```json
{
  "to": ["employee@example.com", 12],
  "cc": ["manager@example.com"],
  "bcc": [],
  "subject": "Project update",
  "body": "The latest update is attached."
}
```

All recipients must exist and be active. Duplicate employees across To, CC, and BCC are rejected. Sending still requires at least one To recipient. Successful response includes `message`, `email`, and an `attachments` metadata array. Reply, reply-all, and forward retain their existing request contracts.

### Draft recipients

`POST /api/emails/drafts` and `PATCH /api/emails/drafts/:id` accept optional `to`, `cc`, and `bcc` arrays. Entries may be employee IDs or email addresses, using the same resolution rules as sending. Drafts may be saved without a To recipient while being composed.

Example draft body:

```json
{
  "subject": "Project update",
  "body": "A note to finish later.",
  "to": ["employee@example.com"],
  "cc": [12],
  "bcc": []
}
```

Draft responses include `recipients: { to: [], cc: [], bcc: [] }`, with each recipient represented by `id`, `name`, and `email`. On PATCH, an omitted recipient field is preserved; a supplied array replaces that recipient group, and an empty array clears that group. Subject and body retain their existing partial-update behaviour. Recipient changes and draft content updates are committed transactionally.

## System endpoint

| Method | Path | Access | Success |
|---|---|---|---:|
| GET | `/api/health` | Public | 200 when database is available; 503 otherwise |

Response when healthy: `{ "status": "ok", "database": "connected" }`.

## Error response conventions

The common API error envelope is:

```json
{ "error": "Human-readable explanation." }
```

Email service errors may additionally include a stable `code` field:

```json
{ "error": "Human-readable explanation.", "code": "ERROR_CODE" }
```

Common status meanings:

| Status | Meaning |
|---:|---|
| 400 | Invalid request, validation, or malformed JSON |
| 401 | Missing/invalid session or inactive account |
| 403 | Authenticated user lacks permission |
| 404 | Resource or API endpoint not found |
| 409 | Conflict, such as duplicate employee email |
| 413 | Request body or upload exceeds configured size |
| 429 | Login rate limit exceeded |
| 500 | Unexpected server error |
| 503 | Health check cannot reach the database |

The existing email controllers intentionally retain their established resource-specific response shapes and error codes. Frontend code should rely on the documented fields for each endpoint rather than assuming every successful response has one universal wrapper.

## Implementation notes and known boundaries

- `GET /api/employees/me` was added in this API-freeze update. It is registered before the admin-only employee routes and uses the authenticated account ID from `req.user`.
- No generic `GET /api/employees/:id` profile endpoint is exposed. Admins can use the employee list; individual profile updates remain available through `PATCH /:id/profile`.
- Login rate limiting is in-memory and resets when the Node process restarts. It is suitable for the current single-process deployment, not a multi-instance deployment.
- HTTPS is not enabled by this release. Set `COOKIE_SECURE=true` only when serving the app over HTTPS.
- Backup and recovery are explicitly deferred to the next rollout.
