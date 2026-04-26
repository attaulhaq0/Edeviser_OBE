import { describe, it, expect } from 'vitest';
import {
  createMarketplaceItemSchema,
  updateMarketplaceItemSchema,
  createSaleEventSchema,
  purchaseRequestSchema,
  deadlineExtensionSchema,
  createKnowledgeQuestSchema,
  createStudentContentSchema,
  reviewStudentContentSchema,
  classDonationSchema,
  classDonationContributionSchema,
  bonusQuestionProbabilitySchema,
  mysteryBoxProbabilitySchema,
} from '@/lib/marketplaceSchemas';

describe('marketplaceSchemas', () => {
  describe('createMarketplaceItemSchema', () => {
    it('accepts valid item', () => {
      const result = createMarketplaceItemSchema.safeParse({
        name: 'Ocean Blue Theme',
        description: 'A cool blue theme',
        category: 'cosmetic',
        sub_category: 'profile_theme',
        xp_price: 500,
        level_requirement: 5,
        stock_type: 'one_per_student',
        icon_identifier: 'palette',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = createMarketplaceItemSchema.safeParse({
        name: '',
        description: 'desc',
        category: 'cosmetic',
        sub_category: 'profile_theme',
        xp_price: 100,
        stock_type: 'unlimited',
        icon_identifier: 'icon',
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative price', () => {
      const result = createMarketplaceItemSchema.safeParse({
        name: 'Item',
        description: 'desc',
        category: 'cosmetic',
        sub_category: 'profile_theme',
        xp_price: -10,
        stock_type: 'unlimited',
        icon_identifier: 'icon',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid category', () => {
      const result = createMarketplaceItemSchema.safeParse({
        name: 'Item',
        description: 'desc',
        category: 'invalid',
        sub_category: 'profile_theme',
        xp_price: 100,
        stock_type: 'unlimited',
        icon_identifier: 'icon',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid sub_category', () => {
      const result = createMarketplaceItemSchema.safeParse({
        name: 'Item',
        description: 'desc',
        category: 'cosmetic',
        sub_category: 'invalid_sub',
        xp_price: 100,
        stock_type: 'unlimited',
        icon_identifier: 'icon',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateMarketplaceItemSchema', () => {
    it('accepts partial update', () => {
      const result = updateMarketplaceItemSchema.safeParse({ xp_price: 200 });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = updateMarketplaceItemSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('createSaleEventSchema', () => {
    it('accepts valid sale event', () => {
      const result = createSaleEventSchema.safeParse({
        name: 'Weekend Sale',
        discount_percentage: 20,
        start_date: '2026-07-01T00:00:00.000Z',
        end_date: '2026-07-07T00:00:00.000Z',
        item_ids: ['550e8400-e29b-41d4-a716-446655440000'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects discount below 5', () => {
      const result = createSaleEventSchema.safeParse({
        name: 'Sale',
        discount_percentage: 3,
        start_date: '2026-07-01T00:00:00.000Z',
        end_date: '2026-07-07T00:00:00.000Z',
        item_ids: ['550e8400-e29b-41d4-a716-446655440000'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects discount above 90', () => {
      const result = createSaleEventSchema.safeParse({
        name: 'Sale',
        discount_percentage: 95,
        start_date: '2026-07-01T00:00:00.000Z',
        end_date: '2026-07-07T00:00:00.000Z',
        item_ids: ['550e8400-e29b-41d4-a716-446655440000'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects end_date before start_date', () => {
      const result = createSaleEventSchema.safeParse({
        name: 'Sale',
        discount_percentage: 20,
        start_date: '2026-07-07T00:00:00.000Z',
        end_date: '2026-07-01T00:00:00.000Z',
        item_ids: ['550e8400-e29b-41d4-a716-446655440000'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty item_ids', () => {
      const result = createSaleEventSchema.safeParse({
        name: 'Sale',
        discount_percentage: 20,
        start_date: '2026-07-01T00:00:00.000Z',
        end_date: '2026-07-07T00:00:00.000Z',
        item_ids: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('purchaseRequestSchema', () => {
    it('accepts valid UUID', () => {
      const result = purchaseRequestSchema.safeParse({ item_id: '550e8400-e29b-41d4-a716-446655440000' });
      expect(result.success).toBe(true);
    });

    it('rejects non-UUID', () => {
      const result = purchaseRequestSchema.safeParse({ item_id: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('deadlineExtensionSchema', () => {
    it('accepts valid UUIDs', () => {
      const result = deadlineExtensionSchema.safeParse({
        purchase_id: '550e8400-e29b-41d4-a716-446655440000',
        assignment_id: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createKnowledgeQuestSchema', () => {
    it('accepts valid quest with XP reward', () => {
      const result = createKnowledgeQuestSchema.safeParse({
        title: 'Quiz Challenge',
        description: 'Complete 5 quizzes',
        quest_type: 'quiz_challenge',
        start_date: '2026-07-01T00:00:00.000Z',
        end_date: '2026-07-07T00:00:00.000Z',
        reward_type: 'xp',
        reward_xp_amount: 100,
      });
      expect(result.success).toBe(true);
    });

    it('rejects XP reward without amount', () => {
      const result = createKnowledgeQuestSchema.safeParse({
        title: 'Quest',
        description: 'desc',
        quest_type: 'quiz_challenge',
        start_date: '2026-07-01T00:00:00.000Z',
        end_date: '2026-07-07T00:00:00.000Z',
        reward_type: 'xp',
        reward_xp_amount: null,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createStudentContentSchema', () => {
    it('accepts valid content', () => {
      const result = createStudentContentSchema.safeParse({
        content_type: 'study_plan',
        title: 'My Study Plan',
        content_data: { steps: ['step1'] },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('reviewStudentContentSchema', () => {
    it('accepts approval', () => {
      const result = reviewStudentContentSchema.safeParse({
        content_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'approved',
      });
      expect(result.success).toBe(true);
    });

    it('accepts rejection with feedback', () => {
      const result = reviewStudentContentSchema.safeParse({
        content_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'rejected',
        feedback: 'Needs more detail',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('classDonationSchema', () => {
    it('accepts valid donation', () => {
      const result = classDonationSchema.safeParse({
        course_id: '550e8400-e29b-41d4-a716-446655440000',
        resource_description: 'New lab equipment',
        goal_amount: 5000,
      });
      expect(result.success).toBe(true);
    });

    it('rejects goal below 100', () => {
      const result = classDonationSchema.safeParse({
        course_id: '550e8400-e29b-41d4-a716-446655440000',
        resource_description: 'desc',
        goal_amount: 50,
      });
      expect(result.success).toBe(false);
    });

    it('rejects goal above 10000', () => {
      const result = classDonationSchema.safeParse({
        course_id: '550e8400-e29b-41d4-a716-446655440000',
        resource_description: 'desc',
        goal_amount: 20000,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('classDonationContributionSchema', () => {
    it('accepts valid contribution', () => {
      const result = classDonationContributionSchema.safeParse({
        donation_id: '550e8400-e29b-41d4-a716-446655440000',
        xp_amount: 100,
      });
      expect(result.success).toBe(true);
    });

    it('rejects zero amount', () => {
      const result = classDonationContributionSchema.safeParse({
        donation_id: '550e8400-e29b-41d4-a716-446655440000',
        xp_amount: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('bonusQuestionProbabilitySchema', () => {
    it('accepts 5', () => expect(bonusQuestionProbabilitySchema.safeParse(5).success).toBe(true));
    it('accepts 30', () => expect(bonusQuestionProbabilitySchema.safeParse(30).success).toBe(true));
    it('rejects 4', () => expect(bonusQuestionProbabilitySchema.safeParse(4).success).toBe(false));
    it('rejects 31', () => expect(bonusQuestionProbabilitySchema.safeParse(31).success).toBe(false));
  });

  describe('mysteryBoxProbabilitySchema', () => {
    it('accepts 5', () => expect(mysteryBoxProbabilitySchema.safeParse(5).success).toBe(true));
    it('accepts 20', () => expect(mysteryBoxProbabilitySchema.safeParse(20).success).toBe(true));
    it('rejects 4', () => expect(mysteryBoxProbabilitySchema.safeParse(4).success).toBe(false));
    it('rejects 21', () => expect(mysteryBoxProbabilitySchema.safeParse(21).success).toBe(false));
  });
});
