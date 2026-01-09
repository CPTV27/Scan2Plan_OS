export const TEST_LEADS = [
  {
    contactName: 'John Architect',
    email: 'john@architecture.com',
    company: 'Modern Architecture LLC',
    persona: 'BP5',
    source: 'referral',
  },
  {
    contactName: 'Sarah Developer',
    email: 'sarah@realestate.com',
    company: 'Prime Properties',
    persona: 'BP6',
    source: 'website',
  },
  {
    contactName: 'Mike Influencer',
    email: 'mike@techblog.com',
    company: 'VDC Weekly',
    persona: 'BP8',
    source: 'linkedin',
  },
];

export const TEST_PROJECTS = [
  {
    name: 'Downtown Office Tower',
    estimatedSqft: 50000,
    actualSqft: 52500,
    status: 'in_progress',
    client: 'Urban Development Corp',
  },
  {
    name: 'Historic Library Renovation',
    estimatedSqft: 25000,
    actualSqft: 24000,
    status: 'complete',
    client: 'City of Springfield',
  },
  {
    name: 'Industrial Warehouse Complex',
    estimatedSqft: 100000,
    actualSqft: 115000,
    status: 'in_progress',
    client: 'Logistics Partners Inc',
  },
];

export const TEST_EVIDENCE_HOOKS = [
  {
    personaCode: 'BP1',
    hookContent: 'Reduced field verification time by 60% using point cloud comparison.',
    ewsScore: 5,
  },
  {
    personaCode: 'BP6',
    hookContent: 'BOMA 2024: Found 5% additional rentable space in balcony measurements.',
    ewsScore: 5,
  },
  {
    personaCode: 'BP8',
    hookContent: '68% of as-builts fail our QA logic check. Here\'s the raw data.',
    ewsScore: 5,
  },
];

export const TEST_TIME_ENTRIES = [
  {
    projectId: 1,
    role: 'scanning' as const,
    hours: 4,
    notes: 'Site scanning - floors 1-3',
  },
  {
    projectId: 1,
    role: 'modeling' as const,
    hours: 6,
    notes: 'MEP coordination modeling',
  },
  {
    projectId: 1,
    role: 'qc' as const,
    hours: 2,
    notes: 'Quality control review',
  },
];

export const PERSONAS = [
  { code: 'BP1', label: 'The Engineer' },
  { code: 'BP2', label: 'The GC' },
  { code: 'BP3', label: "The Owner's Rep" },
  { code: 'BP4', label: 'The Facilities Manager' },
  { code: 'BP5', label: 'The Architect' },
  { code: 'BP6', label: 'The Developer' },
  { code: 'BP7', label: 'The Surveyor' },
  { code: 'BP8', label: 'The Influencer / Tech Leader' },
];

export const ROLES = [
  { id: 'scanning', label: 'Scanning' },
  { id: 'modeling', label: 'Modeling' },
  { id: 'qc', label: 'QC' },
  { id: 'admin', label: 'Admin' },
];
