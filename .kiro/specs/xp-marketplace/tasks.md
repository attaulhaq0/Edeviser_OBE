# Tasks — XP Marketplace & Virtual Economy

## 1. Database Schema & Migrations

- [x] 1.1 Create migration: `marketplace_items` table with category/sub_category enums, stock constraints, and indexes
- [x] 1.2 Create migration: `xp_purchases` table (append-only ledger) with status enum and indexes
- [x] 1.3 Create migration: `student_equipped_items` table with unique constraint on (student_id, slot)
- [x] 1.4 Create migration: `sale_events` table with date range constraint and indexes
- [x] 1.5 Create migration: `sale_event_items` junction table with composite PK
- [x] 1.6 Create migration: `student_active_boosts` table with duration constraint and indexes
- [x] 1.7 Create migration: `deadline_extensions` table with unique constraint on (student_id, assignment_id)
- [x] 1.8 Create migration: `process_marketplace_purchase` PL/pgSQL function (atomic purchase processor)
- [x] 1.9 Create migration: `get_xp_balance` helper function (returns GREATEST(0, earned - spent))
- [x] 1.10 Create migration: `get_effective_price` helper function (resolves sale discounts)
- [x] 1.11 Create migration: RLS policies for all 7 new tables (marketplace_items, xp_purchases, student_equipped_items, sale_events, sale_event_items, student_active_boosts, deadline_extensions)
- [x] 1.12 Create migration: seed default marketplace items (predefined themes, frames, titles, perks, power-ups)

## 2. Shared Library Code

- [x] 2.1 Create `src/lib/marketplaceSchemas.ts` — Zod schemas for all marketplace payloads (createItem, updateItem, createSaleEvent, purchaseRequest, deadlineExtension)
- [x] 2.2 Create `src/lib/xpBalanceCalculator.ts` — Pure function: compute XP balance from transaction and purchase arrays
- [x] 2.3 Create `src/lib/salePriceCalculator.ts` — Pure function: apply highest active discount to item price
- [x] 2.4 Create `src/lib/purchaseValidator.ts` — Pure function: validate purchase eligibility (balance, level, stock, ownership, active status)
- [x] 2.5 Create `src/lib/themeResolver.ts` — Pure function: resolve theme/frame metadata to CSS custom properties
- [x] 2.6 Add marketplace query keys to `src/lib/queryKeys.ts` (balance, items, inventory, equipped, transactions, boosts, saleEvents, analytics)

## 3. Edge Functions

- [x] 3.1 Create `supabase/functions/process-purchase/index.ts` — Purchase processor Edge Function
  - [x] 3.1.1 JWT validation and institution_id extraction
  - [x] 3.1.2 Call `process_marketplace_purchase` RPC function
  - [x] 3.1.3 Post-purchase activation: XP boost → insert student_active_boosts (1h expiry)
  - [x] 3.1.4 Post-purchase activation: streak shield → increment streak_freezes_available (max 3)
  - [x] 3.1.5 Audit log insertion for purchase event
  - [x] 3.1.6 Structured error responses with error codes
- [x] 3.2 Modify `supabase/functions/award-xp/index.ts` — Add student boost multiplier lookup
  - [x] 3.2.1 Query `student_active_boosts` for active boosts (expires_at > NOW())
  - [x] 3.2.2 Apply student boost multiplier before admin event multiplier: `floor(base × student_boost × admin_multiplier)`
  - [x] 3.2.3 Record `boost_applied` metadata in xp_transactions

## 4. TanStack Query Hooks

- [x] 4.1 Create `src/hooks/useXPBalance.ts` — XP balance query (calls `get_xp_balance` RPC)
- [x] 4.2 Create `src/hooks/useMarketplace.ts` — Browse items with category filter, sale price joins
- [x] 4.3 Create `src/hooks/usePurchase.ts` — Purchase mutation (POST to process-purchase Edge Function), invalidates balance + inventory
- [x] 4.4 Create `src/hooks/useInventory.ts` — Student owned items query (xp_purchases with item joins)
- [x] 4.5 Create `src/hooks/useEquippedItems.ts` — Equipped items query + equip/unequip mutations (upsert/delete on student_equipped_items)
- [x] 4.6 Create `src/hooks/useTransactionHistory.ts` — Unified transaction history with pagination and type filter
- [x] 4.7 Create `src/hooks/useActiveBoosts.ts` — Active boost status query
- [x] 4.8 Create `src/hooks/useDeadlineExtensions.ts` — Activate extension mutation + teacher revoke mutation
- [x] 4.9 Create `src/hooks/useMarketplaceAdmin.ts` — Admin CRUD for marketplace items
- [x] 4.10 Create `src/hooks/useSaleEvents.ts` — Admin sale event CRUD
- [x] 4.11 Create `src/hooks/useMarketplaceAnalytics.ts` — Admin analytics queries

## 5. Student Marketplace UI

- [x] 5.1 Create `src/pages/student/marketplace/MarketplacePage.tsx` — Main marketplace with category tabs, XP balance header, item grid
- [x] 5.2 Create `src/pages/student/marketplace/ItemCard.tsx` — Item card with locked/owned/sale/out-of-stock states
- [x] 5.3 Create `src/pages/student/marketplace/PurchaseConfirmDialog.tsx` — Confirmation dialog with balance preview
- [x] 5.4 Create `src/pages/student/marketplace/MyItemsPage.tsx` — Student inventory grouped by category with equip/use actions
- [x] 5.5 Create `src/pages/student/marketplace/TransactionHistoryPage.tsx` — Unified history with filter tabs and pagination
- [x] 5.6 Create `src/components/shared/XPBalanceBadge.tsx` — Persistent balance indicator for sidebar and marketplace
- [x] 5.7 Create `src/components/shared/ActiveBoostIndicator.tsx` — Boost countdown timer with pulse animation
- [x] 5.8 Create `src/components/shared/SaleBadge.tsx` — Sale discount badge component
- [x] 5.9 Create `src/components/shared/CosmeticPreview.tsx` — Theme/frame/title preview component

## 6. Cosmetic Rendering Integration

- [x] 6.1 Create `src/lib/themeResolver.ts` integration — Apply equipped theme CSS vars to student dashboard
- [x] 6.2 Modify `src/pages/student/leaderboard/LeaderboardPage.tsx` — Join equipped items, render avatar frames and display titles
- [x] 6.3 Handle anonymous mode in leaderboard — hide cosmetics for opted-out students
- [x] 6.4 Handle default rendering for students with no equipped cosmetics

## 7. Educational Perks Integration

- [x] 7.1 Integrate extra quiz attempt token with quiz submission flow — check for active token, allow N+1 attempt
- [x] 7.2 Integrate deadline extension with `src/lib/submissionDeadline.ts` — check `deadline_extensions` table for student-specific extended deadline
- [x] 7.3 Integrate hint token with AI Tutor rate limiting — check for active hint tokens before showing "daily limit reached"
- [x] 7.4 Add teacher notification when student activates deadline extension
- [x] 7.5 Add teacher view for extra attempt token usage in quiz analytics

## 8. Admin Marketplace Management UI

- [x] 8.1 Create `src/pages/admin/marketplace/MarketplaceManagementPage.tsx` — Item list with DataTable, CRUD actions
- [x] 8.2 Create `src/pages/admin/marketplace/ItemForm.tsx` — Create/edit item form with React Hook Form + Zod
- [x] 8.3 Create `src/pages/admin/marketplace/SaleEventManager.tsx` — Sale events list with status badges
- [x] 8.4 Create `src/pages/admin/marketplace/SaleEventForm.tsx` — Create/edit sale event with item multi-select
- [x] 8.5 Create `src/pages/admin/marketplace/MarketplaceAnalyticsPage.tsx` — KPI cards, popular items, XP circulation chart, category breakdown
- [x] 8.6 Add CSV export for purchase history on admin analytics page

## 9. Routing & Navigation

- [x] 9.1 Add `/student/marketplace` and `/student/marketplace/my-items` and `/student/marketplace/history` routes to AppRouter
- [x] 9.2 Add marketplace nav item to StudentLayout sidebar with XPBalanceBadge
- [x] 9.3 Add `/admin/marketplace`, `/admin/marketplace/sales`, `/admin/marketplace/analytics` routes to AppRouter
- [x] 9.4 Add marketplace management nav item to AdminLayout sidebar

## 10. Streak Freeze Migration

- [x] 10.1 Create migration: insert streak freeze as marketplace_item (category: power_up, sub_category: streak_shield, price: 200, stock_type: unlimited)
- [x] 10.2 Update existing streak freeze purchase UI to route through marketplace Purchase_Processor
- [x] 10.3 Preserve existing `streak_freezes_available` counts during migration

## 11. Dashboard Integration

- [x] 11.1 Add XP balance display to student dashboard hero card (alongside existing XP total and level)
- [x] 11.2 Add ActiveBoostIndicator to student dashboard when boost is active
- [x] 11.3 Add XPBalanceBadge to student sidebar navigation

## 12. Property-Based Tests

- [x] 12.1 `src/__tests__/properties/xpBalance.property.test.ts` — P1: balance computation, P2: non-negativity
- [ ] 12.2 `src/__tests__/properties/transactionHistory.property.test.ts` — P3: ordering, P4: required fields, P5: filtering
- [ ] 12.3 `src/__tests__/properties/purchaseValidator.property.test.ts` — P6: purchase validation correctness
- [ ] 12.4 `src/__tests__/properties/salePriceCalculator.property.test.ts` — P7: sale price resolution, highest discount wins
- [ ] 12.5 `src/__tests__/properties/cosmeticResolver.property.test.ts` — P8: CSS resolution, P9: equip/unequip round-trip, P10: one per slot
- [ ] 12.6 `src/__tests__/properties/leaderboardCosmetics.property.test.ts` — P11: anonymous mode hides cosmetics, P12: extra quiz attempt
- [ ] 12.7 `src/__tests__/properties/deadlineExtension.property.test.ts` — P13: 24h extension, P14: revocation restores original, P15: one per assignment
- [ ] 12.8 `src/__tests__/properties/hintTokens.property.test.ts` — P16: allowance computation, P17: midnight UTC expiry
- [ ] 12.9 `src/__tests__/properties/xpMultiplier.property.test.ts` — P18: stacking formula
- [ ] 12.10 `src/__tests__/properties/boostAndStreak.property.test.ts` — P19: one active boost, P20: streak shield cap
- [ ] 12.11 `src/__tests__/properties/marketplaceAdmin.property.test.ts` — P21: price change immutability, P22: discount validation, P23: analytics aggregation
- [ ] 12.12 `src/__tests__/properties/inventoryStatus.property.test.ts` — P24: status resolution, P25: display fields

## 13. Unit Tests

- [ ] 13.1 `src/__tests__/unit/marketplaceSchemas.test.ts` — Zod schema validation for all marketplace schemas
- [ ] 13.2 `src/__tests__/unit/purchaseConfirmDialog.test.tsx` — Confirmation dialog rendering and error states
- [ ] 13.3 `src/__tests__/unit/itemCard.test.tsx` — Item card: locked, owned, sale, out-of-stock states
- [ ] 13.4 `src/__tests__/unit/xpBalanceBadge.test.tsx` — Balance badge rendering, zero balance, loading
- [ ] 13.5 `src/__tests__/unit/activeBoostIndicator.test.tsx` — Countdown timer, expired state
- [ ] 13.6 `src/__tests__/unit/marketplaceAdmin.test.tsx` — Admin CRUD form validation, item list
- [ ] 13.7 `src/__tests__/unit/saleEventForm.test.tsx` — Sale event form validation, date range
- [ ] 13.8 `src/__tests__/unit/processPurchase.test.ts` — Edge Function: success path, each error code
- [ ] 13.9 `src/__tests__/unit/awardXpBoost.test.ts` — Modified award-xp: boost lookup, multiplier, metadata

## 14. Database Schema — Creative Expression & Unpredictability (Gap 1)

- [ ] 14.1 Create migration: `student_content` table with content_type enum, status enum, reviewer fields, and indexes
- [ ] 14.2 Create migration: `knowledge_quests` table with quest_type enum, reward fields, date range constraint, and indexes
- [ ] 14.3 Create migration: `student_quest_progress` table with unique constraint on (student_id, quest_id)
- [ ] 14.4 Create migration: RLS policies for `student_content`, `knowledge_quests`, `student_quest_progress`
- [ ] 14.5 Add Zod schemas to `src/lib/marketplaceSchemas.ts`: `createKnowledgeQuestSchema`, `createStudentContentSchema`, `reviewStudentContentSchema`

## 15. Database Schema — XP Economy Health (Gap 2)

- [ ] 15.1 Create migration: add `dynamic_price_override` column to `marketplace_items`
- [ ] 15.2 Create migration: `class_donations` table with goal tracking and status
- [ ] 15.3 Create migration: `class_donation_contributions` table with FK to donations and xp_purchases
- [ ] 15.4 Create migration: `get_earn_spend_ratio` PL/pgSQL function
- [ ] 15.5 Create migration: `recalculate_dynamic_prices` PL/pgSQL function
- [ ] 15.6 Create migration: pg_cron job for daily dynamic price recalculation at midnight UTC
- [ ] 15.7 Create migration: RLS policies for `class_donations`, `class_donation_contributions`
- [ ] 15.8 Add Zod schemas to `src/lib/marketplaceSchemas.ts`: `classDonationSchema`, `classDonationContributionSchema`, `bonusQuestionProbabilitySchema`, `mysteryBoxProbabilitySchema`

## 16. Database Schema — Inclusive Leaderboard (Gap 3)

- [ ] 16.1 Create migration: add `league_tier` column (enum: bronze, silver, gold, diamond) to `student_gamification`
- [ ] 16.2 Create migration: `recalculate_league_tiers` PL/pgSQL function
- [ ] 16.3 Create migration: pg_cron job for weekly league tier recalculation (Sunday midnight UTC)

## 17. Database Schema — Badge Progression (Gap 4)

- [ ] 17.1 Create migration: add `tier` column (enum: bronze, silver, gold) to `student_badges`
- [ ] 17.2 Create migration: add `tier_conditions` (jsonb) and `is_archived` (boolean) columns to `badge_definitions`
- [ ] 17.3 Create migration: `get_badge_spotlight` PL/pgSQL function (deterministic rotation)

## 18. Shared Library Code — Gap Analysis Features

- [x] 18.1 Create `src/lib/dynamicPricingCalculator.ts` — Pure function: compute dynamic price from demand score and base price with bounds (50%–150%)
- [x] 18.2 Create `src/lib/earnSpendRatioCalculator.ts` — Pure function: compute earn/spend ratio and inflation status (healthy/inflationary/deflationary)
- [x] 18.3 Create `src/lib/leagueTierCalculator.ts` — Pure function: assign league tiers from XP percentiles (Diamond top 5%, Gold top 20%, Silver top 50%, Bronze bottom 50%)
- [x] 18.4 Create `src/lib/badgeSpotlightResolver.ts` — Pure function: deterministic badge rotation from student_id hash + week number
- [x] 18.5 Create `src/lib/mysteryRewardResolver.ts` — Pure function: resolve mystery box outcome from probability weights (50% 2x XP, 30% cosmetic, 20% boost)
- [x] 18.6 Add new query keys to `src/lib/queryKeys.ts` (economist, quests, studentContent, donations, personalBest, mostImproved, leagues, spotlight, dynamicPricing)

## 19. Edge Functions — Gap Analysis Features

- [x] 19.1 Create `supabase/functions/resolve-mystery-reward/index.ts` — Mystery reward box resolution
  - [x] 19.1.1 Probability-weighted outcome selection
  - [x] 19.1.2 Cosmetic item grant for cosmetic outcomes
  - [x] 19.1.3 Temporary boost activation for boost outcomes
  - [x] 19.1.4 XP multiplier application for 2x XP outcomes
- [x] 19.2 Create `supabase/functions/check-bonus-question/index.ts` — Bonus question trigger and validation
  - [x] 19.2.1 Probability check (configurable 5–30%)
  - [x] 19.2.2 CLO-relevant question selection
  - [x] 19.2.3 Answer validation and surprise XP award
- [x] 19.3 Modify `supabase/functions/award-xp/index.ts` — Add mystery reward box probability check (10% default, configurable 5–20%)

## 20. TanStack Query Hooks — Gap Analysis Features

- [x] 20.1 Create `src/hooks/useXPEconomist.ts` — Earn/spend ratio, XP velocity, inflation indicator, time-series queries
- [x] 20.2 Create `src/hooks/useKnowledgeQuests.ts` — Quest browsing, progress tracking, start/complete mutations
- [x] 20.3 Create `src/hooks/useKnowledgeQuestAdmin.ts` — Admin quest CRUD mutations
- [x] 20.4 Create `src/hooks/useBonusQuestion.ts` — Bonus question trigger and answer submission mutations
- [x] 20.5 Create `src/hooks/useMysteryRewardBox.ts` — Mystery box state and reveal mutation
- [x] 20.6 Create `src/hooks/useStudentContent.ts` — Student content creation, listing, teacher review mutations
- [x] 20.7 Create `src/hooks/useClassDonations.ts` — Donation campaigns, contribution mutation
- [x] 20.8 Create `src/hooks/usePersonalBest.ts` — Personal best leaderboard data (current vs previous week)
- [x] 20.9 Create `src/hooks/useMostImproved.ts` — Most improved leaderboard data (4-week delta)
- [x] 20.10 Create `src/hooks/useLeagueTiers.ts` — League tier query, league-scoped leaderboard
- [x] 20.11 Create `src/hooks/useBadgeSpotlight.ts` — Weekly badge spotlight query
- [x] 20.12 Create `src/hooks/useDynamicPricing.ts` — Dynamic price display, admin toggle mutation

## 21. UI — Creative Expression & Unpredictability (Gap 1)

- [x] 21.1 Create `src/pages/student/marketplace/KnowledgeQuestsTab.tsx` — Quest listing with countdown timers and progress
- [x] 21.2 Create `src/pages/student/content/StudentContentPage.tsx` — Student content creation and listing
- [x] 21.3 Create `src/pages/student/content/ContentForm.tsx` — Form for study plans, quiz questions, explanation videos
- [x] 21.4 Create `src/components/shared/BonusQuestionPopup.tsx` — Random bonus question modal with 30s timer
- [x] 21.5 Create `src/components/shared/MysteryRewardBox.tsx` — Unboxing animation with reward reveal
- [x] 21.6 Create `src/pages/admin/marketplace/KnowledgeQuestManager.tsx` — Admin quest CRUD with DataTable
- [x] 21.7 Create `src/pages/teacher/content/ContentReviewPage.tsx` — Teacher review queue for student content
- [x] 21.8 Add `/student/content` and `/admin/marketplace/quests` routes to AppRouter
- [x] 21.9 Add "My Content" nav item to StudentLayout sidebar
- [x] 21.10 Add "Knowledge Quests" nav item to AdminLayout marketplace section

## 22. UI — XP Economy Health (Gap 2)

- [x] 22.1 Create `src/pages/admin/marketplace/XPEconomistDashboard.tsx` — Earn/spend ratio, velocity, inflation indicator, time-series chart
- [x] 22.2 Create `src/components/shared/ClassDonationProgress.tsx` — Donation progress bar with goal display
- [x] 22.3 Add class donation campaigns section to student marketplace page
- [x] 22.4 Add dynamic pricing display (base price + current price) to ItemCard when dynamic pricing is enabled
- [x] 22.5 Add dynamic pricing toggle to admin marketplace settings
- [x] 22.6 Add `/admin/marketplace/economist` route to AppRouter
- [x] 22.7 Add "XP Economist" nav item to AdminLayout marketplace section

## 23. UI — Inclusive Leaderboard (Gap 3)

- [x] 23.1 Create `src/components/shared/PersonalBestCard.tsx` — Metric comparison card with delta arrows
- [x] 23.2 Create `src/components/shared/LeagueTierBadge.tsx` — League tier indicator (Bronze/Silver/Gold/Diamond)
- [x] 23.3 Add "Personal Best" tab to LeaderboardPage
- [x] 23.4 Add "Most Improved" tab to LeaderboardPage
- [x] 23.5 Add "My League" tab to LeaderboardPage showing tier-scoped rankings
- [x] 23.6 Modify LeaderboardPage to show percentile bands for students ranked outside top 10
- [x] 23.7 Add league tier promotion animation when student moves up a tier
- [x] 23.8 Set Personal Best as default leaderboard tab for students who opted out of competitive leaderboard

## 24. UI — Badge Progression (Gap 4)

- [x] 24.1 Create `src/components/shared/BadgeTierIndicator.tsx` — Bronze/Silver/Gold visual indicator on badges
- [x] 24.2 Create `src/components/shared/BadgeSpotlightCard.tsx` — Weekly spotlight card with progress bar
- [x] 24.3 Modify BadgeCollection to display tier indicators on all badges
- [x] 24.4 Add "Archive" section to BadgeCollection for archived badges
- [x] 24.5 Add BadgeSpotlightCard to student dashboard
- [x] 24.6 Add badge archive/unarchive actions to admin badge management
- [x] 24.7 Modify badge check Edge Function to support tiered progression (Bronze → Silver → Gold)
- [x] 24.8 Add spotlight bonus XP (50% extra) when earning the spotlighted badge during spotlight week

## 25. Property-Based Tests — Gap Analysis Features

- [x] 25.1 `src/__tests__/properties/dynamicPricing.property.test.ts` — P26: bounded adjustment (50%–150% of base)
- [x] 25.2 `src/__tests__/properties/earnSpendRatio.property.test.ts` — P27: ratio computation and inflation status
- [x] 25.3 `src/__tests__/properties/mysteryReward.property.test.ts` — P28: probability distribution (50/30/20 weights)
- [x] 25.4 `src/__tests__/properties/leagueTiers.property.test.ts` — P29: tier assignment from percentiles, P30: percentile band display
- [x] 25.5 `src/__tests__/properties/badgeTiers.property.test.ts` — P31: monotonic tier progression, P32: spotlight determinism
- [x] 25.6 `src/__tests__/properties/classDonation.property.test.ts` — P33: progress invariant (current_total = SUM contributions)
- [x] 25.7 `src/__tests__/properties/knowledgeQuest.property.test.ts` — P34: quest reward exclusivity
- [x] 25.8 `src/__tests__/properties/bonusQuestion.property.test.ts` — P35: probability bounds (5–30%)
- [x] 25.9 `src/__tests__/properties/personalBest.property.test.ts` — P36: comparison correctness
- [x] 25.10 `src/__tests__/properties/badgeArchive.property.test.ts` — P37: archived badge exclusion from spotlight

## 26. Unit Tests — Gap Analysis Features

- [x] 26.1 `src/__tests__/unit/xpEconomistDashboard.test.tsx` — Earn/spend ratio display, inflation indicator, time-series chart
- [x] 26.2 `src/__tests__/unit/dynamicPricingCalculator.test.ts` — Dynamic price computation, bounds enforcement
- [x] 26.3 `src/__tests__/unit/bonusQuestionPopup.test.tsx` — Bonus question rendering, timer, answer submission
- [x] 26.4 `src/__tests__/unit/mysteryRewardBox.test.tsx` — Unboxing animation, reward display
- [x] 26.5 `src/__tests__/unit/knowledgeQuestManager.test.tsx` — Quest CRUD form, date validation
- [x] 26.6 `src/__tests__/unit/leagueTierBadge.test.tsx` — Tier badge rendering, promotion animation
- [x] 26.7 `src/__tests__/unit/personalBestCard.test.tsx` — Metric comparison, delta arrows
- [x] 26.8 `src/__tests__/unit/badgeSpotlightCard.test.tsx` — Spotlight rendering, progress display
- [x] 26.9 `src/__tests__/unit/classDonationProgress.test.tsx` — Progress bar, goal completion
- [x] 26.10 `src/__tests__/unit/studentContentForm.test.tsx` — Content creation form, type selection
- [x] 26.11 `src/__tests__/unit/badgeTierIndicator.test.tsx` — Bronze/Silver/Gold visual rendering
