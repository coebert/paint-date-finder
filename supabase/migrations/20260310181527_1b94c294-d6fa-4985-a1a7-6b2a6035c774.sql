-- Add league column to teams table to distinguish CPPS vs other leagues
ALTER TABLE teams ADD COLUMN league text NOT NULL DEFAULT 'CPPS';

-- Update existing teams to be CPPS
UPDATE teams SET league = 'CPPS' WHERE league IS NULL OR league = '';