-- Extend employee profiles without modifying previously applied migrations.
ALTER TABLE users ADD COLUMN designation TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN profile_photo TEXT;
