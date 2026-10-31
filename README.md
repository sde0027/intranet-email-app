# Intranet Mail Application

A self-hosted, internal email communication system designed for organizations to facilitate secure communication between employees through a centralized application.

The project aims to provide essential email functionality, including user authentication, message composition, inbox and sent-mail management, recipient handling, and eventually attachments, all within an organization's local network.

> **Development Status:** Backend MVP — Core authentication and email workflows implemented and tested. Frontend development is pending.

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
- [Testing](#testing)
- [Development Roadmap](#development-roadmap)
- [Design Decisions](#design-decisions)
- [Limitations](#limitations)
- [License](#license)

---

## Overview

The Intranet Mail Application is a web-based internal messaging platform intended for organizations that require a centralized communication system accessible within their internal network.

Unlike conventional email services that depend on external email providers, this application focuses on communication between registered users within a controlled organizational environment.

The application follows a modular monolithic architecture, keeping the system straightforward to develop, maintain, and deploy while maintaining separation of responsibilities across its modules.

### Core Concept

- Administrators manage the initial user registration process.
- Registered employees authenticate using their credentials.
- Authenticated users can compose and send messages to other registered employees.
- Messages are delivered to the respective recipients' inboxes.
- Users can access their sent messages and manage their email conversations.

---

## Project Objectives

1. Develop a centralized internal communication platform.
2. Implement secure user authentication and session management.
3. Support communication between individual employees and multiple recipients.
4. Maintain independent recipient-specific message states.
5. Provide efficient inbox and sent-message retrieval with pagination.
6. Keep application data and attachments under local infrastructure control.
7. Build a maintainable backend that can support future frontend development and additional features.

---

## Technology Stack

| Component                   | Technology                                |
| --------------------------- | ----------------------------------------- |
| Frontend                    | HTML5, CSS3, Vanilla JavaScript           |
| CSS Framework               | Tailwind CSS (planned for UI development) |
| Backend Runtime             | Node.js                                   |
| Backend Framework           | Express.js 5                              |
| Database                    | SQLite                                    |
| Database Driver             | better-sqlite3                            |
| Authentication              | express-session                           |
| Password Hashing            | Argon2                                    |
| Configuration               | dotenv                                    |
| Frontend Development Server | Vite                                      |
| API Testing                 | Postman                                   |
| Version Control             | Git and GitHub                            |

### Architectural Approach

The application uses a **modular monolithic architecture**.

Instead of introducing unnecessary distributed services, the backend operates as a single application while keeping individual responsibilities separated into logical modules.

SQLite serves as the persistent database, making the application suitable for local deployment without requiring an external database server.

---

## Architecture

The application follows a client-server architecture.

```text
              Client (Web Browser)
                      |
                      |
                 HTTP Requests
                      |
                      v
              Express.js Server
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
      Authentication Users     Emails
          Module      Module    Module
          |           |           |
          +-----------+-----------+
                      |
                      v
                 SQLite DB
                      |
          +-----------+-----------+
          |                       |
          v                       v
      Database                Migrations
      Operations              and Schema
```

### Architectural Responsibilities

| Layer            | Responsibility                                  |
| ---------------- | ----------------------------------------------- |
| Frontend         | User interaction and presentation               |
| Express Server   | HTTP request handling and routing               |
| Authentication   | Login, sessions, and access control             |
| User Module      | Employee account management                     |
| Email Module     | Message composition, delivery, and retrieval    |
| Database Layer   | Persistent data storage and SQL operations      |
| Migration System | Database schema creation and version management |

---

## Project Structure

The current project structure is organized as follows:

```text
intranet-mail-app/
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
│   │   └── migrations/
│   │       ├── 001-initial-schema.sql
│   │       └── 002-sessions.sql
│   │
│   └── frontend/
│       ├── css/
│       │   └── style.css
│       │
│       └── js/
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── .gitignore
└── README.md
```

The structure may evolve as additional modules and frontend functionality are introduced.

---

## Implemented Features

The following functionality has been implemented and tested.

### 1. Authentication and User Management

- Administrator registration.
- User login and authentication.
- Password hashing using Argon2.
- Server-managed sessions.
- Persistent session storage.
- Authentication middleware for protected operations.
- Session-based access control.

### 2. Email Management

- Compose and send messages.
- Send messages to individual employees.
- Support multiple recipients.
- Maintain sender and recipient relationships.
- Retrieve inbox messages.
- Retrieve sent messages.
- Paginated message retrieval.

### 3. Database and Persistence

- SQLite database integration.
- Migration-based schema management.
- Separate session persistence.
- Persistent storage of user and email records.
- Recipient-specific email records.
- Transactional message creation and recipient assignment.

### 4. Testing and Verification

The following workflows have been manually tested using Postman:

- Successful administrator registration.
- Successful authentication.
- Creation of additional user accounts.
- Sending messages between multiple accounts.
- Retrieving inbox and sent messages.
- Exchanging messages between multiple users.
- Verifying pagination behavior.
- Confirming persistence across application requests.

**Current verification status:** The implemented authentication and email workflows are functioning as expected in the local development environment.

---

## Database Design

The application uses SQLite as its relational database.

Database schema changes are managed through SQL migration files rather than being created manually during application execution.

### Current Migrations

| Migration                | Responsibility                      |
| ------------------------ | ----------------------------------- |
| `001-initial-schema.sql` | Initial application database schema |
| `002-sessions.sql`       | Persistent session storage          |

### Core Database Entities

The database design separates message information from recipient-specific information.

| Entity           | Responsibility                                                       |
| ---------------- | -------------------------------------------------------------------- |
| Users            | Stores registered employee accounts                                  |
| Emails           | Stores message information                                           |
| Email Recipients | Maintains recipient relationships and individual message state       |
| Attachments      | Reserved for attachment metadata and future attachment functionality |
| Sessions         | Stores persistent authentication sessions                            |

This separation allows a single message to be associated with multiple recipients without duplicating the original message content.

It also provides a foundation for recipient-specific operations such as read/unread status and message management.

---

## Authentication and Security

Security is considered at the backend level from the beginning of development.

Current security-related implementations include:

- Argon2 password hashing instead of storing plaintext passwords.
- Session-based authentication.
- HTTP-only session cookies.
- Persistent server-side session storage.
- Protected backend operations.
- Parameterized SQL queries.
- Database foreign-key enforcement.
- Transactional handling of message creation.

The application does not store user passwords in plaintext or expose password hashes through successful authentication responses.

Further security hardening, including deployment-specific cookie configuration, CSRF protection, rate limiting, and additional authorization checks, remains part of the development roadmap.

---

## API Overview

The backend exposes REST-style HTTP endpoints for application functionality.

The API currently covers the following functional areas:

| Module         | Functionality                                             |
| -------------- | --------------------------------------------------------- |
| Authentication | Administrator registration, login, session authentication |
| Users          | Employee account creation and user management             |
| Emails         | Message composition and sending                           |
| Inbox          | Retrieving received messages                              |
| Sent           | Retrieving messages sent by the authenticated user        |

Message retrieval supports pagination.

For the complete endpoint definitions, request payloads, response structures, and authentication requirements, refer to the backend implementation.

---

## Getting Started

### Prerequisites

Install the following before running the application:

- [Node.js](https://nodejs.org/)
- npm (included with Node.js)
- Git (optional, for cloning the repository)

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

Refer to `src/config/config.js` for the environment variables and configuration values required by the application.

Keep sensitive configuration values out of version control.

### 4. Start the Backend

Run the backend server using:

```bash
node src/server.js
```

On startup, the application initializes the database connection and executes any pending migrations.

Expected startup output:

```text
Database migrations complete.
Server running on port 3000
```

The application exposes a health-check endpoint at:

```text
http://localhost:3000/api/health
```

### 5. Start the Frontend Development Server

In a separate terminal:

```bash
npm run dev
```

Vite starts the frontend development server.

---

## Testing

Postman is currently used for backend API testing.

The implemented backend workflows have been tested independently of the frontend.

Testing currently covers:

- Authentication and session creation.
- User registration.
- Message sending.
- Multiple-recipient workflows.
- Inbox and sent-message retrieval.
- Pagination.
- Communication between multiple registered accounts.

Automated integration and unit test coverage is a future improvement.

---

## Development Roadmap

The project is being developed incrementally, with backend functionality established before frontend integration.

### Completed

- [x] Project initialization.
- [x] Node.js and Express.js setup.
- [x] SQLite database integration.
- [x] Database migration system.
- [x] Persistent session storage.
- [x] Administrator registration.
- [x] User authentication.
- [x] Password hashing.
- [x] Session-based authentication.
- [x] User account creation.
- [x] Email composition and sending.
- [x] Multiple-recipient support.
- [x] Inbox retrieval.
- [x] Sent-message retrieval.
- [x] Pagination.
- [x] Postman workflow testing.

### Pending Development

- [ ] Frontend application development.
- [ ] Login and registration interfaces.
- [ ] Inbox and sent-mail interfaces.
- [ ] Email composition interface.
- [ ] Draft management.
- [ ] Read/unread message functionality.
- [ ] Reply and forward functionality.
- [ ] File attachment upload and download.
- [ ] Frontend and backend integration.
- [ ] Automated testing.
- [ ] Deployment and local network accessibility.
- [ ] Final security hardening.

---

## Design Decisions

A few architectural decisions guide the development of this project:

**1. SQLite instead of an external database server**

SQLite provides persistent relational storage without requiring a separately managed database service. This keeps initial deployment simple.

**2. Modular monolithic architecture**

A modular monolith provides separation of responsibilities without introducing the operational complexity of microservices.

**3. Server-managed sessions**

Authentication is based on server-side sessions rather than stateless token-based authentication.

**4. Migration-based database management**

Database schema changes are versioned and applied through migration files, providing a predictable database initialization process.

**5. Backend-first development**

Core application logic and persistence are implemented and tested before building the frontend. This allows API functionality to be verified independently.

---

## Limitations

The current implementation is an MVP and is not yet a production-ready enterprise email server.

- The frontend is not yet implemented.
- The application is designed for internal communication between registered users, not communication with external email providers.
- SMTP integration and external email delivery are outside the current scope.
- File attachment workflows are not yet implemented.
- Deployment and multi-user network access have not yet been verified.
- Additional security hardening and automated testing are required before production deployment.

---

## License

License information will be added once the project licensing decision has been finalized.

---

**Project Status:** Active Development

Built as a practical exploration of backend engineering, relational database design, authentication, REST API development, and full-stack application architecture.
