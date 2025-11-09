-- Migration: Update age/grade constraints to new policy (11–18 years, grades 6–12)
-- Safe to run multiple times due to IF EXISTS

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_teen_age_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_teen_grade_check;

ALTER TABLE applications
  ADD CONSTRAINT applications_teen_age_check CHECK (teen_age >= 11 AND teen_age <= 18);

ALTER TABLE applications
  ADD CONSTRAINT applications_teen_grade_check CHECK (teen_grade >= 6 AND teen_grade <= 12);
