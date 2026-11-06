# Intranet Email Application

A self-hosted internal email communication platform designed for organizations that need centralized communication between employees over a local network.

The application provides user authentication, employee management, internal email communication, recipient management, attachments, drafts, message organization and session management.

> **Development Status:** Core backend and React frontend are implemented. Enhancement Release 1 adds self-service password and profile-photo management plus content-based attachment deduplication; runtime verification is in progress.

---

## Table of Contents

- [Overview](#overview)
- [Project Objectives](#project-objectives)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Implemented Features](#implemented-features)
- [Database Design](#database-design)
- [Authentication and Security](#authentication-and-security)
- [API Overview](#api-overview)
- [Getting Started](#getting-started)
- [Running the Application](#running-the-application)
- [Testing and Verification](#testing-and-verification)
- [Deployment](#deployment)
- [Development Roadmap](#development-roadmap)
- [Design Decisions](#design-decisions)
- [Limitations](#limitations)
- [License](#license)

---

## Overview

The Intranet Email Application is a web-based internal messaging platform intended for organizations that require centralized communication between registered employees.

Unlike conventional email services that depend on external email providers, this application focuses on communication within a controlled organizational environment.

The application follows a **modular monolithic architecture**, keeping development and deployment straightforward while separating responsibilities across logical modules.

### Core Concept

- Administrators manage employee accounts.
- Employees authenticate using their registered credentials.
- Authenticated users can compose and send messages to other employees.
- Messages are delivered to recipients' inboxes.
- Users can manage drafts, read/unread status, replies, forwards and deleted messages.
- Attachments are stored locally and protected by access-control checks.
- Application data remains under the organization's infrastructure.

---

## Project Objectives

1. Develop a centralized internal communication platform.
2. Implement secure authentication and session management.
3. Support communication between individual employees and multiple recipients.
4. Maintain independent recipient-specific message states.
5. Provide efficient inbox and sent-message retrieval with pagination.
6. Support attachments and local file storage.
7. Implement message lifecycle operations, including drafts, replies, forwarding and Trash.
8. Keep application data under local infrastructure control.
9. Build a maintainable backend that supports future frontend integration.

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| CSS Framework | Tailwind CSS |
| Frontend Development Server | Vite |
| Backend Runtime | Node.js |
| Backend Framework | Express.js 5 |
| Database | SQLite |
| Database Driver | better-sqlite3 |
| Authentication | express-session |
| Session Storage | Custom SQLite session store |
| Password Hashing | Argon2 |
| File Upload | Multer |
| File Signature Validation | file-type |
| Configuration | dotenv |
| API Testing | Postman |
| Version Control | Git and GitHub |

### Architectural Approach

The application uses a **modular monolithic architecture**.

The backend operates as a single application while separating authentication, employee management, email operations, attachment handling, database operations and middleware into independent modules.

SQLite provides persistent relational storage without requiring a separately managed database server.

---

## Architecture

The application follows a client-server architecture.

```text
                 Web Browser
                      |
                      |
                 HTTP Requests
                      |
                      v
                Express.js
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
     Authentication  Users      Emails
        Module       Module     Module
          |           |           |
          |           |       Attachments
          |           |         Module
          |           |           |
          +-----------+-----------+
                      |
                      v
                 SQLite Database
                      |
          +-----------+-----------+
          |                       |
          v                       v
      Database                Migration
      Operations               System
                      |
                      v
              Local File Storage
                (Attachments)
```

### Architectural Responsibilities

| Layer | Responsibility |
|---|---|
| Frontend | User interaction and presentation |
| Express Server | HTTP request handling and routing |
| Authentication | Login, logout and session lifecycle |
| Authorization | Role-based access control |
| User Module | Employee account management |
| Email Module | Message composition, delivery and retrieval |
| Attachment Module | File validation, storage and download |
| Middleware | Authentication, authorization and error handling |
| Database Layer | Persistent data storage and SQL operations |
| Migration System | Database schema creation and version management |

---

## Project Structure

The project is organized into the following logical components:

```text
intranet-email-app/
│
├── data/
│   ├── intranet-email.sqlite
│   └── attachments/
│
├── public/
│   └── assets/
│
├── src/
│   │
│   ├── app.js
│   ├── server.js
│   │
│   ├── config/
│   │   └── config.js
│   │
│   ├── database/
│   │   ├── connection.js
│   │   ├── migrate.js
│   │   └── migrations/
│   │       ├── 001-initial-schema.sql
│   │       ├── 002-sessions.sql
│   │       └── 003-trash-retention.sql
│   │
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── authorize.js
│   │   ├── error-handler.js
│   │   ├── login-rate-limit.js
│   │   └── sqlite-session-store.js
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.routes.js
│   │   │   └── auth.service.js
│   │   │
│   │   ├── users/
│   │   │   ├── users.controller.js
│   │   │   ├── users.routes.js
│   │   │   └── users.service.js
│   │   │
│   │   ├── emails/
│   │   │   ├── emails.controller.js
│   │   │   ├── emails.routes.js
│   │   │   └── emails.service.js
│   │   │
│   │   └── attachments/
│   │       ├── attachments.controller.js
│   │       ├── attachments.routes.js
│   │       ├── attachments.service.js
│   │       └── attachments.storage.js
│   │
│   └── frontend/
│       ├── css/
│       │   └── style.css
│       └── js/
│
├── tests/
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── .env.example
├── .gitignore
└── README.md
```

*Note: The tree describes the main project components; individual frontend pages, test files and supporting utilities may evolve during development.*

The `data/` directory contains persistent application data and must be preserved when updating the application.

---

## Implemented Features

The established application workflows have been verified through API testing. Enhancement Release 1 changes are currently undergoing focused regression verification.

### 1. Authentication and User Management

- Administrator registration.
- Employee account creation.
- User login and authentication.
- Password hashing using Argon2.
- Server-managed sessions.
- Persistent session storage using SQLite.
- Session regeneration during authentication.
- Session destruction during logout.
- Self-service password changes after current-password verification.
- Administrator-controlled employee password resets for forgotten passwords.
- Invalidation of all persisted sessions after a password change or reset.
- HTTP-only session cookies.
- Authentication middleware.
- Role-based authorization for ADMIN and EMPLOYEE accounts.
- Active-account validation.
- Login rate limiting (login endpoint only).
- Self-service profile-photo upload for the authenticated employee.

### 2. Email Management

- Compose and send internal messages.
- Send messages to multiple employees.
- Support TO, CC and BCC recipients.
- Retrieve inbox messages.
- Retrieve sent messages.
- Retrieve individual email details.
- Paginated message retrieval.
- Sender and recipient relationships.
- Recipient-specific read/unread status.

### 3. Draft Management

- Create drafts.
- Retrieve all drafts belonging to the authenticated user.
- Retrieve individual drafts.
- Update existing drafts.
- Delete drafts.
- Restrict draft access to their owner.

Drafts are stored separately from sent messages using the email status field.

### 4. Reply and Forward

- Reply to an individual sender.
- Reply to all visible original recipients.
- Forward messages to other employees.
- Maintain message relationships through parent email references.
- Support attachments in reply and forward operations.
- Exclude BCC recipients from reply-all recipient lists.

### 5. Attachment Management

- Upload attachments with email messages.
- Validate permitted file extensions and MIME types.
- Verify actual file signatures.
- Store uploaded files locally.
- Store attachment metadata in SQLite.
- Retrieve attachment metadata.
- Download attachments with access-control validation.
- Restrict access to authorized senders and recipients.
- Clean up uploaded files when validation or database operations fail.
- SHA-256 content hashing to reuse an existing physical file when identical content is attached to another email.
- Multiple attachment metadata records can reference the same stored file.

Current upload restrictions:

- Maximum file size: 30 MB per file.
- Maximum number of files: 5 per request.
- Supported extensions: PDF, TXT, CSV, DOCX, XLSX, PPTX, JPG, JPEG, PNG, GIF, WEBP and ZIP.

### 6. Read/Unread Management

- Mark messages as read.
- Mark messages as unread.
- Retrieve unread-message counts.
- Maintain read status independently for each recipient.

### 7. Trash and Message Retention

- Move messages to Trash.
- Restore messages from Trash.
- Permanently delete a user's recipient association.
- Maintain independent Trash state for each recipient.
- Automatically expire Trash entries after 30 days.
- Preserve attachment access while the user's recipient association exists.

Deleting a message from one employee's mailbox does not delete it from other employees' mailboxes.

### 8. Database and Persistence

- SQLite database integration.
- Migration-based schema management.
- Persistent session storage.
- Foreign-key enforcement.
- WAL journal mode.
- Parameterized SQL queries.
- Transactional message creation and recipient assignment.
- Indexed inbox, sent-message and attachment lookups.
- Attachment content-hash index and migration-based backfill for previously stored files.
- Consistent UTC timestamps.

### 9. Maintenance and Error Handling

- Centralized JSON error handling.
- JSON responses for unknown API endpoints.
- Automatic expired-session cleanup.
- Startup backfill of SHA-256 hashes for existing attachment files.
- Automatic expired-Trash cleanup.
- Startup maintenance execution.
- Scheduled maintenance during server operation.

---

## Database Design

The application uses SQLite as its relational database.

Database schema changes are managed through versioned SQL migration files.

### Current Migrations

| Migration | Responsibility |
|---|---|
| `001-initial-schema.sql` | Initial application schema |
| `002-sessions.sql` | Persistent session storage |
| `003-trash-retention.sql` | Recipient-specific Trash retention |

### Core Database Entities

| Entity | Responsibility |
|---|---|
| Users | Stores registered employee accounts |
| Emails | Stores message information |
| Email Recipients | Maintains recipient relationships and individual message state |
| Attachments | Stores attachment metadata |
| Sessions | Stores persistent authentication sessions |

### Important Database Design Decisions

**Recipient-specific message state**

A single email can have multiple recipient records. This allows each recipient to maintain independent read/unread and Trash states.

**Transactional sending**

Creating an email, inserting recipient records and registering attachment metadata are handled transactionally to maintain database consistency.

**Attachment storage separation**

The database stores attachment metadata, while actual files are stored on the local filesystem.

**Migration-based schema management**

Existing migrations are tracked and are not reapplied during subsequent application startups.

---

## Authentication and Security

Security is implemented at the backend level.

Current security measures include:

- Argon2 password hashing.
- Server-side session authentication.
- Persistent SQLite session storage.
- Session regeneration after login.
- Session destruction during logout.
- Self-service password changes after current-password verification.
- Administrator-controlled employee password resets for forgotten passwords.
- Invalidation of all persisted sessions after a password change or reset.
- HTTP-only session cookies.
- Configurable cookie security.
- Role-based authorization.
- Active-account checks.
- Login rate limiting (login endpoint only).
- Self-service profile-photo upload for the authenticated employee.
- Parameterized SQL queries.
- SQLite foreign-key enforcement.
- Attachment signature validation.
- Attachment access-control checks.
- Centralized error handling.

### Session Configuration

The session cookie is named:

```text
intranet.sid
```

The default session lifetime is eight hours.

### Login Rate Limiting

The login endpoint has an in-memory rate limiter.

Default configuration:

- Maximum attempts: 10.
- Time window: 15 minutes.
- Scope: Client IP address.

Rate-limit counters reset when the server process restarts. This implementation is intended for the current single-server deployment.

### Transport Security

The current deployment uses HTTP within the controlled local network.

HTTPS is deferred for the current development stage.

**Important:** HTTP does not encrypt credentials or session cookies in transit. HTTPS should be configured before exposing the application to a production environment where transport confidentiality is required.

---

## API Overview

The backend exposes REST-style HTTP endpoints.

The API is organized into the following functional areas:

| Module | Functionality |
|---|---|
| Authentication | Registration, login and logout |
| Users | Employee account management |
| Emails | Message composition and sending |
| Inbox | Retrieving received messages |
| Sent | Retrieving sent messages |
| Drafts | Creating and managing drafts |
| Read/Unread | Managing recipient-specific message state |
| Replies and Forwarding | Reply, reply-all and forward |
| Attachments | Uploading, listing and downloading files |
| Trash | Moving, restoring and permanently deleting messages |

### Important Email Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/emails/send` | Send an email |
| GET | `/api/emails/inbox` | Retrieve inbox messages |
| GET | `/api/emails/sent` | Retrieve sent messages |
| GET | `/api/emails/drafts` | Retrieve drafts |
| POST | `/api/emails/drafts` | Create a draft |
| GET | `/api/emails/drafts/:id` | Retrieve an individual draft |
| PATCH | `/api/emails/drafts/:id` | Update a draft |
| DELETE | `/api/emails/drafts/:id` | Delete a draft |
| GET | `/api/emails/unread-count` | Retrieve unread count |
| GET | `/api/emails/:id` | Retrieve an individual email |
| PATCH | `/api/emails/:id/read` | Mark as read |
| PATCH | `/api/emails/:id/unread` | Mark as unread |
| POST | `/api/emails/:id/reply` | Reply |
| POST | `/api/emails/:id/reply-all` | Reply to all |
| POST | `/api/emails/:id/forward` | Forward |
| GET | `/api/emails/trash` | Retrieve Trash |
| DELETE | `/api/emails/:id` | Move to Trash |
| PATCH | `/api/emails/:id/restore` | Restore from Trash |
| DELETE | `/api/emails/:id/permanent` | Permanently delete from Trash |

Authentication endpoints include:

```text
POST /api/auth/login
POST /api/auth/logout
```

The complete route definitions, request payloads and response structures are maintained in the corresponding route and controller files.

---

## Getting Started

### Prerequisites

Install the following:

- [Node.js](https://nodejs.org/)
- npm (included with Node.js)
- Git (optional)

No external database server is required.

### 1. Clone the Repository

```bash
git clone https://github.com/sde0027/intranet-mail-app.git
```

Navigate into the project directory:

```bash
cd intranet-mail-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root.

Use `.env.example` as a reference.

Example configuration:

```env
PORT=3000
SESSION_SECRET=replace-with-a-strong-random-secret

COOKIE_SECURE=false

LOGIN_RATE_LIMIT_MAX=10
LOGIN_RATE_LIMIT_WINDOW_MS=900000
```

Configuration notes:

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port |
| `SESSION_SECRET` | Secret used for session signing |
| `COOKIE_SECURE` | Enables Secure cookie behaviour when HTTPS is configured |
| `LOGIN_RATE_LIMIT_MAX` | Maximum login attempts per IP |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | Login rate-limit window in milliseconds |

Keep `.env` out of version control.

Do not replace an existing session secret unnecessarily. Changing it invalidates existing login sessions.

### 4. Start the Backend

```bash
npm run server
```

The application:

1. Loads environment configuration.
2. Initializes the SQLite database connection.
3. Executes pending database migrations.
4. Initializes application middleware and routes.
5. Runs startup maintenance.
6. Starts the Express server.

Expected output:

```text
Database migrations complete.
Server running on port 3000
```

### 5. Verify the Backend

Open:

```text
http://localhost:3000/api/health
```

The health endpoint should report that the server is operational and the database is connected.

### 6. Start the Frontend Development Server

In a separate terminal:

```bash
npm run dev
```

Vite starts the frontend development server.

The frontend is currently pending development and integration.

---

## Testing and Verification

Postman has been used to verify the backend independently of the frontend.

### Authentication and Authorization

- Administrator registration.
- Successful login.
- Invalid credential handling.
- Session creation and persistence.
- Session expiration.
- Logout and session destruction.
- Unauthorized access rejection.
- Role-based authorization.
- Login rate limiting (login endpoint only).
- Self-service profile-photo upload for the authenticated employee.

### Email Workflows

- Sending messages between multiple accounts.
- TO, CC and BCC recipient handling.
- Inbox and sent-message retrieval.
- Pagination.
- Draft creation, retrieval, update and deletion.
- Individual email retrieval.
- Read/unread operations.
- Reply, reply-all and forward.
- Trash, restore and permanent deletion.
- Automatic Trash expiration.

### Attachment Verification

The following attachment tests passed:

- File upload.
- Attachment metadata retrieval.
- Attachment download.
- Unauthorized download rejection.
- Invalid file-signature rejection.
- Cleanup after failed email sending.

### Regression Testing

The critical email and authentication workflows were re-tested after the security and error-handling changes.

The regression checks passed, including session isolation between different users.

### Deployment Verification

The following operational checks passed:

- Server startup and restart.
- Local network accessibility.
- Database and attachment backup.
- Recovery verification using a separate test copy.

HTTPS remains deferred.

---

## Deployment

The application is intended to run on a computer within the organization's local network.

### Local Network Access

The backend must listen on a network-accessible interface rather than only the loopback interface.

Find the host computer's IPv4 address:

```powershell
ipconfig
```

For example, if the host address is `192.168.1.10`, another computer on the same network can access:

```text
http://192.168.1.10:3000/api/health
```

Windows Firewall must allow the required inbound connection.

### Persistent Data

The following resources must be backed up together:

```text
data/
├── intranet-email.sqlite
└── attachments/
```

The actual database filename is determined by application configuration.

For a straightforward consistent backup, stop the backend before copying the entire data directory.

### Deployment Considerations

- Use a stable host computer.
- Keep the database and attachment directory on persistent local storage.
- Restrict network access to the intended company network.
- Preserve the session secret.
- Use appropriate Windows Firewall rules.
- Maintain regular backups.
- Test database and attachment recovery.
- Configure HTTPS before production use.

---

## Development Roadmap

Development is organized into distinct phases.

### Phase 1 — Backend Development

- [x] Project initialization.
- [x] Node.js and Express.js setup.
- [x] SQLite database integration.
- [x] Migration system.
- [x] Persistent session storage.
- [x] Administrator registration.
- [x] Employee account management.
- [x] Authentication and authorization.
- [x] Login rate limiting.
- [x] Email composition and sending.
- [x] Multiple-recipient support.
- [x] Inbox and sent-message retrieval.
- [x] Pagination.
- [x] Draft management.
- [x] Read/unread functionality.
- [x] Reply and reply-all.
- [x] Forwarding.
- [x] Attachment upload and download.
- [x] Attachment access control and cleanup.
- [x] Trash and restore.
- [x] Automatic Trash retention cleanup.
- [x] Individual email retrieval.
- [x] Logout.
- [x] Centralized error handling.
- [x] Backend regression testing.
- [x] Deployment and recovery verification.

### Phase 2 — Frontend Development

- [ ] Authentication interfaces.
- [ ] Admin and employee sign-in experience.
- [ ] Application layout and navigation.
- [ ] Dashboard.
- [ ] Inbox interface.
- [ ] Individual email viewer.
- [ ] Compose email interface.
- [ ] TO, CC and BCC recipient selection.
- [ ] Attachment selection and upload.
- [ ] Sent messages interface.
- [ ] Draft management interface.
- [ ] Read/unread indicators.
- [ ] Reply and forwarding interface.
- [ ] Trash and restore interface.
- [ ] Employee management interface.
- [ ] Frontend and backend integration.
- [ ] Responsive design and usability testing.

### Phase 3 — Final Integration and Release

- [ ] End-to-end application testing.
- [ ] Cross-browser verification.
- [ ] Final security review.
- [ ] Operational documentation.
- [ ] Deployment configuration.
- [ ] Backup and recovery procedures.
- [ ] Production deployment.

---

## Design Decisions

### 1. SQLite Instead of an External Database Server

SQLite provides persistent relational storage without requiring a separately managed database service.

This keeps deployment straightforward for the intended small internal environment.

### 2. Modular Monolithic Architecture

A modular monolith separates responsibilities without introducing unnecessary distributed-system complexity.

### 3. Server-Managed Sessions

Authentication uses server-side sessions rather than stateless token-based authentication.

This provides centralized session invalidation and persistent session management.

### 4. Recipient-Specific Message State

Recipient associations maintain independent read/unread and Trash states.

Deleting a message from one mailbox does not automatically delete it from other recipients' mailboxes.

### 5. Local Attachment Storage

Attachment metadata is stored in SQLite, while the actual files remain on the local filesystem.

This avoids dependence on external file-storage services.

### 6. Migration-Based Database Management

Database schema changes are versioned and applied through migration files.

Existing data is preserved across normal application restarts.

### 7. Backend-First Development

Core application logic and persistence were implemented and verified before frontend development.

This allows frontend functionality to be built on top of established APIs.

---

## Limitations

The backend MVP is implemented, but the complete application is not yet finished.

Current limitations include:

- Automated end-to-end frontend testing remains pending.
- The application supports internal communication between registered employees, not external email providers.
- SMTP integration and external email delivery are outside the current scope.
- HTTPS has been deferred for the current development environment.
- Login rate limiting uses in-memory storage and resets when the server restarts.
- The current deployment is intended for a single application server.

---

## License

License information will be added once the project licensing decision has been finalized.

---

**Project Status:** Full-stack MVP implemented — enhancement and release-readiness verification in progress.

Built as a practical exploration of backend engineering, relational database design, authentication, session management, REST API development, file handling and full-stack application architecture.

## React frontend

The frontend has been migrated to React + Vite while retaining the existing Express, SQLite, and session-authentication backend.

### Development

Install the frontend dependencies and reconcile the lockfile:

```bash
npm install
```

Run the API and frontend in separate terminals:

```bash
npm run server
npm run dev
```

The Vite development server runs at `http://127.0.0.1:5173` and proxies `/api` requests to the Express server at `http://127.0.0.1:3000`.

### Frontend stack

- React and JSX
- React Router
- Tailwind CSS 4 with the Vite plugin
- Lucide React icons
- Native Fetch API with `credentials: "include"` for the existing Express session cookie

### Optional company portal links

Set these Vite environment variables when the final portal addresses are available:

```env
VITE_ATTENDANCE_PORTAL_URL=
VITE_INVENTORY_PORTAL_URL=
```

Until configured, the portal links remain visibly present but inactive. No temporary or guessed portal addresses are embedded in the application.

### Current frontend capabilities

- Employee and administrator sign-in modes with client-side validation
- Existing backend session login and logout
- Inbox, Sent, Drafts, and Trash views with pagination
- Message reading, trash, restore, and permanent deletion
- Compose and send with To, Cc, Bcc employee IDs and up to five attachments
- Save, edit, and delete drafts
- Reply, reply-all, and forward workflows
- Administrator employee list, account creation, profile editing, account activation/deactivation, and password reset
- Employee self-service profile-photo updates
- Employee self-service password changes with session invalidation
- Forgot-password guidance directing employees to contact an administrator
- Sender profile photos in opened email details

### Recipient input

The current backend accepts recipient user IDs in the `to`, `cc`, and `bcc` arrays. The compose form therefore accepts employee IDs separated by commas. An employee-accessible employee directory or email-to-ID lookup is not currently exposed by the backend, so the frontend does not attempt to call the administrator-only employee endpoint for regular employees.

### Build

```bash
npm run build
```

The Express backend and database schema are not modified by the React frontend migration.
