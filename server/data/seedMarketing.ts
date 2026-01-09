import { db } from '../db';
import { personas, evidenceVault } from '@shared/schema';
import { eq } from 'drizzle-orm';

export const PERSONA_SEED = [
  {
    code: "BP1",
    name: "The Engineer",
    painPoints: ["Accuracy drift", "Field verification", "Coordination time"],
    preferredTags: ["mep", "industrial", "coordination"],
    scriptTemplate: "{{firstName}}, your team is losing hours on field verification. {{hook}} Worth 15 min?"
  },
  {
    code: "BP2",
    name: "The GC",
    painPoints: ["Schedule risk", "RFI volume", "Trade coordination"],
    preferredTags: ["commercial", "renovation", "coordination"],
    scriptTemplate: "{{firstName}}, RFIs killing your schedule? {{hook}} Quick call?"
  },
  {
    code: "BP3",
    name: "The Owner's Rep",
    painPoints: ["Budget variance", "Change orders", "Accountability"],
    preferredTags: ["commercial", "historic", "documentation"],
    scriptTemplate: "{{firstName}}, change orders eating your contingency? {{hook}}"
  },
  {
    code: "BP4",
    name: "The Facilities Manager",
    painPoints: ["Asset documentation", "Emergency response", "Space planning"],
    preferredTags: ["industrial", "education", "healthcare"],
    scriptTemplate: "{{firstName}}, still hunting for drawings during emergencies? {{hook}} Here's how."
  },
  {
    code: "BP5",
    name: "The Architect",
    painPoints: ["As-built accuracy", "Design intent", "Historic preservation"],
    preferredTags: ["historic", "residential", "renovation"],
    scriptTemplate: "{{firstName}}, as-builts lying to you again? {{hook}} PDF attached."
  },
  {
    code: "BP6",
    name: "The Developer",
    painPoints: ["Due diligence speed", "Acquisition risk", "Repositioning cost"],
    preferredTags: ["commercial", "industrial", "documentation"],
    scriptTemplate: "{{firstName}}, how much is bad survey data costing your pro forma? {{hook}}"
  },
  {
    code: "BP7",
    name: "The Surveyor",
    painPoints: ["Turnaround time", "Interior access", "Deliverable format"],
    preferredTags: ["industrial", "commercial", "mep"],
    scriptTemplate: "{{firstName}}, subbing out interior scans? We white-label for firms like yours. {{hook}}"
  },
  {
    code: "BP8",
    name: "The Influencer / Tech Leader",
    painPoints: ["Content fatigue", "Finding novel tech", "Audience engagement"],
    preferredTags: ["vdc", "reality-capture", "proptech"],
    scriptTemplate: "Hey {{firstName}}, huge fan of your work on {{hook}}. We just automated a 'Variance Cop' that catches 10% drift instantly. Thought your audience might like the raw data?"
  }
];

export const EVIDENCE_SEED = [
  { personaCode: "BP1", hookContent: "Maine Penthouse: Captured complex rooftop MEP without a single climb. Zero safety risk, 100% clash detection ready.", ewsScore: 5, sourceUrl: "https://a360.co/3wXjC4e" },
  { personaCode: "BP2", hookContent: "Newark Terminal C: Scanned active high-security terminal with zero operational downtime. Schedule protected.", ewsScore: 5, sourceUrl: "" },
  { personaCode: "BP6", hookContent: "Deep Forest Property: Captured treacherous ravine terrain via drone/remote sensing. No boots on the ground, full topographic certainty.", ewsScore: 4, sourceUrl: "https://a360.co/3wW4z4e" },
  { personaCode: "BP5", hookContent: "Masonic Lodge (Troy): Modeled complex Pipe Organ and historic geometry to LOD 350. Preserved design intent where 2D drawings failed.", ewsScore: 5, sourceUrl: "https://a360.co/3wT5z4e" },
  { personaCode: "BP3", hookContent: "Stony Brook IACS: Verified massive campus facade materials. Created a single source of truth for complex institutional maintenance.", ewsScore: 4, sourceUrl: "https://a360.co/3wV5z4e" },
  { personaCode: "BP1", hookContent: "Fire House (1342 Central): Verified clearance tolerances for new fire apparatus. Guaranteed fit before construction.", ewsScore: 4, sourceUrl: "https://a360.co/3wY5z4e" },
  { personaCode: "BP6", hookContent: "BOMA 2024 Update: Unenclosed amenities (balconies) are now rentable. We found 5% more leasable space using LiDAR.", ewsScore: 5, sourceUrl: "https://www.boma.org/BOMA/Standards" },
  { personaCode: "BP5", hookContent: "LEED v5 Compliance: Reusing structure cuts embodied carbon by 50%. Our LoA 40 scan proves structural capacity for the LCA credits.", ewsScore: 5, sourceUrl: "https://www.usgbc.org/leed/v5" },
  { personaCode: "BP8", hookContent: "Automated QA logic. We analyzed 1M sqft of scan data and found a 68% failure rate in standard as-builts.", ewsScore: 5, sourceUrl: "https://scan2plan.io/research" },
  
  // CEO Strategic Hooks - FY26 Priority Messaging
  // TARGET: ARCHITECTS (BP5) - Strategy: "Design Freedom"
  { personaCode: "BP5", hookContent: "Design Freedom: We guarantee the canvas so you can design uninterrupted. More hours on design; zero hours re-measuring.", ewsScore: 5, sourceUrl: "https://scan2plan.io/castle-lod-explainer" },
  // TARGET: GCs (BP2) - Strategy: "BIM Without Blame"
  { personaCode: "BP2", hookContent: "BIM Without the Blame: Clash-checked, tolerance-verified models. We own the accuracy risk so you don't buy the rework.", ewsScore: 5, sourceUrl: "https://scan2plan.io/assurance-packet" },
  // TARGET: OWNERS / ENTERPRISE (BP6) - Strategy: "Standardize Certainty"
  { personaCode: "BP6", hookContent: "Portfolio Standardization: One vendor, one standard, guaranteed outcomes. Price-match guarantee at equal spec.", ewsScore: 5, sourceUrl: "https://scan2plan.io/program-offer" }
];

export async function seedMarketingData() {
  console.log('Seeding Marketing Engine...');

  for (const p of PERSONA_SEED) {
    await db.insert(personas).values(p).onConflictDoNothing();
  }

  for (const e of EVIDENCE_SEED) {
    const existing = await db.select().from(evidenceVault).where(eq(evidenceVault.hookContent, e.hookContent)).limit(1);
    if (existing.length === 0) {
      await db.insert(evidenceVault).values(e);
    }
  }
  
  console.log('Marketing Engine Seeded.');
}
