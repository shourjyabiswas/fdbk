import {
  PERSONA_RESPONSE_CAP_PER_GROUP,
  SURVEY_PERSONAS,
  UNRESTRICTED_GROUP_MEMBER_LIMIT,
  type SurveyPersonaKey,
} from "@/lib/constants";

type PersonaResponse = {
  persona?: string;
};

export function getPersonaAvailability(responses: PersonaResponse[], groupMemberCount: number) {
  const counts = Object.fromEntries(SURVEY_PERSONAS.map((persona) => [persona.key, 0])) as Record<
    SurveyPersonaKey,
    number
  >;

  for (const response of responses) {
    if (response.persona && response.persona in counts) {
      counts[response.persona as SurveyPersonaKey] += 1;
    }
  }

  const isUnrestrictedGroup = groupMemberCount <= UNRESTRICTED_GROUP_MEMBER_LIMIT;
  
  let available: Array<{ readonly key: string; readonly label: string }> = [...SURVEY_PERSONAS];
  if (!isUnrestrictedGroup) {
    const totalSubmissions = responses.length;
    const remainingSubmissions = groupMemberCount - totalSubmissions;
    
    // Count how many personas currently have 0 responses in this group
    const z = SURVEY_PERSONAS.filter((persona) => counts[persona.key] === 0).length;
    
    // Filter personas that are below the max cap
    const belowCapPersonas = SURVEY_PERSONAS.filter(
      (persona) => counts[persona.key] < PERSONA_RESPONSE_CAP_PER_GROUP
    );

    // If remaining submissions (including current one) are <= number of 0-response personas,
    // we must restrict options only to those 0-response personas.
    if (remainingSubmissions <= z) {
      available = belowCapPersonas.filter((persona) => counts[persona.key] === 0);
    } else {
      available = belowCapPersonas;
    }
  }

  return { counts, available, isUnrestrictedGroup, groupMemberCount };
}
