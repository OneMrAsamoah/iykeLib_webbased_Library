-- Migration Script: Add creator field to tutorials table
-- Run this script on existing databases to add the creator field
-- Date: 2024
-- Description: Adds creator/author field to tutorials for content attribution

-- Add the creator column to the tutorials table
ALTER TABLE `tutorials` 
ADD COLUMN `creator` VARCHAR(255) NULL COMMENT 'Creator/author of the tutorial' AFTER `description`;

-- Add an index on the creator field for better query performance
ALTER TABLE `tutorials` 
ADD INDEX `idx_tutorial_creator` (`creator`);

-- Add embed_url column for tutorial-specific quiz/embed links
ALTER TABLE `tutorials`
ADD COLUMN `embed_url` VARCHAR(1000) NULL COMMENT 'Full embed URL for external quizzes/certificates' AFTER `content_url`;

-- Optional: Set a default creator for existing tutorials
-- Uncomment the line below if you want to set a default value
-- UPDATE `tutorials` SET `creator` = 'Unknown Author' WHERE `creator` IS NULL;

-- Verify the changes
DESCRIBE `tutorials`;

-- Show the new structure
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'tutorials' 
ORDER BY ORDINAL_POSITION;
