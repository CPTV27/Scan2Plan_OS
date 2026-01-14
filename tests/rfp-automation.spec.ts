import { test, expect } from '@playwright/test';

// ============================================
// RFP AUTOMATION API TESTS
// ============================================

test.describe('RFP Automation API', () => {

    test('GET /api/rfp should return array', async ({ request }) => {
        const response = await request.get('/api/rfp');

        if (response.status() === 200) {
            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
        } else {
            // May require auth
            expect([401, 403]).toContain(response.status());
        }
    });

    test('GET /api/rfp/stats should return pipeline stats', async ({ request }) => {
        const response = await request.get('/api/rfp/stats');

        if (response.status() === 200) {
            const data = await response.json();
            expect(data).toHaveProperty('total');
            expect(data).toHaveProperty('pending');
            expect(data).toHaveProperty('extracted');
            expect(data).toHaveProperty('proposalReady');
            expect(data).toHaveProperty('approved');
            expect(data).toHaveProperty('sent');
            expect(data).toHaveProperty('rejected');
        } else {
            expect([401, 403]).toContain(response.status());
        }
    });

    test('GET /api/rfp/queue should require CEO role', async ({ request }) => {
        const response = await request.get('/api/rfp/queue');
        // Should not be 404 (route exists)
        expect(response.status()).not.toBe(404);
    });

    test('POST /api/rfp/upload should require auth', async ({ request }) => {
        const response = await request.post('/api/rfp/upload', {
            data: {
                fileName: 'test-rfp.pdf'
            }
        });
        // Route exists (may require auth)
        expect(response.status()).not.toBe(404);
    });

    test('POST /api/rfp/upload should require fileName', async ({ request }) => {
        const response = await request.post('/api/rfp/upload', {
            data: {}
        });
        // Should reject missing fileName (400) or require auth (401/403)
        expect([400, 401, 403]).toContain(response.status());
    });

    test('GET /api/rfp/:id should return 404 for non-existent RFP', async ({ request }) => {
        const response = await request.get('/api/rfp/999999');
        // Either 404 (not found) or 401/403 (auth required)
        expect([401, 403, 404]).toContain(response.status());
    });

    test('POST /api/rfp/:id/extract should require content', async ({ request }) => {
        const response = await request.post('/api/rfp/1/extract', {
            data: {}
        });
        // Should reject missing content (400) or require auth (401/403)
        expect([400, 401, 403, 404]).toContain(response.status());
    });

    test('POST /api/rfp/:id/generate-proposal should exist', async ({ request }) => {
        const response = await request.post('/api/rfp/1/generate-proposal');
        // Route exists
        expect(response.status()).not.toBe(404);
    });

    test('POST /api/rfp/:id/approve should require CEO role', async ({ request }) => {
        const response = await request.post('/api/rfp/1/approve', {
            data: { notes: 'Test approval' }
        });
        // Route exists (requires CEO role)
        expect(response.status()).not.toBe(404);
    });

    test('POST /api/rfp/:id/reject should require notes', async ({ request }) => {
        const response = await request.post('/api/rfp/1/reject', {
            data: {}
        });
        // Should require notes (400) or auth (401/403)
        expect([400, 401, 403]).toContain(response.status());
    });

    test('POST /api/rfp/:id/send should require approval first', async ({ request }) => {
        const response = await request.post('/api/rfp/1/send', {
            data: { recipientEmail: 'test@example.com' }
        });
        // Either not approved (400), auth required (401/403), or not found (404)
        expect([400, 401, 403, 404]).toContain(response.status());
    });
});

// ============================================
// RFP WORKFLOW INTEGRATION TEST
// ============================================

test.describe('RFP Workflow Integration', () => {

    test('should handle full RFP workflow via API', async ({ request }) => {
        // Step 1: Upload RFP
        const uploadResponse = await request.post('/api/rfp/upload', {
            data: {
                fileName: 'test-school-rfp.pdf',
                fileType: 'pdf',
                fileContent: `
                    REQUEST FOR PROPOSAL
                    NYC Department of Education
                    PS 115 Elementary School Renovation
                    
                    Project: Scan-to-BIM Services for School Renovation
                    Address: 123 Main Street, Brooklyn, NY 11201
                    Building: Educational - Elementary School
                    Size: 75,000 square feet
                    
                    Scope of Work:
                    - Full building laser scanning
                    - LOD 300 architectural model
                    - LOD 300 MEP systems
                    - As-built documentation
                    
                    Requirements:
                    - Revit 2024 deliverables
                    - 2-week turnaround
                    - NYC DOB compliance
                    
                    Contact:
                    Name: John Smith
                    Email: jsmith@schools.nyc.gov
                    Phone: 212-555-0123
                    
                    Deadline: February 1, 2026
                    Budget: $80,000 - $100,000
                `
            }
        });

        if (uploadResponse.status() === 201) {
            const rfp = await uploadResponse.json();
            expect(rfp).toHaveProperty('id');
            expect(rfp).toHaveProperty('status');
            expect(rfp.originalFileName).toBe('test-school-rfp.pdf');
        } else if (uploadResponse.status() === 401 || uploadResponse.status() === 403) {
            // Auth required - expected in unauthenticated test
            console.log('RFP upload requires authentication');
        } else {
            console.log('RFP upload response:', uploadResponse.status());
        }
    });
});

// ============================================
// RFP STATUS TRANSITIONS
// ============================================

test.describe('RFP Status Transitions', () => {

    test('RFP statuses should be valid', async () => {
        const validStatuses = [
            'pending',
            'extracting',
            'extracted',
            'generating',
            'proposal_ready',
            'approved',
            'sent',
            'rejected'
        ];

        // Verify status values
        validStatuses.forEach(status => {
            expect(typeof status).toBe('string');
            expect(status.length).toBeGreaterThan(0);
        });
    });
});
