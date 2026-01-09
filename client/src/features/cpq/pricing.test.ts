/**
 * CPQ Pricing Engine Unit Tests
 * 
 * These tests verify the core pricing calculation functions.
 * Run with: npx vitest run client/src/features/cpq/pricing.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePricing,
  calculateTravelCost,
  calculateTierAPricing,
  calculateTotalSqft,
  getAreaSqft,
  isTierAProject,
  calculateMarginPercent,
  passesMarginGate,
  getMarginGateError,
  validateMarginGate,
  getMarginStatus,
  ACRES_TO_SQFT,
  TIER_A_THRESHOLD,
  TIER_A_MARGINS,
  type Area,
  type TravelConfig,
  type PricingResult,
} from './pricing';

describe('CPQ Pricing Engine', () => {
  
  describe('Area Square Footage Calculations', () => {
    
    it('should calculate sqft for standard building area', () => {
      const area: Area = {
        id: '1',
        name: 'Office Building',
        kind: 'standard',
        buildingType: '1',
        squareFeet: '25000',
        lod: '300',
        disciplines: ['architecture'],
      };
      
      expect(getAreaSqft(area)).toBe(25000);
    });
    
    it('should convert acres to sqft for landscape areas', () => {
      const area: Area = {
        id: '1',
        name: 'Campus Grounds',
        kind: 'landscape',
        buildingType: 'landscape_natural',
        squareFeet: '5', // 5 acres
        lod: '300',
        disciplines: ['site'],
      };
      
      expect(getAreaSqft(area)).toBe(5 * ACRES_TO_SQFT); // 217,800 sqft
    });
    
    it('should calculate total sqft across multiple areas', () => {
      const areas: Area[] = [
        {
          id: '1',
          name: 'Building',
          kind: 'standard',
          buildingType: '1',
          squareFeet: '30000',
          lod: '300',
          disciplines: ['architecture'],
        },
        {
          id: '2',
          name: 'Landscape',
          kind: 'landscape',
          buildingType: 'landscape_built',
          squareFeet: '2', // 2 acres
          lod: '200',
          disciplines: ['site'],
        },
      ];
      
      const total = calculateTotalSqft(areas);
      expect(total).toBe(30000 + (2 * ACRES_TO_SQFT)); // 30,000 + 87,120
    });
    
    it('should handle empty or invalid sqft gracefully', () => {
      const area: Area = {
        id: '1',
        name: 'Empty',
        kind: 'standard',
        buildingType: '1',
        squareFeet: '',
        lod: '300',
        disciplines: [],
      };
      
      expect(getAreaSqft(area)).toBe(0);
    });
  });
  
  describe('Tier A Detection', () => {
    
    it('should detect Tier A for projects >= 50k sqft', () => {
      expect(isTierAProject(50000)).toBe(true);
      expect(isTierAProject(60000)).toBe(true);
      expect(isTierAProject(100000)).toBe(true);
    });
    
    it('should not detect Tier A for projects < 50k sqft', () => {
      expect(isTierAProject(49999)).toBe(false);
      expect(isTierAProject(25000)).toBe(false);
      expect(isTierAProject(10000)).toBe(false);
    });
    
    it('should use correct Tier A threshold constant', () => {
      expect(TIER_A_THRESHOLD).toBe(50000);
    });
  });
  
  describe('Travel Cost Calculations', () => {
    
    describe('Brooklyn Tiered Pricing', () => {
      
      it('should calculate Tier A travel (>=50k sqft): $0 base + $4/mile over 20', () => {
        const distance = 30;
        const totalSqft = 60000; // Tier A
        
        const cost = calculateTravelCost(distance, 'BROOKLYN', totalSqft);
        // Tier A: $0 base + (30-20) * $4 = $40
        expect(cost).toBe(40);
      });
      
      it('should calculate Tier B travel (10k-49,999 sqft): $300 base + $4/mile over 20', () => {
        const distance = 35;
        const totalSqft = 25000; // Tier B
        
        const cost = calculateTravelCost(distance, 'BROOKLYN', totalSqft);
        // Tier B: $300 base + (35-20) * $4 = $300 + $60 = $360
        expect(cost).toBe(360);
      });
      
      it('should calculate Tier C travel (<10k sqft): $150 base + $4/mile over 20', () => {
        const distance = 25;
        const totalSqft = 8000; // Tier C
        
        const cost = calculateTravelCost(distance, 'BROOKLYN', totalSqft);
        // Tier C: $150 base + (25-20) * $4 = $150 + $20 = $170
        expect(cost).toBe(170);
      });
      
      it('should not charge mileage for <= 20 miles from Brooklyn', () => {
        const distance = 15;
        const totalSqft = 25000; // Tier B
        
        const cost = calculateTravelCost(distance, 'BROOKLYN', totalSqft);
        // Tier B: $300 base + $0 mileage (under 20 miles)
        expect(cost).toBe(300);
      });
    });
    
    describe('Woodstock Flat Rate Pricing', () => {
      
      it('should calculate flat $3/mile from Woodstock', () => {
        const distance = 80;
        
        const cost = calculateTravelCost(distance, 'WOODSTOCK', 25000);
        // Woodstock: $3/mile * 80 = $240
        expect(cost).toBe(240);
      });
      
      it('should return 0 for 0 distance from Woodstock', () => {
        const cost = calculateTravelCost(0, 'WOODSTOCK', 25000);
        expect(cost).toBe(0);
      });
    });
    
    describe('Custom Travel Cost Override', () => {
      
      it('should use custom cost when provided', () => {
        const cost = calculateTravelCost(50, 'BROOKLYN', 25000, 500);
        expect(cost).toBe(500);
      });
    });
  });
  
  describe('Tier A Pricing Calculations', () => {
    
    it('should calculate Tier A price with scanning + modeling + margin', () => {
      const result = calculateTierAPricing(
        {
          scanningCost: '3500', // Use "3500" preset from TIER_A_SCANNING_COSTS
          modelingCost: 3000,
          margin: '2.5', // 2.5X multiplier from TIER_A_MARGINS
        },
        30 // distance
      );
      
      expect(result).toBeTruthy();
      // Scanning: $3500, Modeling: $3000
      // subtotal = $6500
      // margin = 2.5X multiplier means clientPrice = $6500 * 2.5 = $16,250
      expect(result.scanningCost).toBe(3500);
      expect(result.modelingCost).toBe(3000);
      expect(result.subtotal).toBe(6500);
      expect(result.margin).toBe(2.5);
      expect(result.clientPrice).toBe(16250);
    });
    
    it('should use margin constants from TIER_A_MARGINS', () => {
      // TIER_A_MARGINS uses multiplier keys with label/value objects
      expect(TIER_A_MARGINS['2.352'].value).toBe(2.352);
      expect(TIER_A_MARGINS['2.5'].value).toBe(2.5);
      expect(TIER_A_MARGINS['3.0'].value).toBe(3.0);
    });
  });
  
  describe('Margin Calculations', () => {
    
    const createTestPricing = (totalClientPrice: number, totalUpteamCost: number): PricingResult => ({
      items: [],
      subtotal: totalClientPrice,
      totalClientPrice,
      totalUpteamCost,
      profitMargin: totalClientPrice - totalUpteamCost,
      disciplineTotals: {
        architecture: 0,
        mep: 0,
        structural: 0,
        site: 0,
        travel: 0,
        services: 0,
        risk: 0,
      },
    });
    
    it('should calculate margin percentage correctly from PricingResult', () => {
      // Price: $10,000, Cost: $6,000
      // Margin = (10000 - 6000) / 10000 = 40%
      const pricing = createTestPricing(10000, 6000);
      
      const margin = calculateMarginPercent(pricing);
      expect(margin).toBe(40);
    });
    
    it('should handle zero price gracefully', () => {
      const pricing = createTestPricing(0, 100);
      
      const margin = calculateMarginPercent(pricing);
      expect(margin).toBe(0);
    });
    
    it('should pass margin gate at exactly 40%', () => {
      const pricing = createTestPricing(10000, 6000); // 40% margin
      
      expect(passesMarginGate(pricing)).toBe(true);
    });
    
    it('should fail margin gate below 40%', () => {
      const pricing = createTestPricing(10000, 6100); // 39% margin
      
      expect(passesMarginGate(pricing)).toBe(false);
    });
    
    it('should pass margin gate above 40%', () => {
      const pricing = createTestPricing(10000, 5000); // 50% margin
      
      expect(passesMarginGate(pricing)).toBe(true);
    });
    
    it('should return null from getMarginGateError when passing', () => {
      const pricing = createTestPricing(10000, 5000); // 50% margin
      
      expect(getMarginGateError(pricing)).toBeNull();
    });
    
    it('should return error message from getMarginGateError when failing', () => {
      const pricing = createTestPricing(10000, 6500); // 35% margin
      
      const error = getMarginGateError(pricing);
      expect(error).not.toBeNull();
      expect(typeof error).toBe('string');
    });
    
    it('should get correct status from getMarginStatus', () => {
      const status50 = getMarginStatus(50);
      expect(['healthy', 'excellent']).toContain(status50.status);
      
      const status35 = getMarginStatus(35);
      expect(status35.status).toBe('blocked');
    });
    
    it('should validate margin gate with validateMarginGate', () => {
      expect(validateMarginGate(45)).toBeNull(); // Above floor
      expect(validateMarginGate(35)).not.toBeNull(); // Below floor
    });
  });
  
  describe('Full Pricing Calculation', () => {
    
    it('should calculate complete pricing for standard project', () => {
      const areas: Area[] = [
        {
          id: '1',
          name: 'Office Building',
          kind: 'standard',
          buildingType: '1', // Office
          squareFeet: '25000',
          lod: '300',
          disciplines: ['architecture'],
          scope: 'full',
        },
      ];
      const services = {};
      const travel: TravelConfig = {
        dispatchLocation: 'WOODSTOCK',
        distance: 45,
      };
      const risks: string[] = [];
      const paymentTerms = 'standard';
      
      const result = calculatePricing(areas, services, travel, risks, paymentTerms);
      
      expect(result.totalClientPrice).toBeGreaterThan(0);
      expect(result.totalUpteamCost).toBeGreaterThan(0);
      expect(result.profitMargin).toBeGreaterThanOrEqual(0);
      expect(result.items.length).toBeGreaterThan(0);
    });
    
    it('should include risk premium in Architecture only', () => {
      const areas: Area[] = [
        {
          id: '1',
          name: 'Test',
          kind: 'standard',
          buildingType: '1',
          squareFeet: '10000',
          lod: '200',
          disciplines: ['architecture', 'mep'],
          scope: 'full',
        },
      ];
      const risks = ['occupied']; // +15%
      
      const withRisk = calculatePricing(areas, {}, null, risks, 'standard');
      const withoutRisk = calculatePricing(areas, {}, null, [], 'standard');
      
      // With risk should be higher, but only Architecture portion affected
      expect(withRisk.totalClientPrice).toBeGreaterThan(withoutRisk.totalClientPrice);
    });
    
    it('should apply payment terms premium for net60', () => {
      const areas: Area[] = [
        {
          id: '1',
          name: 'Test',
          kind: 'standard',
          buildingType: '1',
          squareFeet: '20000',
          lod: '200',
          disciplines: ['architecture'],
          scope: 'full',
        },
      ];
      
      const net60 = calculatePricing(areas, {}, null, [], 'net60'); // +3% surcharge
      const standard = calculatePricing(areas, {}, null, [], 'standard');
      
      expect(net60.totalClientPrice).toBeGreaterThan(standard.totalClientPrice);
    });
    
    it('should apply prepaid discount', () => {
      const areas: Area[] = [
        {
          id: '1',
          name: 'Test',
          kind: 'standard',
          buildingType: '1',
          squareFeet: '20000',
          lod: '200',
          disciplines: ['architecture'],
          scope: 'full',
        },
      ];
      
      const prepaid = calculatePricing(areas, {}, null, [], 'prepaid'); // -5% discount
      const standard = calculatePricing(areas, {}, null, [], 'standard');
      
      expect(prepaid.totalClientPrice).toBeLessThan(standard.totalClientPrice);
    });
    
    it('should include travel line item in breakdown', () => {
      const areas: Area[] = [
        {
          id: '1',
          name: 'Test',
          kind: 'standard',
          buildingType: '1',
          squareFeet: '20000',
          lod: '200',
          disciplines: ['architecture'],
          scope: 'full',
        },
      ];
      const travel: TravelConfig = {
        dispatchLocation: 'WOODSTOCK',
        distance: 50,
      };
      
      const result = calculatePricing(areas, {}, travel, [], 'standard');
      
      // Check for travel line item
      const travelItem = result.items.find(i => i.label.toLowerCase().includes('travel'));
      expect(travelItem).toBeDefined();
      expect(travelItem?.value).toBe(150); // 50 miles * $3/mile
    });
    
    it('should include payment terms line item for net60', () => {
      const areas: Area[] = [
        {
          id: '1',
          name: 'Test',
          kind: 'standard',
          buildingType: '1',
          squareFeet: '20000',
          lod: '200',
          disciplines: ['architecture'],
          scope: 'full',
        },
      ];
      
      const result = calculatePricing(areas, {}, null, [], 'net60');
      
      // Check for payment terms line item
      const paymentItem = result.items.find(i => i.label.toLowerCase().includes('surcharge'));
      expect(paymentItem).toBeDefined();
      expect(paymentItem?.value).toBeGreaterThan(0);
    });
    
    it('should include prepaid discount line item with isDiscount flag', () => {
      const areas: Area[] = [
        {
          id: '1',
          name: 'Test',
          kind: 'standard',
          buildingType: '1',
          squareFeet: '20000',
          lod: '200',
          disciplines: ['architecture'],
          scope: 'full',
        },
      ];
      
      const result = calculatePricing(areas, {}, null, [], 'prepaid');
      
      // Check for prepaid discount line item
      const discountItem = result.items.find(i => i.label.toLowerCase().includes('discount'));
      expect(discountItem).toBeDefined();
      expect(discountItem?.value).toBeLessThan(0);
      expect(discountItem?.isDiscount).toBe(true);
    });
  });
  
  describe('Edge Cases', () => {
    
    it('should handle empty areas array', () => {
      const result = calculatePricing([], {}, null, [], 'standard');
      
      expect(result.totalClientPrice).toBe(0);
      expect(result.totalUpteamCost).toBe(0);
    });
    
    it('should handle null travel config', () => {
      const areas: Area[] = [
        {
          id: '1',
          name: 'Test',
          kind: 'standard',
          buildingType: '1',
          squareFeet: '10000',
          lod: '200',
          disciplines: ['architecture'],
        },
      ];
      
      const result = calculatePricing(areas, {}, null, [], 'standard');
      
      expect(result.totalClientPrice).toBeGreaterThan(0);
      // Travel line item should be $0 or not present
    });
    
    it('should handle area with no disciplines', () => {
      const areas: Area[] = [
        {
          id: '1',
          name: 'Empty Disciplines',
          kind: 'standard',
          buildingType: '1',
          squareFeet: '10000',
          lod: '200',
          disciplines: [],
        },
      ];
      
      // Should not throw, just calculate base
      const result = calculatePricing(areas, {}, null, [], 'standard');
      expect(result).toBeDefined();
    });
    
    it('should handle landscape area with 0 acres', () => {
      const areas: Area[] = [
        {
          id: '1',
          name: 'Empty Landscape',
          kind: 'landscape',
          buildingType: 'landscape_natural',
          squareFeet: '0',
          lod: '200',
          disciplines: ['site'],
        },
      ];
      
      const result = calculatePricing(areas, {}, null, [], 'standard');
      expect(result.totalClientPrice).toBe(0);
    });
  });
});

describe('Landscape Pricing', () => {
  
  it('should use acre-based rates for landscape areas', () => {
    const areas: Area[] = [
      {
        id: '1',
        name: 'Natural Landscape',
        kind: 'landscape',
        buildingType: 'landscape_natural',
        squareFeet: '5', // 5 acres
        lod: '300',
        disciplines: ['site'],
      },
    ];
    
    const result = calculatePricing(areas, {}, null, [], 'standard');
    
    // Should calculate based on acres, not sqft
    // 5 acres at ~$750/acre (LoD 300) = ~$3,750
    expect(result.totalClientPrice).toBeGreaterThan(0);
    
    // Check that landscape appears in breakdown
    const landscapeItem = result.items.find(i => i.label.toLowerCase().includes('landscape'));
    expect(landscapeItem).toBeDefined();
  });
});
