-- Migration: Update policy to allow age 10–18 and grades 5–12
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_teen_age_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_teen_grade_check;
ALTER TABLE applications
  ADD CONSTRAINT applications_teen_age_check CHECK (teen_age >= 10 AND teen_age <= 18);
ALTER TABLE applications
  ADD CONSTRAINT applications_teen_grade_check CHECK (teen_grade >= 5 AND teen_grade <= 12);
