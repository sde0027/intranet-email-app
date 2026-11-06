# Enhancement Release 1 — Backend and Frontend Changes

This change set is based on the supplied `audit&testing1(1).zip` source snapshot.

## Implemented

### Message sender profile photo
- `GET /api/emails/:id` now returns `sender.profile_photo_url`.
- The existing `MessagePage` Avatar already consumes this field, so opened inbox and sent messages now display the sender's image when present and initials otherwise.

### Password management
- `POST /api/auth/change-password` is available to authenticated users.
- Requires `currentPassword` and `newPassword`; the new password must contain at least 8 characters and differ from the current password.
- Current password verification and hashing use Argon2.
- All persisted sessions for the account are invalidated after a successful change.
- `POST /api/employees/:id/reset-password` is administrator-only and invalidates all sessions belonging to the target employee.
- Login-page forgot-password guidance tells users to contact their administrator.
- Login rate limiting now applies only to `POST /api/auth/login`, not authenticated account operations.

### Self-service profile photo
- `PUT /api/employees/me/photo` accepts one `profile_photo` multipart file.
- Only the authenticated user's own photo is changed.
- JPEG, PNG and WebP are validated by file signature; the existing 5 MB limit is retained.
- The existing administrator profile-edit endpoint remains administrator-only.

### Attachment deduplication
- Migration `007-attachment-content-hash.sql` removes the uniqueness constraint from `attachments.storage_name` and adds nullable `content_hash` metadata.
- New uploads are validated and SHA-256 hashed.
- If the same content already has a valid physical file in `data/attachments`, the temporary duplicate is removed and the existing storage filename is reused.
- Duplicate content within a single multi-file upload is also deduplicated.
- Existing attachment hashes are backfilled by startup maintenance.
- Cleanup skips reused files, preventing a failed send from deleting a file that was already referenced by another email.

## API additions

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/change-password` | Authenticated |
| PUT | `/api/employees/me/photo` | Authenticated |
| POST | `/api/employees/:id/reset-password` | Admin |

## Verification performed in this environment

- Backend JavaScript syntax checks: passed.
- React JSX parsing checks: passed.
- SQLite migration 007 integration check against migrations 001–006: passed.
- Duplicate `storage_name` references after migration: passed.
- SQLite foreign-key integrity check after migration: passed.
- Full `npm ci` did not complete within the execution time limit. Therefore, Vite production build and live HTTP/Argon2 integration tests have not been verified here and must be run in the local development environment.

## Manual regression scenarios still required

1. Open an inbox email and a sent email from an employee with a profile photo; verify the photo appears in the message header.
2. Change password with the correct current password; verify the old password fails and all old sessions are rejected.
3. Attempt password change with an incorrect current password; verify the session remains valid and the password is unchanged.
4. Use Forgot password on the login page; verify the administrator guidance appears.
5. Upload a profile photo as an employee; verify the employee can update only their own photo.
6. Attempt self-photo upload with an invalid signature and a file larger than 5 MB; verify rejection.
7. Reset another employee's password as an admin; verify the target employee's existing sessions are rejected.
8. Send identical attachment content in separate emails; verify both metadata rows reference one `storage_name` and the physical file exists once.
9. Send two identical files in one message; verify both metadata records resolve to the same physical file.
10. Force an email-send failure after upload; verify temporary new files are cleaned up but reused files remain intact.
