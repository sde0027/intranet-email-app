-- Add a human-managed employee identifier without changing the internal
-- integer primary key used by email, recipient, and session relationships.
ALTER TABLE users ADD COLUMN employee_code TEXT;

-- Give existing accounts stable identifiers before enforcing uniqueness.
UPDATE users
SET employee_code = 'EMP-' || printf('%04d', id)
WHERE employee_code IS NULL OR trim(employee_code) = '';

CREATE UNIQUE INDEX idx_users_employee_code
ON users(employee_code COLLATE NOCASE);

-- SQLite cannot add a NOT NULL column without rebuilding the users table.
-- These triggers enforce the same non-empty requirement for future writes.
CREATE TRIGGER users_employee_code_required_insert
BEFORE INSERT ON users
WHEN NEW.employee_code IS NULL OR trim(NEW.employee_code) = ''
BEGIN
  SELECT RAISE(ABORT, 'Employee ID is required.');
END;

CREATE TRIGGER users_employee_code_required_update
BEFORE UPDATE OF employee_code ON users
WHEN NEW.employee_code IS NULL OR trim(NEW.employee_code) = ''
BEGIN
  SELECT RAISE(ABORT, 'Employee ID is required.');
END;
