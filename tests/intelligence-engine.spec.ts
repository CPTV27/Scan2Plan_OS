import { test, expect } from '@playwright/test';

test.describe('Intelligence Engine - Buyer Personas API', () => {
  test('should list all buyer personas', async ({ request }) => {
    const response = await request.get('/api/intelligence/personas');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(4);
  });

  test('should get BP-A (Design Principal) persona', async ({ request }) => {
    const response = await request.get('/api/intelligence/personas/BP-A');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.code).toBe('BP-A');
    expect(data.roleTitle).toBe('Design Principal');
    expect(data).toHaveProperty('primaryPain');
    expect(data).toHaveProperty('valueDriver');
  });

  test('should get BP-B (Project Architect) persona', async ({ request }) => {
    const response = await request.get('/api/intelligence/personas/BP-B');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.code).toBe('BP-B');
    expect(data.roleTitle).toBe('Project Architect');
  });

  test('should get BP-C (Owner Representative) persona', async ({ request }) => {
    const response = await request.get('/api/intelligence/personas/BP-C');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.code).toBe('BP-C');
    expect(data.roleTitle).toBe('Owner Representative');
  });

  test('should get BP-D (GC/Construction Manager) persona', async ({ request }) => {
    const response = await request.get('/api/intelligence/personas/BP-D');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.code).toBe('BP-D');
    expect(data.roleTitle).toBe('GC/Construction Manager');
  });

  test('persona should have communication profile', async ({ request }) => {
    const response = await request.get('/api/intelligence/personas/BP-A');
    const data = await response.json();
    
    expect(data).toHaveProperty('tonePreference');
    expect(data).toHaveProperty('communicationStyle');
    expect(data).toHaveProperty('attentionSpan');
    expect(data).toHaveProperty('technicalTriggers');
    expect(data).toHaveProperty('emotionalTriggers');
    expect(data).toHaveProperty('avoidWords');
  });

  test('persona should have psychological profile', async ({ request }) => {
    const response = await request.get('/api/intelligence/personas/BP-A');
    const data = await response.json();
    
    expect(data).toHaveProperty('primaryPain');
    expect(data).toHaveProperty('secondaryPain');
    expect(data).toHaveProperty('hiddenFear');
    expect(data).toHaveProperty('valueDriver');
    expect(data).toHaveProperty('dealbreaker');
  });
});

test.describe('Intelligence Engine - Brand Voices API', () => {
  test('should list all brand voices', async ({ request }) => {
    const response = await request.get('/api/intelligence/voices');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(4);
  });

  test('brand voice should have required fields', async ({ request }) => {
    const response = await request.get('/api/intelligence/voices');
    const voices = await response.json();
    
    if (voices.length > 0) {
      const voice = voices[0];
      expect(voice).toHaveProperty('id');
      expect(voice).toHaveProperty('name');
      expect(voice).toHaveProperty('purpose');
      expect(voice).toHaveProperty('toneDescriptors');
    }
  });
});

test.describe('Intelligence Engine - Solution Mappings API', () => {
  test('should list solution mappings', async ({ request }) => {
    const response = await request.get('/api/intelligence/solutions');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('solution mapping should have pain-to-solution structure', async ({ request }) => {
    const response = await request.get('/api/intelligence/solutions');
    const solutions = await response.json();
    
    if (solutions.length > 0) {
      const solution = solutions[0];
      expect(solution).toHaveProperty('painPoint');
      expect(solution).toHaveProperty('solution');
      expect(solution).toHaveProperty('proofPoints');
    }
  });
});

test.describe('Intelligence Engine - Negotiation Playbook API', () => {
  test('should list negotiation playbook entries', async ({ request }) => {
    const response = await request.get('/api/intelligence/negotiation');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('playbook entry should have objection handling structure', async ({ request }) => {
    const response = await request.get('/api/intelligence/negotiation');
    const entries = await response.json();
    
    if (entries.length > 0) {
      const entry = entries[0];
      expect(entry).toHaveProperty('objectionPattern');
      expect(entry).toHaveProperty('underlyingConcern');
      expect(entry).toHaveProperty('reframeLanguage');
    }
  });

  test('should filter playbook by buyer persona', async ({ request }) => {
    const response = await request.get('/api/intelligence/negotiation?buyerCode=BP-A');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

test.describe('Intelligence Engine - Proposal Generation', () => {
  test('should generate proposal content', async ({ request }) => {
    const response = await request.post('/api/intelligence/generate/proposal', {
      data: {
        buyerCode: 'BP-A',
        projectName: 'Test Office Building',
        projectType: 'Commercial / Office',
        squareFootage: '25000',
        timeline: 'Standard'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('content');
    expect(data.content.length).toBeGreaterThan(100);
  });

  test('proposal should adapt to different personas', async ({ request }) => {
    const responseA = await request.post('/api/intelligence/generate/proposal', {
      data: {
        buyerCode: 'BP-A',
        projectName: 'Design Principal Project',
        projectType: 'Healthcare / Medical',
        squareFootage: '50000',
        timeline: 'Urgent'
      }
    });
    
    const responseD = await request.post('/api/intelligence/generate/proposal', {
      data: {
        buyerCode: 'BP-D',
        projectName: 'GC Project',
        projectType: 'Industrial / Warehouse',
        squareFootage: '100000',
        timeline: 'Flexible'
      }
    });
    
    expect(responseA.status()).toBe(200);
    expect(responseD.status()).toBe(200);
    
    const dataA = await responseA.json();
    const dataD = await responseD.json();
    
    expect(dataA.content).not.toBe(dataD.content);
  });

  test('should include scope notes in proposal', async ({ request }) => {
    const response = await request.post('/api/intelligence/generate/proposal', {
      data: {
        buyerCode: 'BP-B',
        projectName: 'Renovation Project',
        projectType: 'Historical / Renovation',
        squareFootage: '15000',
        timeline: 'Standard',
        scopeNotes: 'Historical building with complex facade details. Need careful coordination with preservation team.'
      }
    });
    
    expect(response.status()).toBe(200);
  });
});

test.describe('Intelligence Engine - Content Generation', () => {
  test('should generate email content', async ({ request }) => {
    const response = await request.post('/api/intelligence/generate/content', {
      data: {
        buyerCode: 'BP-A',
        contentType: 'email',
        projectContext: {
          projectName: 'Downtown Office',
          projectType: 'Commercial / Office',
          squareFootage: '30000'
        },
        specificRequest: 'Write an introduction email for a new prospect.'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('content');
  });

  test('should generate social media content', async ({ request }) => {
    const response = await request.post('/api/intelligence/generate/content', {
      data: {
        buyerCode: 'BP-C',
        contentType: 'social_post',
        projectContext: {
          projectName: 'Retail Center',
          projectType: 'Retail / Hospitality'
        },
        specificRequest: 'Create a LinkedIn post about our scanning capabilities.'
      }
    });
    
    expect(response.status()).toBe(200);
  });

  test('should generate case study content', async ({ request }) => {
    const response = await request.post('/api/intelligence/generate/content', {
      data: {
        buyerCode: 'BP-B',
        contentType: 'case_study',
        projectContext: {
          projectName: 'University Campus',
          projectType: 'Education / Campus',
          squareFootage: '150000'
        },
        specificRequest: 'Create a case study highlighting how 3D scanning reduced RFIs.'
      }
    });
    
    expect(response.status()).toBe(200);
  });
});

test.describe('Intelligence Engine - Negotiation Response', () => {
  test('should generate objection response', async ({ request }) => {
    const response = await request.post('/api/intelligence/generate/negotiation', {
      data: {
        buyerCode: 'BP-A',
        objection: 'Your pricing is higher than our budget allows.',
        projectContext: {
          projectName: 'Office Tower',
          value: 75000
        }
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('response');
  });

  test('should handle different objection types', async ({ request }) => {
    const objections = [
      'We need more time to decide',
      'Can you match our competitors price?',
      'We are not sure about the ROI',
      'The timeline is too long'
    ];
    
    for (const objection of objections) {
      const response = await request.post('/api/intelligence/generate/negotiation', {
        data: {
          buyerCode: 'BP-D',
          objection,
          projectContext: {
            projectName: 'Warehouse Project'
          }
        }
      });
      
      expect(response.status()).toBe(200);
    }
  });

  test('should require non-empty objection', async ({ request }) => {
    const response = await request.post('/api/intelligence/generate/negotiation', {
      data: {
        buyerCode: 'BP-A',
        objection: '',
        projectContext: {}
      }
    });
    
    expect([400, 422]).toContain(response.status());
  });
});

test.describe('Intelligence Engine - Generated Content Storage', () => {
  test('should store generated content', async ({ request }) => {
    await request.post('/api/intelligence/generate/proposal', {
      data: {
        buyerCode: 'BP-A',
        projectName: 'Storage Test Project',
        projectType: 'Commercial / Office',
        squareFootage: '10000',
        timeline: 'Standard'
      }
    });
    
    const response = await request.get('/api/intelligence/generated');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should filter generated content by type', async ({ request }) => {
    const response = await request.get('/api/intelligence/generated?contentType=proposal');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
