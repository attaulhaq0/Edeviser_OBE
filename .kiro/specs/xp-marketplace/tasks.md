# Tasks — XP Marketplace & Virtual Economy

## 1. Database Schema & Migrations

- [ ] 1.1 Create migration: `marketplace_items` table with category/sub_category enums, stock constraints, and indexes
- [ ] 1.2 Create migration: `xp_purchases` table (append-only ledger) with status enum and indexes
- [ ] 1.3 Create migration: `student_equipped_items` table with unique constraint on (student_id, slot)
- [ ] 1.4 Create migration: `sale_events` table with date range constraint and indexes
- [ ] 1.5 Create migration: `sale_event_items` junction table with composite PK
- [ ] 1.6 Create migration: `student_active_boosts` table with duration constraint and indexes
- [ ] 1.7 Create migration: `deadline_extensions` table with unique constraint on (student_id, assignment_id)
- [ ] 1.8 Create migration: `process_marketplace_purchase` PL/pgSQL function (atomic purchase processor)
- [ ] 1.9 Create migration: `get_xp_balance` helper function (returns GREATEST(0, earned - spent))
- [ ] 1.10 Create migration: `get_effective_price` helper function (resolves sale discounts)
- [ ] 1.11 Create migration: RLS policies for all 7 new tables (marketplace_items, xp_purchases, student_equipped_items, sale_events, sale_event_items, student_active_boosts, deadline_extensions)
- [ ] 1.12 Create migration: seed default marketplace items (predefined themes, frames, titles, perks, power-ups)

## 2. Shared Library Code

- [ ] 2.1 Create `src/lib/marketplaceSchemas.ts` — Zod schemas for all marketplace payloads (createItem, updateItem, createSaleEvent, purchaseRequest, deadlineExtension)
- [ ] 2.2 Create `src/lib/xpBalanceCalculator.ts` — Pure function: compute XP balance from transaction and purchase arrays
- [ ] 2.3 Create `src/lib/salePriceCalculator.ts` — Pure function: apply highest active discount to item price
- [ ] 2.4 Create `src/lib/purchaseValidator.ts` — Pure function: validate purchase eligibility (balance, level, stock, ownership, active status)
- [ ] 2.5 Create `src/lib/themeResolver.ts` — Pure function: resolve theme/frame metadata to CSS custom properties
- [ ] 2.6 Add marketplace query keys to `src/lib/queryKeys.ts` (balance, items, inventory, equipped, transactions, boosts, saleEvents, analytics)

## 3. Edge Functions

- [ ] 3.1 Create `supabase/functions/process-purchase/index.ts` — Purchase processor Edge Function
  - [ ] 3.1.1 JWT validation and institution_id extraction
  - [ ] 3.1.2 Call `process_marketplace_purchase` RPC function
  - [ ] 3.1.3 Post-purchase activation: XP boost → insert student_active_boosts (1h expiry)
  - [ ] 3.1.4 Post-purchase activation: streak shield → increment streak_freezes_available (max 3)
  - [ ] 3.1.5 Audit log insertion for purchase event
  - [ ] 3.1.6 Structured error responses with error codes
- [ ] 3.2 Modify `supabase/functions/award-xp/index.ts` — Add student boost multiplier lookup
  - [ ] 3.2.1 Query `student_active_boosts` for active boosts (expires_at > NOW())
  - [ ] 3.2.2 Apply student boost multiplier before admin event multiplier: `floor(base × student_boost × admin_multiplier)`
  - [ ] 3.2.3 Record `boost_applied` metadata in xp_transactions

## 4. TanStack Query Hooks

- [ ] 4.1 Create `src/hooks/useXPBalance.ts` — XP balance query (calls `get_xp_balance` RPC)
- [ ] 4.2 Create `src/hooks/useMarketplace.ts` — Browse items with category filter, sale price joins
- [ ] 4.3 Create `src/hooks/usePurchase.ts` — Purchase mutation (POST to process-purchase Edge Function), invalidates balance + inventory
- [ ] 4.4 Create `src/hooks/useInventory.ts` — Student owned items query (xp_purchases with item joins)
- [ ] 4.5 Create `src/hooks/useEquippedItems.ts` — Equipped items query + equip/unequip mutations (upsert/delete on student_equipped_items)
- [ ] 4.6 Create `src/hooks/useTransactionHistory.ts` — Unified transaction history with pagination and type filter
- [ ] 4.7 Create `src/hooks/useActiveBoosts.ts` — Active boost status query
- [ ] 4.8 Create `src/hooks/useDeadlineExtensions.ts` — Activate extension mutation + teacher revoke mutation
- [ ] 4.9 Create `src/hooks/useMarketplaceAdmin.ts` — Admin CRUD for marketplace items
- [ ] 4.10 Create `src/hooks/useSaleEvents.ts` — Admin sale event CRUD
- [ ] 4.11 Create `src/hooks/useMarketplaceAnalytics.ts` — Admin analytics queries

## 5. Student Marketplace UI

- [ ] 5.1 Create `src/pages/student/marketplace/MarketplacePage.tsx` — Main marketplace with category tabs, XP balance header, item grid
- [ ] 5.2 Create `src/pages/student/marketplace/ItemCard.tsx` — Item card with locked/owned/sale/out-of-stock states
- [ ] 5.3 Create `src/pages/student/marketplace/PurchaseConfirmDialog.tsx` — Confirmation dialog with balance preview
- [ ] 5.4 Create `src/pages/student/marketplace/MyItemsPage.tsx` — Student inventory grouped by category with equip/use actions
- [ ] 5.5 Create `src/pages/student/marketplace/TransactionHistoryPage.tsx` — Unified history with filter tabs and pagination
- [ ] 5.6 Create `src/components/shared/XPBalanceBadge.tsx` — Persistent balance indicator for sidebar and marketplace
- [ ] 5.7 Create `src/components/shared/ActiveBoostIndicator.tsx` — Boost countdown timer with pulse animation
- [ ] 5.8 Create `src/components/shared/SaleBadge.tsx` — Sale discount badge component
- [ ] 5.9 Create `src/components/shared/CosmeticPreview.tsx` — Theme/frame/title preview component

## 6. Cosmetic Rendering Integration

- [ ] 6.1 Create `src/lib/themeResolver.ts` integration — Apply equipped theme CSS vars to student dashboard
- [ ] 6.2 Modify `src/pages/student/leaderboard/LeaderboardPage.tsx` — Join equipped items, render avatar frames and display titles
- [ ] 6.3 Handle anonymous mode in leaderboard — hide cosmetics for opted-out students
- [ ] 6.4 Handle default rendering for students with no equipped cosmetics

## 7. Educational Perks Integration

- [ ] 7.1 Integrate extra quiz attempt token with quiz submission flow — check for active token, allow N+1 attempt
- [ ] 7.2 Integrate deadline extension with `src/lib/submissionDeadline.ts` — check `deadline_extensions` table for student-specific extended deadline
- [ ] 7.3 Integrate hint token with AI Tutor rate limiting — check for active hint tokens before showing "daily limit reached"
- [ ] 7.4 Add teacher notification when student activates deadline extension
- [ ] 7.5 Add teacher view for extra attempt token usage in quiz analytics

## 8. Admin Marketplace Management UI

- [ ] 8.1 Create `src/pages/admin/marketplace/MarketplaceManagementPage.tsx` — Item list with DataTable, CRUD actions
- [ ] 8.2 Create `src/pages/admin/marketplace/ItemForm.tsx` — Create/edit item form with React Hook Form + Zod
- [ ] 8.3 Create `src/pages/admin/marketplace/SaleEventManager.tsx` — Sale events list with status badges
- [ ] 8.4 Create `src/pages/admin/marketplace/SaleEventForm.tsx` — Create/edit sale event with item multi-select
- [ ] 8.5 Create `src/pages/admin/marketplace/MarketplaceAnalyticsPage.tsx` — KPI cards, popular items, XP circulation chart, category breakdown
- [ ] 8.6 Add CSV export for purchase history on admin analytics page

## 9. Routing & Navigation

- [ ] 9.1 Add `/student/marketplace` and `/student/marketplace/my-items` and `/student/marketplace/history` routes to AppRouter
- [ ] 9.2 Add marketplace nav item to StudentLayout sidebar with XPBalanceBadge
- [ ] 9.3 Add `/admin/marketplace`, `/admin/marketplace/sales`, `/admin/marketplace/analytics` routes to AppRouter
- [ ] 9.4 Add marketplace management nav item to AdminLayout sidebar

## 10. Streak Freeze Migration

- [ ] 10.1 Create migration: insert streak freeze as marketplace_item (category: power_up, sub_category: streak_shield, price: 200, stock_type: unlimited)
- [ ] 10.2 Update existing streak freeze purchase UI to route through marketplace Purchase_Processor
- [ ] 10.3 Preserve existing `streak_freezes_available` counts during migration

## 11. Dashboard Integration

- [ ] 11.1 Add XP balance display to student dashboard hero card (alongside existing XP total and level)
- [ ] 11.2 Add ActiveBoostIndicator to student dashboard when boost is active
- [ ] 11.3 Add XPBalanceBadge to student sidebar navigation

## 12. Property-Based Tests

- [ ] 12.1 `src/__tests__/properties/xpBalance.property.test.ts` — P1: balance computation, P2: non-negativity
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
