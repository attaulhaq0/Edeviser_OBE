# Requirements Document — XP Marketplace & Virtual Economy

## Introduction

The XP Marketplace feature expands the existing gamification engine in Edeviser from a simple earn-and-display system into a full virtual economy. Currently, students earn XP through activities (login, submission, grading, streaks, badges) tracked in the append-only `xp_transactions` ledger, with `xp_total` derived from SUM. The only spending mechanism is the streak freeze (200 XP, stored in `student_gamification.streak_freezes_available`). This feature introduces: (1) a Virtual Wallet that tracks spendable XP balance (earned minus spent); (2) an XP Marketplace where students browse and purchase items using earned XP; (3) three item categories — Cosmetic (profile themes, avatar frames, display titles), Educational Perks (extra quiz attempt, deadline extension, AI Tutor hint tokens), and Power-ups (2x XP boost, streak shield upgrade); (4) an equipped-items system where cosmetic purchases are visible on the student's profile and leaderboard; (5) an Admin Marketplace Management panel for configuring items, prices, level gates, sales events, and usage analytics; (6) Creative Expression & Knowledge Quests — student-created content (study plans, peer quiz questions, CLO explanation videos) with "Architect" and "Creator" badges, time-limited Knowledge Quests that unlock exclusive marketplace items, and surprise XP mechanics (random bonus questions, mystery reward boxes) to address Octalysis Core Drives 3, 6, and 7; (7) an XP Economist admin dashboard with earn/spend ratio monitoring, dynamic pricing that adjusts based on purchase frequency, and XP sinks (cosmetic upgrades, seasonal items, class donations) to prevent marketplace inflation; (8) an enhanced leaderboard system with Personal Best and Most Improved leaderboards, percentile bands for students outside the top 10, and league tiers (Bronze, Silver, Gold, Diamond) to reduce demotivation for lower performers; and (9) a tiered badge system (Bronze/Silver/Gold) with a rotating Badge Spotlight and badge archiving to combat badge fatigue. The feature integrates with the existing Supabase backend (PostgreSQL + RLS, Edge Functions, Realtime), TanStack Query hooks, and the existing XP/level/streak/badge subsystems.

## Glossary

- **Marketplace**: The student-facing UI where available items are browsed, filtered by category, and purchased using spendable XP
- **Marketplace_Item**: A purchasable item defined in the `marketplace_items` table, with properties including name, description, category, XP price, level requirement, stock type, and active status
- **Virtual_Wallet**: The subsystem that computes a student's spendable XP balance as total earned XP (SUM of positive `xp_transactions`) minus total spent XP (SUM of `xp_purchases.xp_cost`), displayed on the student dashboard and navigation
- **XP_Balance**: The computed spendable XP for a student, derived from: SUM(xp_transactions.xp_amount) − SUM(xp_purchases.xp_cost)
- **XP_Purchase**: An append-only record in the `xp_purchases` table representing a completed marketplace transaction, linking a student to a Marketplace_Item with the XP cost at time of purchase
- **Purchase_Processor**: The Edge Function that validates a purchase request (sufficient balance, level requirement, item availability, sale pricing), atomically inserts the XP_Purchase record, and triggers item activation
- **Cosmetic_Item**: A Marketplace_Item in the "cosmetic" category — includes profile themes, avatar frames, profile borders, display badges, and custom leaderboard titles
- **Educational_Perk**: A Marketplace_Item in the "educational_perk" category — includes extra quiz attempt tokens, deadline extension tokens, and AI Tutor hint token packs
- **Power_Up**: A Marketplace_Item in the "power_up" category — includes time-limited XP multiplier boosts and streak shield upgrades
- **Equipped_Item**: A Cosmetic_Item that a student has activated for display on their profile and leaderboard entry, stored in the `student_equipped_items` table
- **Item_Inventory**: The collection of all purchased items for a student, stored in `xp_purchases` and queryable as the student's owned items
- **Sale_Event**: A time-bounded price reduction on one or more Marketplace_Items, configured by an Admin with a discount percentage and start/end dates
- **Level_Gate**: A minimum student level required to purchase a specific Marketplace_Item, enforced by the Purchase_Processor
- **Stock_Type**: Defines item availability — "unlimited" (always available), "limited" (finite quantity across institution), or "one_per_student" (each student can purchase at most once)
- **Admin_Marketplace_Panel**: The admin-facing UI for managing Marketplace_Items, Sale_Events, and viewing marketplace analytics
- **Marketplace_Analytics**: Aggregated metrics on marketplace activity — most purchased items, total XP spent, XP circulation rate, purchase trends over time
- **Profile_Theme**: A Cosmetic_Item that changes the student's dashboard color accent within design system constraints (predefined theme palettes, not arbitrary colors)
- **Avatar_Frame**: A Cosmetic_Item that adds a decorative border around the student's profile picture
- **Display_Title**: A Cosmetic_Item that adds a custom title shown next to the student's name on the leaderboard (e.g., "The Scholar", "Night Owl")
- **Knowledge_Quest**: A time-limited learning activity created by an Admin that awards exclusive marketplace items or rare rewards upon completion within the time window
- **Mystery_Reward_Box**: A randomized reward container that occasionally replaces a standard XP award, containing a random prize (bonus XP, rare cosmetic, temporary boost) revealed with an unboxing animation
- **Bonus_Question**: A random pop-up question presented to a student during a study session that awards surprise XP upon correct answer
- **XP_Economist_Dashboard**: An admin-facing analytics panel displaying earn/spend ratios, XP velocity, inflation indicators, and dynamic pricing recommendations for the virtual economy
- **Dynamic_Pricing**: An automated pricing mechanism that adjusts marketplace item prices based on purchase frequency — popular items increase in price, unpopular items decrease — within admin-configured bounds
- **XP_Sink**: A mechanism that removes XP from circulation to prevent inflation, including cosmetic upgrades, seasonal limited-edition items, and class donations
- **Class_Donation**: An XP sink where a student donates XP to unlock a shared study resource (e.g., practice exam, study guide) for all students in a course
- **Earn_Spend_Ratio**: The ratio of total XP earned to total XP spent across an institution, used as the primary inflation indicator (target: 3:1)
- **Personal_Best_Leaderboard**: A leaderboard variant that compares a student's current performance metrics against their own historical performance
- **Most_Improved_Leaderboard**: A leaderboard variant that ranks students by the magnitude of their performance improvement over a configurable time window
- **League_Tier**: A competitive grouping (Bronze, Silver, Gold, Diamond) based on cumulative XP ranges, where students compete within their tier rather than against the entire cohort
- **Percentile_Band**: A display format showing a student's approximate ranking as a percentile range (top 10%, top 25%, top 50%) instead of an exact numeric rank
- **Badge_Tier**: A progression level (Bronze, Silver, Gold) within a single badge definition, where each tier has increasingly difficult unlock conditions
- **Badge_Spotlight**: A weekly rotating feature that highlights one badge on the student dashboard, showing progress toward earning it and increasing engagement with underused badges
- **Archived_Badge**: A badge that has been moved to an archive collection, still visible in a student's history but no longer actively displayed or promoted
- **Student_Content**: User-generated learning content created by students, including custom study plans, peer quiz questions, and CLO explanation videos, eligible for "Architect" and "Creator" badges

## Requirements

### SECTION A: Virtual Wallet

#### Requirement 1: XP Balance Computation

**User Story:** As a Student, I want to see my spendable XP balance, so that I know how much XP I can spend in the marketplace.

##### Acceptance Criteria

1. THE Virtual_Wallet SHALL compute XP_Balance as: SUM of all `xp_transactions.xp_amount` for the student minus SUM of all `xp_purchases.xp_cost` for the student.
2. WHEN a new XP_Purchase is recorded, THE Virtual_Wallet SHALL reflect the updated XP_Balance within 2 seconds.
3. WHEN new XP is awarded via the existing `award-xp` Edge Function, THE Virtual_Wallet SHALL reflect the updated XP_Balance within 2 seconds.
4. THE Virtual_Wallet SHALL display the XP_Balance on the student dashboard hero card alongside the existing total XP and level display.
5. THE Virtual_Wallet SHALL display the XP_Balance in the student sidebar navigation as a persistent indicator.
6. IF the computed XP_Balance is negative due to a data inconsistency, THEN THE Virtual_Wallet SHALL display 0 and log an error for admin review.

---

#### Requirement 2: Transaction History

**User Story:** As a Student, I want to see a history of my XP earnings and spending, so that I can track where my XP comes from and where it goes.

##### Acceptance Criteria

1. THE Virtual_Wallet SHALL display a unified transaction history combining XP earnings (from `xp_transactions`) and XP spending (from `xp_purchases`) in reverse chronological order.
2. Each earning entry SHALL display: date, XP amount, source label (e.g., "Login Bonus", "Assignment Submission", "Badge Earned"), and reference details where available.
3. Each spending entry SHALL display: date, XP cost, item name, and item category.
4. THE transaction history SHALL support pagination with 20 entries per page.
5. THE transaction history SHALL support filtering by type (earnings only, spending only, all).

---

### SECTION B: XP Marketplace — Student Experience

#### Requirement 3: Marketplace Browsing and Discovery

**User Story:** As a Student, I want to browse available marketplace items by category, so that I can discover items I want to purchase with my XP.

##### Acceptance Criteria

1. THE Marketplace SHALL display items organized into three category tabs: Cosmetic, Educational Perks, and Power-ups.
2. THE Marketplace SHALL display each Marketplace_Item with: name, description, icon/preview image, XP price, level requirement (if any), and availability status.
3. WHEN a Marketplace_Item has a Level_Gate higher than the student's current level, THE Marketplace SHALL display the item as locked with the required level shown.
4. WHEN a Sale_Event is active for a Marketplace_Item, THE Marketplace SHALL display the original price with a strikethrough and the discounted price alongside a sale badge.
5. THE Marketplace SHALL display the student's current XP_Balance prominently at the top of the page.
6. WHEN a Marketplace_Item has Stock_Type "limited", THE Marketplace SHALL display the remaining quantity available.
7. WHEN a Marketplace_Item has Stock_Type "one_per_student" and the student has already purchased the item, THE Marketplace SHALL display the item as "Owned".

---

#### Requirement 4: Item Purchase Flow

**User Story:** As a Student, I want to purchase marketplace items with my XP, so that I can use earned XP for rewards that enhance my experience.

##### Acceptance Criteria

1. WHEN a Student initiates a purchase, THE Marketplace SHALL display a confirmation dialog showing: item name, XP cost (sale price if applicable), current XP_Balance, and remaining balance after purchase.
2. WHEN a Student confirms a purchase, THE Purchase_Processor SHALL validate: (a) the student's XP_Balance is sufficient, (b) the student meets the Level_Gate requirement, (c) the item is active and available (stock check), and (d) the sale price is still valid if a Sale_Event applies.
3. WHEN all validations pass, THE Purchase_Processor SHALL atomically insert an XP_Purchase record with the XP cost at time of purchase.
4. WHEN the purchase succeeds, THE Marketplace SHALL display a success animation and update the XP_Balance immediately.
5. IF the student's XP_Balance is insufficient, THEN THE Purchase_Processor SHALL reject the purchase and return a descriptive error indicating the shortfall.
6. IF the Marketplace_Item is no longer available (out of stock or deactivated between page load and purchase), THEN THE Purchase_Processor SHALL reject the purchase and return a descriptive error.
7. IF the Sale_Event expired between page load and purchase confirmation, THEN THE Purchase_Processor SHALL reject the purchase and prompt the student to review the updated price.

---

#### Requirement 5: Student Item Inventory

**User Story:** As a Student, I want to view all items I have purchased, so that I can manage and use my owned items.

##### Acceptance Criteria

1. THE Marketplace SHALL include an "My Items" section displaying all items the student has purchased, grouped by category.
2. Each owned item SHALL display: item name, purchase date, XP cost paid, and current status (active, consumed, expired).
3. WHEN a student owns a Cosmetic_Item, THE inventory SHALL provide an "Equip" action to activate the item for display.
4. WHEN a student owns an Educational_Perk token, THE inventory SHALL display the remaining uses (e.g., "1 extra quiz attempt remaining").
5. WHEN a student owns a Power_Up, THE inventory SHALL display whether the Power_Up is currently active and the remaining duration if applicable.

---

### SECTION C: Cosmetic Items System

#### Requirement 6: Profile Theme Application

**User Story:** As a Student, I want to apply purchased profile themes to customize my dashboard appearance, so that I can personalize my learning environment.

##### Acceptance Criteria

1. THE Platform SHALL define a set of Profile_Theme options as predefined color palettes within the design system (e.g., "Ocean Blue", "Forest Green", "Sunset Orange", "Midnight Purple"), each specifying accent color overrides for the student dashboard.
2. WHEN a Student equips a Profile_Theme, THE student's dashboard SHALL render using the theme's accent color palette instead of the default blue accent.
3. THE Platform SHALL apply Profile_Theme changes only to the student's own dashboard view — other users viewing the student's profile SHALL see the themed version.
4. WHEN a Student unequips a Profile_Theme, THE dashboard SHALL revert to the default color palette.
5. THE Student SHALL be able to equip only one Profile_Theme at a time; equipping a new theme SHALL automatically unequip the previous one.

---

#### Requirement 7: Avatar Frames and Display Titles

**User Story:** As a Student, I want to equip avatar frames and display titles, so that my profile and leaderboard entry reflect my achievements and personality.

##### Acceptance Criteria

1. WHEN a Student equips an Avatar_Frame, THE Platform SHALL render the frame border around the student's profile picture on the student profile page and leaderboard.
2. WHEN a Student equips a Display_Title, THE Platform SHALL show the title text below the student's name on the leaderboard.
3. THE Student SHALL be able to equip one Avatar_Frame and one Display_Title simultaneously.
4. WHEN a student has opted out of the leaderboard (anonymous mode), THE Platform SHALL still apply equipped cosmetics to the student's own profile view but hide them from the leaderboard.
5. THE leaderboard rendering SHALL gracefully handle students with no equipped cosmetics by displaying the default profile picture border and no title.

---

### SECTION D: Educational Perks

#### Requirement 8: Extra Quiz Attempt Token

**User Story:** As a Student, I want to use an extra quiz attempt token to retake a completed quiz, so that I can improve my score on assessments I struggled with.

##### Acceptance Criteria

1. WHEN a Student uses an Extra Quiz Attempt token on a completed quiz, THE Platform SHALL allow one additional attempt on that quiz beyond the teacher-configured attempt limit.
2. THE Platform SHALL consume the token (mark as "consumed" in `xp_purchases`) upon starting the extra attempt, not upon purchase.
3. THE Platform SHALL record the extra attempt using the existing `quiz_attempts` pipeline, including auto-grading, evidence generation, and attainment rollup.
4. THE Teacher SHALL be able to view which students used extra attempt tokens in the quiz analytics.
5. IF the quiz has been closed by the Teacher (past the final deadline with no late window), THEN THE Platform SHALL prevent the use of the extra attempt token and display a descriptive message.

---

#### Requirement 9: Deadline Extension Token

**User Story:** As a Student, I want to use a deadline extension token to get 24 extra hours on an assignment, so that I can manage unexpected time pressures.

##### Acceptance Criteria

1. WHEN a Student uses a Deadline Extension token on an assignment, THE Platform SHALL extend the student's personal deadline for that assignment by 24 hours from the original due date.
2. THE Platform SHALL consume the token upon activation, recording the extension in a `deadline_extensions` table with: student_id, assignment_id, original_deadline, extended_deadline, and purchase_id.
3. THE Teacher SHALL receive a notification when a student activates a deadline extension on their assignment.
4. THE Teacher SHALL be able to override (revoke) a deadline extension, which restores the original deadline and refunds the token to the student's inventory.
5. THE Student SHALL be able to use at most one Deadline Extension token per assignment.
6. IF the assignment's original deadline has already passed, THEN THE Platform SHALL prevent the use of the deadline extension token.

---

#### Requirement 10: AI Tutor Hint Token Pack

**User Story:** As a Student, I want to purchase additional AI Tutor messages beyond my daily limit, so that I can get more help when studying for difficult topics.

##### Acceptance Criteria

1. WHEN a Student purchases an AI Tutor Hint Token Pack, THE Platform SHALL add 5 extra AI Tutor messages to the student's daily allowance for the current calendar day (UTC).
2. THE Platform SHALL track extra message allowances separately from the base daily limit in a `hint_token_usage` record.
3. WHEN the student's base daily AI Tutor messages are exhausted, THE Platform SHALL automatically draw from purchased hint tokens before showing the "daily limit reached" message.
4. Unused hint tokens from a purchased pack SHALL expire at midnight UTC on the day of purchase.
5. THE AI Tutor interface SHALL display the remaining message count including any active hint tokens.

---

### SECTION E: Power-ups

#### Requirement 11: XP Boost Power-up

**User Story:** As a Student, I want to activate a 2x XP boost for a limited time, so that I can maximize XP earnings during focused study sessions.

##### Acceptance Criteria

1. WHEN a Student activates a 2x XP Boost Power_Up, THE Platform SHALL apply a 2.0 multiplier to all XP earned by that student for 1 hour from activation time.
2. THE XP Boost multiplier SHALL stack with active admin-created Bonus XP Events (e.g., if a 2x admin event is active and the student has a 2x personal boost, the effective multiplier is 4x).
3. THE `award-xp` Edge Function SHALL check for active student-level XP Boost records before calculating the final XP amount.
4. THE Platform SHALL store active XP Boosts in a `student_active_boosts` table with: student_id, boost_type, multiplier, activated_at, expires_at.
5. THE student dashboard SHALL display an active boost indicator with a countdown timer showing remaining duration.
6. WHEN the boost expires, THE Platform SHALL stop applying the multiplier to subsequent XP awards without requiring manual deactivation.
7. THE Student SHALL be able to activate at most one XP Boost at a time; attempting to activate a second SHALL display a message indicating an active boost already exists.

---

#### Requirement 12: Streak Shield Upgrade

**User Story:** As a Student, I want to purchase a streak shield upgrade, so that I get enhanced streak protection beyond the basic streak freeze.

##### Acceptance Criteria

1. WHEN a Student purchases a Streak Shield Upgrade, THE Platform SHALL increase the student's `streak_freezes_available` by 1 in the `student_gamification` table (up to a maximum of 3 total).
2. THE Streak Shield Upgrade SHALL function identically to the existing streak freeze mechanic — it protects one missed calendar day from resetting the streak.
3. IF the student already has 3 streak freezes available, THEN THE Purchase_Processor SHALL reject the purchase and display a message indicating the maximum inventory has been reached.
4. THE student's streak display SHALL show the current number of streak freezes available (including those obtained via marketplace purchase and the existing 200 XP direct purchase).

---

### SECTION F: Admin Marketplace Management

#### Requirement 13: Item Configuration

**User Story:** As an Admin, I want to configure marketplace items for my institution, so that I can control what students can purchase and at what price.

##### Acceptance Criteria

1. THE Admin_Marketplace_Panel SHALL display all Marketplace_Items for the institution with columns: name, category, XP price, level requirement, stock type, active status, and total purchases.
2. THE Admin SHALL be able to create new Marketplace_Items by specifying: name, description, category (cosmetic, educational_perk, power_up), XP price, level requirement (0 for no gate), stock type (unlimited, limited with quantity, one_per_student), and an icon identifier.
3. THE Admin SHALL be able to edit existing Marketplace_Items — changes to price or level requirement SHALL apply only to future purchases and SHALL NOT affect existing XP_Purchase records.
4. THE Admin SHALL be able to deactivate a Marketplace_Item, which removes the item from the student-facing Marketplace but preserves existing purchases in student inventories.
5. THE Admin SHALL be able to reactivate a previously deactivated Marketplace_Item.
6. THE Admin_Marketplace_Panel SHALL provide a set of default Marketplace_Items (predefined themes, frames, titles, perks, power-ups) that the Admin can enable and customize prices for, reducing initial setup effort.

---

#### Requirement 14: Sale Events Management

**User Story:** As an Admin, I want to run limited-time sales on marketplace items, so that I can create engagement events and incentivize XP spending.

##### Acceptance Criteria

1. THE Admin SHALL be able to create a Sale_Event by specifying: target Marketplace_Item(s), discount percentage (5–90%), start date, and end date.
2. WHEN a Sale_Event is active, THE Marketplace SHALL display the discounted price for all affected items.
3. THE Admin SHALL be able to edit or cancel an active Sale_Event; cancellation SHALL immediately restore original prices.
4. THE Admin_Marketplace_Panel SHALL display all Sale_Events (active, scheduled, expired) with their status and affected items.
5. WHEN multiple Sale_Events apply to the same Marketplace_Item at the same time, THE Platform SHALL apply only the highest discount percentage (not stack discounts).
6. THE Admin SHALL be able to schedule Sale_Events in advance with future start dates.

---

#### Requirement 15: Marketplace Analytics

**User Story:** As an Admin, I want to see analytics on marketplace usage, so that I can understand the virtual economy health and make informed pricing decisions.

##### Acceptance Criteria

1. THE Marketplace_Analytics dashboard SHALL display: total XP spent across all students, total purchases count, unique buyers count, and average XP spent per student.
2. THE Marketplace_Analytics dashboard SHALL display a "Most Popular Items" ranking showing the top 10 items by purchase count.
3. THE Marketplace_Analytics dashboard SHALL display an "XP Circulation" chart showing XP earned versus XP spent over time (weekly or monthly granularity).
4. THE Marketplace_Analytics dashboard SHALL display per-category breakdown: total purchases and total XP spent per category (cosmetic, educational_perk, power_up).
5. THE Marketplace_Analytics dashboard SHALL display a "Sale Event Performance" section showing purchase volume during active sales compared to baseline.

---

### SECTION G: Data Model and Security

#### Requirement 16: Marketplace Data Model

**User Story:** As the system, I want a well-structured data model for the marketplace, so that items, purchases, and equipped cosmetics are stored efficiently with proper access control.

##### Acceptance Criteria

1. THE Platform SHALL create a `marketplace_items` table with columns: `id` (uuid PK), `institution_id` (FK), `name` (text), `description` (text), `category` (enum: cosmetic, educational_perk, power_up), `sub_category` (text, e.g., "profile_theme", "avatar_frame", "display_title", "extra_quiz_attempt", "deadline_extension", "hint_token", "xp_boost", "streak_shield"), `xp_price` (integer, > 0), `level_requirement` (integer, default 0), `stock_type` (enum: unlimited, limited, one_per_student), `stock_quantity` (integer, nullable), `icon_identifier` (text), `metadata` (jsonb, for theme colors, frame SVG references, etc.), `is_active` (boolean, default true), `created_at` (timestamptz), `updated_at` (timestamptz).
2. THE Platform SHALL create an `xp_purchases` table with columns: `id` (uuid PK), `student_id` (FK to profiles), `item_id` (FK to marketplace_items), `xp_cost` (integer), `status` (enum: active, consumed, expired, refunded), `purchased_at` (timestamptz), `consumed_at` (timestamptz, nullable), `metadata` (jsonb, for perk-specific data like assignment_id for deadline extensions).
3. THE Platform SHALL create a `student_equipped_items` table with columns: `id` (uuid PK), `student_id` (FK), `purchase_id` (FK to xp_purchases), `slot` (enum: profile_theme, avatar_frame, display_title), `equipped_at` (timestamptz), with a unique constraint on (student_id, slot) to enforce one item per slot.
4. THE Platform SHALL create a `sale_events` table with columns: `id` (uuid PK), `institution_id` (FK), `name` (text), `discount_percentage` (integer, 5–90), `start_date` (timestamptz), `end_date` (timestamptz), `created_by` (FK to profiles), `created_at` (timestamptz).
5. THE Platform SHALL create a `sale_event_items` junction table with columns: `sale_event_id` (FK), `item_id` (FK to marketplace_items), with a composite PK.
6. THE Platform SHALL create a `student_active_boosts` table with columns: `id` (uuid PK), `student_id` (FK), `boost_type` (text), `multiplier` (numeric), `purchase_id` (FK to xp_purchases), `activated_at` (timestamptz), `expires_at` (timestamptz).
7. THE Platform SHALL create a `deadline_extensions` table with columns: `id` (uuid PK), `student_id` (FK), `assignment_id` (FK), `purchase_id` (FK to xp_purchases), `original_deadline` (timestamptz), `extended_deadline` (timestamptz), `revoked` (boolean, default false), `revoked_by` (FK, nullable), `created_at` (timestamptz).
8. THE `xp_purchases` table SHALL be append-only for inserts — status updates (consumed, expired, refunded) are permitted but deletion is prohibited.

---

#### Requirement 17: Row-Level Security Policies

**User Story:** As the system, I want RLS policies on all marketplace tables, so that data access is properly scoped by role and institution.

##### Acceptance Criteria

1. RLS policies on `marketplace_items` SHALL ensure: Students can SELECT active items within their institution; Admins can perform all CRUD operations within their institution; Teachers can SELECT items within their institution.
2. RLS policies on `xp_purchases` SHALL ensure: Students can SELECT their own purchases; Students can INSERT purchases for themselves (validated by the Purchase_Processor); Admins can SELECT all purchases within their institution; no role can DELETE purchases.
3. RLS policies on `student_equipped_items` SHALL ensure: Students can SELECT, INSERT, UPDATE, and DELETE their own equipped items; other students cannot see equipped items directly (equipped cosmetics are resolved at render time via joins).
4. RLS policies on `sale_events` and `sale_event_items` SHALL ensure: Students can SELECT active and scheduled sale events within their institution; Admins can perform all CRUD operations within their institution.
5. RLS policies on `student_active_boosts` SHALL ensure: Students can SELECT their own active boosts; the `award-xp` Edge Function accesses boosts via service role key.
6. RLS policies on `deadline_extensions` SHALL ensure: Students can SELECT their own extensions; Teachers can SELECT extensions for assignments in their courses; Admins can SELECT all extensions within their institution.
7. THE Parent role SHALL be able to SELECT `xp_purchases` for linked students (via `parent_student_links` where `verified = true`).

---

### SECTION H: Integration with Existing Systems

#### Requirement 18: Award-XP Edge Function Integration

**User Story:** As the system, I want the award-xp Edge Function to account for student-level XP boosts, so that purchased XP Boost power-ups are applied correctly.

##### Acceptance Criteria

1. WHEN the `award-xp` Edge Function processes an XP award, THE function SHALL query `student_active_boosts` for any active boost where `expires_at > NOW()` for the target student.
2. WHEN an active student boost exists, THE `award-xp` Edge Function SHALL multiply the base XP by the boost multiplier before applying any admin-level Bonus XP Event multiplier.
3. THE final XP amount SHALL be calculated as: `floor(base_xp × student_boost_multiplier × admin_event_multiplier)`.
4. THE `xp_transactions` record SHALL include a `boost_applied` flag or metadata field indicating whether a student boost was active at the time of the award.

---

#### Requirement 19: Leaderboard Cosmetic Rendering

**User Story:** As a Student, I want to see equipped cosmetics (frames, titles) on the leaderboard, so that the marketplace items have visible social value.

##### Acceptance Criteria

1. WHEN the leaderboard renders a student entry, THE Platform SHALL join with `student_equipped_items` to resolve the student's equipped Avatar_Frame and Display_Title.
2. WHEN a student has an equipped Avatar_Frame, THE leaderboard SHALL render the frame border around the student's profile picture.
3. WHEN a student has an equipped Display_Title, THE leaderboard SHALL render the title text below the student's name.
4. WHEN a student has opted into anonymous leaderboard mode, THE Platform SHALL hide all cosmetic items for that student on the leaderboard (display default styling).
5. THE leaderboard query SHALL fetch equipped cosmetics in a single query (via join) to avoid N+1 performance issues.

---

#### Requirement 20: Streak Freeze Migration

**User Story:** As the system, I want the existing streak freeze purchase (200 XP) to be migrated into the marketplace, so that all XP spending flows through a unified system.

##### Acceptance Criteria

1. THE Platform SHALL represent the existing streak freeze as a Marketplace_Item with category "power_up", sub_category "streak_shield", XP price 200, stock_type "unlimited", and level_requirement 0.
2. THE existing streak freeze purchase flow SHALL be replaced by the marketplace Purchase_Processor flow, maintaining the same 200 XP cost and the same effect (incrementing `streak_freezes_available`).
3. THE migration SHALL preserve existing `streak_freezes_available` counts in `student_gamification` — no student loses previously purchased freezes.
4. AFTER migration, THE Platform SHALL record all streak freeze purchases as XP_Purchase records in the `xp_purchases` table for unified transaction history.

---

### SECTION I: Non-Functional Requirements

#### Requirement 21: Performance

**User Story:** As a user, I want the marketplace to load quickly and purchases to process without delay, so that the shopping experience is smooth.

##### Acceptance Criteria

1. THE Marketplace page SHALL load and render all available items within 1 second.
2. THE Purchase_Processor SHALL complete a purchase transaction (validation + insert + response) within 2 seconds.
3. THE Virtual_Wallet balance computation SHALL complete within 500ms.
4. THE transaction history page SHALL load the first page of 20 entries within 1 second.
5. THE leaderboard query with cosmetic joins SHALL complete within the existing leaderboard performance budget (under 1 second).

---

#### Requirement 22: Atomicity and Consistency

**User Story:** As the system, I want marketplace purchases to be atomic, so that no XP is deducted without the item being granted and no item is granted without XP being deducted.

##### Acceptance Criteria

1. THE Purchase_Processor SHALL execute the balance check and XP_Purchase insert within a single database transaction to prevent race conditions (e.g., double-spending from concurrent purchase requests).
2. IF any step in the purchase transaction fails, THEN THE Purchase_Processor SHALL roll back the entire transaction and return a descriptive error.
3. THE Platform SHALL use a database-level check constraint or trigger to prevent XP_Balance from going negative (enforced at the database layer, not only in application code).
4. WHEN a Sale_Event expires during a purchase flow, THE Purchase_Processor SHALL re-validate the price within the transaction before committing.

---

#### Requirement 23: Audit and Compliance

**User Story:** As an Admin, I want all marketplace transactions logged for audit purposes, so that I can investigate disputes and track the virtual economy.

##### Acceptance Criteria

1. THE Platform SHALL log all marketplace admin actions (item creation, price changes, item deactivation, sale event creation/cancellation) to the existing `audit_logs` table.
2. THE `xp_purchases` table SHALL serve as the immutable purchase ledger — insert-only for new purchases, with status field updates permitted for lifecycle transitions (active → consumed, active → refunded).
3. WHEN a Teacher revokes a deadline extension, THE Platform SHALL insert a refund record in `xp_purchases` with status "refunded" and restore the token to the student's inventory.
4. THE Admin SHALL be able to export purchase history as CSV for compliance reporting.


---

### SECTION J: Creative Expression & Unpredictability (Octalysis Core Drives 3, 6, 7)

#### Requirement 24: Student-Created Content

**User Story:** As a Student, I want to create and share learning content (study plans, peer quiz questions, CLO explanation videos), so that I can express creativity and earn recognition through "Architect" and "Creator" badges.

##### Acceptance Criteria

1. THE Platform SHALL allow students to create three types of Student_Content: custom study plans (structured text with CLO references), peer quiz questions (multiple-choice with answer key), and CLO explanation videos (uploaded video with CLO tag).
2. WHEN a Student submits a Student_Content item, THE Platform SHALL store the content in a `student_content` table with: student_id, content_type (study_plan, quiz_question, explanation_video), clo_id (optional reference), content_data (jsonb), status (draft, submitted, approved, rejected), and created_at.
3. THE Teacher SHALL review submitted Student_Content and approve or reject each item with optional feedback.
4. WHEN a Student's first Student_Content item is approved, THE Platform SHALL award the "Architect" badge (Bronze tier).
5. WHEN a Student has 5 approved Student_Content items, THE Platform SHALL award the "Creator" badge (Bronze tier).
6. WHEN an approved peer quiz question is used by another student, THE creator SHALL receive 15 XP per unique student who attempts the question.

---

#### Requirement 25: Knowledge Quests

**User Story:** As a Student, I want to participate in time-limited Knowledge Quests, so that I can earn exclusive marketplace items and rare rewards through focused learning challenges.

##### Acceptance Criteria

1. THE Admin SHALL be able to create a Knowledge_Quest by specifying: title, description, target CLO(s), quest type (quiz challenge, content creation, peer review), start_date, end_date, and reward (exclusive Marketplace_Item or bonus XP amount).
2. WHEN a Knowledge_Quest is active, THE Marketplace SHALL display a "Quests" tab showing all available quests with countdown timers.
3. WHEN a Student completes a Knowledge_Quest within the time window, THE Platform SHALL award the specified reward and mark the quest as completed for that student.
4. THE Platform SHALL store Knowledge_Quest data in a `knowledge_quests` table with: id, institution_id, title, description, quest_type, target_clo_ids (uuid[]), start_date, end_date, reward_type (item, xp), reward_item_id (nullable FK), reward_xp_amount (nullable), created_by, created_at.
5. THE Platform SHALL store student quest progress in a `student_quest_progress` table with: student_id, quest_id, status (in_progress, completed, expired), started_at, completed_at.
6. WHEN a Knowledge_Quest expires and the student has not completed the quest, THE Platform SHALL mark the student's progress as "expired".
7. THE Knowledge_Quest reward items SHALL be exclusive — available only through quest completion, not through regular marketplace purchase.

---

#### Requirement 26: Surprise XP Mechanics

**User Story:** As a Student, I want to encounter random bonus questions and mystery reward boxes during my learning activities, so that the platform feels exciting and unpredictable.

##### Acceptance Criteria

1. THE Platform SHALL present a Bonus_Question pop-up to a student with a 15% probability upon completing a study session activity (assignment submission, quiz completion, journal entry).
2. WHEN a Bonus_Question is presented, THE Platform SHALL display a single multiple-choice question related to the student's active CLOs, with a 30-second timer.
3. WHEN a Student answers a Bonus_Question correctly, THE Platform SHALL award 20 surprise XP with a celebration animation.
4. WHEN a Student answers a Bonus_Question incorrectly or the timer expires, THE Platform SHALL display the correct answer with no XP penalty.
5. THE Platform SHALL replace a standard XP award with a Mystery_Reward_Box with a 10% probability on any XP-earning event.
6. WHEN a Mystery_Reward_Box is awarded, THE Platform SHALL display an unboxing animation revealing one of: 2x the original XP (50% chance), a random cosmetic item (30% chance), or a temporary 30-minute XP boost (20% chance).
7. THE Platform SHALL store Mystery_Reward_Box outcomes in the `xp_transactions` metadata field with `mystery_box: true` and the reward details.
8. THE Admin SHALL be able to configure the Bonus_Question probability (5–30%) and Mystery_Reward_Box probability (5–20%) per institution via `institution_settings`.

---

### SECTION K: XP Economy Health & Inflation Prevention

#### Requirement 27: XP Economist Dashboard

**User Story:** As an Admin, I want to monitor the health of the virtual XP economy, so that I can detect inflation risks and make data-driven pricing decisions.

##### Acceptance Criteria

1. THE XP_Economist_Dashboard SHALL display the current Earn_Spend_Ratio for the institution, calculated as total XP earned (SUM of xp_transactions.xp_amount) divided by total XP spent (SUM of xp_purchases.xp_cost).
2. THE XP_Economist_Dashboard SHALL display XP velocity — the rate of XP circulation measured as total XP transacted (earned + spent) per active student per week.
3. THE XP_Economist_Dashboard SHALL display an inflation indicator: "Healthy" (earn:spend ratio between 2:1 and 4:1), "Inflationary" (ratio > 4:1), or "Deflationary" (ratio < 2:1).
4. WHEN the Earn_Spend_Ratio deviates beyond the target range (default 2:1 to 4:1), THE Platform SHALL send an alert notification to institution admins.
5. THE XP_Economist_Dashboard SHALL display a time-series chart of the Earn_Spend_Ratio over the past 12 weeks.
6. THE XP_Economist_Dashboard SHALL display per-item purchase frequency and revenue (XP collected) to inform pricing decisions.
7. THE Admin SHALL be able to configure the target Earn_Spend_Ratio range via `institution_settings`.

---

#### Requirement 28: Dynamic Pricing

**User Story:** As the system, I want marketplace item prices to adjust automatically based on demand, so that the economy self-balances and popular items do not become trivially cheap.

##### Acceptance Criteria

1. THE Platform SHALL compute a demand score for each Marketplace_Item based on purchase frequency over the trailing 7-day window.
2. WHEN a Marketplace_Item's demand score exceeds the 75th percentile of all items, THE Dynamic_Pricing engine SHALL increase the item's effective price by up to 25% above the admin-set base price.
3. WHEN a Marketplace_Item's demand score falls below the 25th percentile of all items, THE Dynamic_Pricing engine SHALL decrease the item's effective price by up to 20% below the admin-set base price.
4. THE Dynamic_Pricing adjustments SHALL be bounded: the effective price SHALL never exceed 150% of the base price and SHALL never fall below 50% of the base price.
5. THE Admin SHALL be able to enable or disable Dynamic_Pricing per institution via `institution_settings`.
6. WHEN Dynamic_Pricing is active, THE Marketplace SHALL display both the base price and the current dynamic price for each item.
7. THE Dynamic_Pricing engine SHALL recalculate prices daily at midnight UTC via a pg_cron scheduled job.
8. THE `marketplace_items` table SHALL store a `dynamic_price_override` column (integer, nullable) that holds the current dynamically computed price when Dynamic_Pricing is enabled.

---

#### Requirement 29: XP Sinks

**User Story:** As a Student, I want meaningful ways to spend XP beyond standard marketplace items, so that XP retains its value and I feel motivated to keep earning.

##### Acceptance Criteria

1. THE Platform SHALL support Class_Donation as an XP sink: a student donates a configurable XP amount (set by Admin, default 500 XP) to unlock a shared study resource for all students in a course.
2. WHEN a Class_Donation reaches its XP goal, THE Platform SHALL unlock the associated resource and notify all students in the course.
3. THE Platform SHALL support seasonal limited-edition Marketplace_Items that are available only during admin-defined date ranges and cannot be restocked after the season ends.
4. THE Platform SHALL support cosmetic upgrade paths: a student can spend additional XP to upgrade an owned cosmetic from its base version to an enhanced version (e.g., "Golden Laurel" → "Diamond Laurel") with improved visual effects.
5. THE Platform SHALL store Class_Donation records in a `class_donations` table with: id, course_id, student_id, xp_amount, resource_description, goal_amount, current_total, status (active, completed), created_at.
6. THE Platform SHALL display active Class_Donation campaigns on the student marketplace with a progress bar showing current_total / goal_amount.
7. WHEN a student contributes to a Class_Donation, THE Platform SHALL record the contribution as an XP_Purchase with category "donation" and deduct the XP from the student's balance.

---

### SECTION L: Inclusive Leaderboard System

#### Requirement 30: Personal Best Leaderboard

**User Story:** As a Student, I want to compare my current performance against my own past performance, so that I can see my personal growth regardless of how I rank against peers.

##### Acceptance Criteria

1. THE Platform SHALL display a Personal_Best_Leaderboard tab on the leaderboard page showing the student's current-week metrics compared to their previous-week metrics.
2. THE Personal_Best_Leaderboard SHALL track: XP earned this week vs. last week, assignments submitted this week vs. last week, average attainment this week vs. last week, and streak length.
3. WHEN a student's current-week metric exceeds their previous-week metric, THE Platform SHALL display a green upward arrow with the improvement delta.
4. WHEN a student sets a new personal best in any tracked metric, THE Platform SHALL award 10 XP and display a "New Personal Best" celebration animation.
5. THE Personal_Best_Leaderboard SHALL be the default leaderboard view for students who have opted out of the competitive leaderboard.

---

#### Requirement 31: Most Improved Leaderboard

**User Story:** As a Student, I want to see a leaderboard that celebrates improvement, so that students who are growing fastest are recognized alongside top performers.

##### Acceptance Criteria

1. THE Platform SHALL display a "Most Improved" leaderboard tab ranking students by their XP improvement over the past 4 weeks (current 4-week XP minus previous 4-week XP).
2. THE Most_Improved_Leaderboard SHALL display the top 20 students with the highest positive improvement delta.
3. WHEN a student appears on the Most Improved leaderboard for the first time, THE Platform SHALL award the "Rising Star" badge (Bronze tier).
4. THE Most_Improved_Leaderboard SHALL respect the same anonymous opt-out setting as the main leaderboard.

---

#### Requirement 32: Percentile Bands and League Tiers

**User Story:** As a Student, I want to see my approximate ranking as a percentile band and compete within my league tier, so that the leaderboard feels achievable rather than discouraging.

##### Acceptance Criteria

1. WHEN a student is ranked outside the top 10 on the main leaderboard, THE Platform SHALL display the student's position as a Percentile_Band (top 10%, top 25%, top 50%, bottom 50%) instead of an exact numeric rank.
2. THE Platform SHALL assign students to League_Tiers based on cumulative XP: Diamond (top 5%), Gold (top 20%), Silver (top 50%), Bronze (bottom 50%).
3. THE Platform SHALL display a "My League" tab on the leaderboard showing only students within the same League_Tier, with exact rankings visible within the tier.
4. THE League_Tier boundaries SHALL be recalculated weekly at midnight UTC on Sunday via a pg_cron scheduled job.
5. WHEN a student moves up to a higher League_Tier, THE Platform SHALL display a tier promotion animation and award 25 XP.
6. THE Platform SHALL store each student's current League_Tier in the `student_gamification` table as a `league_tier` column (enum: bronze, silver, gold, diamond).

---

### SECTION M: Badge Progression & Anti-Fatigue

#### Requirement 33: Tiered Badge System

**User Story:** As a Student, I want badges to have Bronze, Silver, and Gold tiers with progressively harder conditions, so that each badge feels like a meaningful journey rather than a one-time unlock.

##### Acceptance Criteria

1. THE Platform SHALL support Badge_Tiers (Bronze, Silver, Gold) for each badge definition, where each tier has its own unlock condition and XP reward.
2. WHEN a Student meets the Bronze tier condition for a badge, THE Platform SHALL award the Bronze tier and display the badge with a bronze visual indicator.
3. WHEN a Student meets the Silver tier condition (which requires Bronze to be already earned), THE Platform SHALL upgrade the badge to Silver tier with an upgraded visual indicator and award additional XP.
4. WHEN a Student meets the Gold tier condition (which requires Silver to be already earned), THE Platform SHALL upgrade the badge to Gold tier with a premium visual indicator and award additional XP.
5. THE Platform SHALL store badge tier progress in the existing `student_badges` table by adding a `tier` column (enum: bronze, silver, gold, default bronze).
6. THE badge definitions table SHALL include `tier_conditions` (jsonb) specifying the unlock condition for each tier (e.g., `{"bronze": {"count": 1}, "silver": {"count": 5}, "gold": {"count": 15}}`).
7. THE total number of active (non-archived) badge definitions per institution SHALL be limited to 15 to maintain badge value.

---

#### Requirement 34: Badge Spotlight

**User Story:** As a Student, I want to see a featured badge each week with my progress toward earning it, so that I stay engaged with the badge system and discover badges I might not have noticed.

##### Acceptance Criteria

1. THE Platform SHALL display a Badge_Spotlight card on the student dashboard highlighting one badge per week.
2. THE Badge_Spotlight SHALL rotate weekly, cycling through all non-archived badges that the student has not yet earned at Gold tier.
3. THE Badge_Spotlight card SHALL display: badge name, description, current tier (if any), progress toward the next tier (e.g., "3/5 submissions"), and the XP reward for the next tier.
4. WHEN a Student earns the spotlighted badge during the spotlight week, THE Platform SHALL award a 50% XP bonus on top of the standard badge XP reward.
5. THE Badge_Spotlight rotation SHALL be deterministic per student (based on student_id hash) so that different students see different spotlighted badges in the same week.

---

#### Requirement 35: Badge Archiving

**User Story:** As an Admin, I want to archive older or less relevant badges, so that the active badge collection stays manageable and each badge feels valuable.

##### Acceptance Criteria

1. THE Admin SHALL be able to archive a badge definition, which removes the badge from the active badge collection and the Badge_Spotlight rotation.
2. WHEN a badge is archived, THE Platform SHALL preserve all existing student_badges records — students who earned the badge retain it in their profile history.
3. THE Platform SHALL display archived badges in a separate "Archive" section on the student's badge collection page, visually distinct from active badges.
4. THE Admin SHALL be able to unarchive a badge, restoring it to the active collection and Badge_Spotlight rotation.
5. THE Platform SHALL add an `is_archived` column (boolean, default false) to the badge definitions table.
6. THE Badge_Spotlight and badge check functions SHALL exclude archived badges from consideration.
