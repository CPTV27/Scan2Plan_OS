import { db } from '../db';
import { caseStudies, personas } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function rankCaseStudiesForPersona(personaCode: string) {
  const persona = await db.query.personas.findFirst({ 
    where: eq(personas.code, personaCode) 
  });
  
  if (!persona?.preferredTags?.length) return [];

  const allCaseStudies = await db.query.caseStudies.findMany();
  
  return allCaseStudies
    .map(cs => ({ 
      ...cs, 
      score: (cs.tags || []).filter(t => persona.preferredTags?.includes(t)).length 
    }))
    .filter(cs => cs.score > 0)
    .sort((a, b) => b.score - a.score);
}

export async function getBestCaseStudyForPersona(personaCode: string) {
  const ranked = await rankCaseStudiesForPersona(personaCode);
  return ranked[0] || null;
}
