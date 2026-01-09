import { test, expect, mockHubSpotAPI, trackCreatedLead } from '../fixtures/auth.fixtures';
import { LeadsPage } from '../page-objects/leads.po';

test.describe('Lead Creation → Quick Classify → Batch Sync to HubSpot', () => {
  let leadsPage: LeadsPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    await mockHubSpotAPI(authenticatedPage);
    leadsPage = new LeadsPage(authenticatedPage);
    await leadsPage.goto();
  });

  test.afterEach(async ({ cleanup }) => {
    await cleanup();
  });

  test('should create a new lead successfully', async () => {
    const leadId = await leadsPage.createLead({
      contactName: 'Test Lead ' + Date.now(),
      email: 'test@example.com',
      company: 'Test Company',
      persona: 'BP1',
      source: 'website',
    });

    trackCreatedLead(leadId);
    expect(leadId).toBeGreaterThan(0);
    
    const row = await leadsPage.getLeadRow(leadId);
    await expect(row).toBeVisible();
  });

  test('should quick classify a lead with persona', async () => {
    const leadId = await leadsPage.createLead({
      contactName: 'Classify Test ' + Date.now(),
      email: 'classify@example.com',
    });
    trackCreatedLead(leadId);

    await leadsPage.quickClassifyLead(leadId, 'BP3');

    const row = await leadsPage.getLeadRow(leadId);
    const personaBadge = row.locator('[data-testid^="badge-persona"]');
    await expect(personaBadge).toContainText('BP3');
  });

  test('should batch sync selected leads to HubSpot', async ({ authenticatedPage }) => {
    const lead1Id = await leadsPage.createLead({
      contactName: 'Sync Test 1 ' + Date.now(),
      email: 'sync1@example.com',
      persona: 'BP1',
    });
    trackCreatedLead(lead1Id);

    const lead2Id = await leadsPage.createLead({
      contactName: 'Sync Test 2 ' + Date.now(),
      email: 'sync2@example.com',
      persona: 'BP2',
    });
    trackCreatedLead(lead2Id);

    await leadsPage.selectLeads([lead1Id, lead2Id]);

    const responsePromise = authenticatedPage.waitForResponse(
      (resp) => resp.url().includes('/api/hubspot/batch-sync')
    );

    await leadsPage.batchSyncButton.click();
    
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('should show all 8 personas in quick classify dropdown', async () => {
    const leadId = await leadsPage.createLead({
      contactName: 'Persona Test ' + Date.now(),
    });
    trackCreatedLead(leadId);

    const row = await leadsPage.getLeadRow(leadId);
    const dropdown = row.locator('[data-testid="select-quick-classify"]');
    await dropdown.click();

    const personas = ['BP1', 'BP2', 'BP3', 'BP4', 'BP5', 'BP6', 'BP7', 'BP8'];
    for (const persona of personas) {
      const option = leadsPage.page.locator(`[data-testid="option-persona-${persona}"]`);
      await expect(option).toBeVisible();
    }
  });

  test('should search and filter leads', async () => {
    const uniqueName = 'UniqueSearchTerm' + Date.now();
    const leadId = await leadsPage.createLead({
      contactName: uniqueName,
      email: 'search@example.com',
    });
    trackCreatedLead(leadId);

    await leadsPage.searchLeads(uniqueName);

    const visibleRows = leadsPage.page.locator('[data-testid^="row-lead-"]:visible');
    const count = await visibleRows.count();
    expect(count).toBe(1);
  });

  test('complete lead-to-hubspot workflow', async ({ authenticatedPage }) => {
    const leadId = await leadsPage.createLead({
      contactName: 'Full Workflow Test ' + Date.now(),
      email: 'workflow@example.com',
      company: 'Workflow Corp',
    });
    trackCreatedLead(leadId);

    await leadsPage.quickClassifyLead(leadId, 'BP6');

    await leadsPage.selectLeads([leadId]);

    const responsePromise = authenticatedPage.waitForResponse(
      (resp) => resp.url().includes('/api/hubspot/batch-sync')
    );
    await leadsPage.batchSyncButton.click();
    
    const response = await responsePromise;
    const data = await response.json();
    
    expect(data.success).toBe(true);
    await leadsPage.waitForToast('Sync complete');
  });
});
