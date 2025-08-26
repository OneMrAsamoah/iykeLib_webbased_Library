-- iykeLib Digital Library Database Schema
-- Target DBMS: MySQL 8.0+
-- Author: Jules
--
-- This schema is designed to be robust, scalable, and normalized.
-- It includes tables for user management, content, tests, certificates,
-- user engagement, and analytics.
-- Indexes are created on foreign keys and frequently queried columns
-- to ensure optimal performance.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================
-- SECTION 1: USERS & ACCESS CONTROL
-- =============================================

-- `users` table: Stores information about all users.
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(50) NULL,
  `last_name` VARCHAR(50) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `roles` table: Defines the roles available in the system.
CREATE TABLE `roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `user_roles` table: Links users to roles (Many-to-Many).
CREATE TABLE `user_roles` (
  `user_id` INT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  FOREIGN KEY `fk_user_roles_user` (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY `fk_user_roles_role` (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================
-- SECTION 2: CONTENT MANAGEMENT
-- =============================================

-- `categories` table: For organizing books and tutorials.
CREATE TABLE `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `books` table: Stores all book details.
CREATE TABLE `books` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `author` VARCHAR(255) NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `description` TEXT NULL,
  `isbn` VARCHAR(20) NULL,
  `book_type` ENUM('file', 'link', 'purchase') NOT NULL DEFAULT 'file',
  `file_path` VARCHAR(255) NULL, -- Original filename for display
  `file_content` LONGBLOB NULL, -- Actual file content stored in database
  `file_size` INT NULL, -- File size in bytes
  `file_type` VARCHAR(100) NULL, -- MIME type (e.g., application/pdf)
  `external_link` VARCHAR(500) NULL, -- URL for external book (for link type)
  `purchase_link` VARCHAR(500) NULL, -- URL for purchasing the book (for purchase type)
  `price` DECIMAL(10, 2) NULL, -- Price for purchase type books
  `currency` VARCHAR(3) DEFAULT 'USD', -- Currency for price
  `cover_image_path` VARCHAR(255) NULL,
  `thumbnail_content` LONGBLOB NULL,
  `thumbnail_mime` VARCHAR(100) NULL,
  `published_year` SMALLINT NULL,
  `page_count` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_books_category` (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
  INDEX `idx_book_title` (`title`),
  INDEX `idx_book_type` (`book_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `tutorials` table: Stores all tutorial details.
CREATE TABLE `tutorials` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `description` TEXT NULL,
  `creator` VARCHAR(255) NULL, -- Creator/author of the tutorial
  `difficulty` ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL,
  `content_type` ENUM('Video', 'PDF') NOT NULL,
  `content_url` VARCHAR(255) NULL, -- URL for videos or external PDFs
  `embed_url` VARCHAR(1000) NULL, -- Optional full embed URL for quizzes/certifications
  `file_path` VARCHAR(255) NULL,   -- Path for locally hosted PDFs
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_tutorials_category` (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
  INDEX `idx_tutorial_title` (`title`),
  INDEX `idx_tutorial_creator` (`creator`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `tags` table: Stores all available tags for content.
CREATE TABLE `tags` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `slug` VARCHAR(60) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tag_name` (`name`),
  UNIQUE KEY `uq_tag_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `content_tags`: Polymorphic pivot table to link tags to books and tutorials.
CREATE TABLE `content_tags` (
  `tag_id` INT UNSIGNED NOT NULL,
  `content_id` INT UNSIGNED NOT NULL,
  `content_type` ENUM('book', 'tutorial') NOT NULL,
  PRIMARY KEY (`tag_id`, `content_id`, `content_type`),
  FOREIGN KEY `fk_content_tags_tag` (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE,
  INDEX `idx_content_tags_content` (`content_id`, `content_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `book_tutorial_recommendations`: Links books to recommended tutorials (Many-to-Many).
CREATE TABLE `book_tutorial_recommendations` (
  `book_id` INT UNSIGNED NOT NULL,
  `tutorial_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`book_id`, `tutorial_id`),
  FOREIGN KEY `fk_rec_book` (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  FOREIGN KEY `fk_rec_tutorial` (`tutorial_id`) REFERENCES `tutorials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================
-- SECTION 3: TESTS & CERTIFICATES
-- =============================================

-- `courses` table: Represents a subject/course for which a test can be taken.
CREATE TABLE `courses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `associated_book_id` INT UNSIGNED NULL, -- Optional link to a book
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_course_book` (`associated_book_id`) REFERENCES `books` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `test_results`: Stores user scores from external tests.
CREATE TABLE `test_results` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `course_id` INT UNSIGNED NOT NULL,
  `score` DECIMAL(5, 2) NOT NULL, -- e.g., 95.50
  `external_test_id` VARCHAR(255) NULL, -- ID used for fetching score
  `test_taken_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_test_results_user` (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY `fk_test_results_course` (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_user_course_test` (`user_id`, `course_id`) -- Assumes one result per user per course
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `certificates` table: Stores generated certificates for users.
CREATE TABLE `certificates` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `course_id` INT UNSIGNED NOT NULL,
  `validation_code` VARCHAR(100) NOT NULL,
  `issued_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_validation_code` (`validation_code`),
  FOREIGN KEY `fk_certificates_user` (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY `fk_certificates_course` (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================
-- SECTION 4: USER ENGAGEMENT
-- =============================================

-- `ratings`: Polymorphic table for user ratings and reviews on books/tutorials.
-- `ratings`: Polymorphic table for user votes (thumbs up/down) and reviews on books/tutorials.
CREATE TABLE `ratings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `content_id` INT UNSIGNED NOT NULL,
  `content_type` ENUM('book', 'tutorial') NOT NULL,
  `vote` TINYINT NOT NULL, -- 1 for thumbs up, -1 for thumbs down
  `review` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_ratings_user` (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_user_content_rating` (`user_id`, `content_id`, `content_type`),
  INDEX `idx_ratings_content` (`content_id`, `content_type`),
  CHECK (`vote` IN (1, -1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `bookmarks`: Polymorphic table for users to bookmark content.
CREATE TABLE `bookmarks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `content_id` INT UNSIGNED NOT NULL,
  `content_type` ENUM('book', 'tutorial') NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_bookmarks_user` (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_user_content_bookmark` (`user_id`, `content_id`, `content_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `reading_history`: Polymorphic table to track user progress in books/tutorials.
CREATE TABLE `reading_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `content_id` INT UNSIGNED NOT NULL,
  `content_type` ENUM('book', 'tutorial') NOT NULL,
  `progress` VARCHAR(50) NULL, -- e.g., "page 50" or "25:30" timestamp
  `last_accessed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_history_user` (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_user_content_history` (`user_id`, `content_id`, `content_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `comments`: Polymorphic table for comments on content, with support for replies.
CREATE TABLE `comments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `content_id` INT UNSIGNED NOT NULL,
  `content_type` ENUM('book', 'tutorial') NOT NULL,
  `parent_comment_id` INT UNSIGNED NULL, -- For threaded replies
  `comment_text` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_comments_user` (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY `fk_comments_parent` (`parent_comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE,
  INDEX `idx_comments_content` (`content_id`, `content_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================
-- SECTION 5: ANALYTICS & LOGGING
-- =============================================

-- `download_logs`: Logs every file download for analytics.
CREATE TABLE `download_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `content_id` INT UNSIGNED NOT NULL,
  `content_type` ENUM('book', 'tutorial') NOT NULL,
  `downloaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(45) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_download_logs_user` (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_download_logs_content` (`content_id`, `content_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `view_logs`: Logs content views for tracking popularity.
CREATE TABLE `view_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NULL, -- Can be NULL for anonymous views
  `content_id` INT UNSIGNED NOT NULL,
  `content_type` ENUM('book', 'tutorial') NOT NULL,
  `viewed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(45) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_view_logs_user` (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_view_logs_content` (`content_id`, `content_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `search_history`: Logs user search queries.
CREATE TABLE `search_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NULL, -- Can be NULL for anonymous searches
  `search_query` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_search_history_user` (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `user_activity_logs`: Generic log for important user actions.
CREATE TABLE `user_activity_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `action_type` VARCHAR(50) NOT NULL, -- e.g., 'USER_LOGIN', 'BOOK_UPLOAD'
  `details` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY `fk_activity_logs_user` (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- MIGRATION SCRIPTS FOR EXISTING DATABASES
-- =============================================

-- Migration: Add creator field to existing tutorials table
-- Run this if you have an existing database without the creator field
/*
ALTER TABLE `tutorials` 
ADD COLUMN `creator` VARCHAR(255) NULL COMMENT 'Creator/author of the tutorial' AFTER `description`,
ADD INDEX `idx_tutorial_creator` (`creator`);
*/

-- Migration: Update existing tutorials to set a default creator if needed
-- Run this if you want to set a default creator for existing tutorials
/*
UPDATE `tutorials` 
SET `creator` = 'Unknown Author' 
WHERE `creator` IS NULL;
*/
