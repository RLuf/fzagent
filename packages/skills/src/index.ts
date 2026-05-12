export const FZAGENT_SKILLS_VERSION = '0.1.0';

export { defineSkill } from './types.js';
export type { LoadedSkill, SkillContext, SkillSpec } from './types.js';

export { SkillRegistry } from './registry.js';
export type { SkillRegistryOptions } from './registry.js';

export { JsonlSkillAuditor, MemorySkillAuditor, hashPayload } from './audit.js';
export type {
  SkillAuditor,
  SkillAuditEvent,
  SkillInvocationDecision,
  SkillInvocationOutcome,
  JsonlSkillAuditorOptions,
} from './audit.js';

export {
  cleanerSkill,
  codeReviewSkill,
  reflectSkill,
  registerBuiltinSkills,
  webResearchSkill,
  wikiIngestSkill,
  wikiQuerySkill,
} from './builtins.js';
