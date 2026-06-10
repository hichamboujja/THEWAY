const config = require('../lib/config');
const { httpError } = require('../lib/response');

const CV_PROMPT_VERSION = 'cv-analysis-v1';
const MATCHING_PROMPT_VERSION = 'matching-v1';
const COACH_PROMPT_VERSION = 'coach-v1';

function ensureConfigured() {
    if (isLocalProvider()) return;
    if (!config.ai.provider || !isRealApiKey(config.ai.apiKey) || !config.ai.baseUrl || !config.ai.model) {
        throw httpError(503, 'ai_not_configured', 'AI provider is not configured');
    }
}

function isLocalProvider() {
    return config.nodeEnv !== 'production' && ['local', 'mock', 'test'].includes(String(config.ai.provider || '').toLowerCase());
}

function isRealApiKey(value) {
    const key = String(value || '').trim();
    if (!key) return false;
    return !['your_key_here', 'replace-with-provider-key', 'replace-me'].includes(key.toLowerCase());
}

async function analyseCvText(text) {
    ensureConfigured();
    if (isLocalProvider()) return localCvAnalysis(text);

    const response = await chatJson([
        {
            role: 'system',
            content: 'You extract structured career information. Respond only with valid JSON.'
        },
        {
            role: 'user',
            content: [
                'Analyse this CV text and return JSON with keys:',
                'summary:string, extractedSkills:string[], seniority:string, recommendedRoles:string[].',
                '',
                text
            ].join('\n')
        }
    ]);

    return {
        promptVersion: CV_PROMPT_VERSION,
        providerResponseId: response.id || null,
        summary: response.json.summary || '',
        extractedSkills: Array.isArray(response.json.extractedSkills) ? response.json.extractedSkills : [],
        raw: response.json
    };
}

async function rankOpportunities(profile) {
    ensureConfigured();
    if (isLocalProvider()) return localOpportunityRanking(profile);

    const response = await chatJson([
        {
            role: 'system',
            content: 'You rank job opportunities for a candidate. Respond only with valid JSON.'
        },
        {
            role: 'user',
            content: JSON.stringify({
                instruction: 'Return JSON: { matches: [{ opportunityId, score, matchedSkills, missingSkills, explanation }] }. Score is 0-100 and must be evidence based.',
                candidateSkills: profile.skills,
                cvSummary: profile.summary,
                opportunities: profile.opportunities.map(item => ({
                    opportunityId: item.id,
                    title: item.title,
                    company: item.company,
                    location: item.location,
                    skills: item.skills,
                    description: String(item.description || '').slice(0, 1200)
                }))
            })
        }
    ]);

    return {
        promptVersion: MATCHING_PROMPT_VERSION,
        providerResponseId: response.id || null,
        matches: Array.isArray(response.json.matches) ? response.json.matches : [],
        raw: response.json
    };
}

async function chatJson(messages) {
    const base = config.ai.baseUrl.replace(/\/$/, '');
    const endpoint = base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.ai.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: config.ai.model,
            response_format: { type: 'json_object' },
            temperature: 0.2,
            messages
        })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw httpError(502, 'ai_provider_error', 'AI provider request failed', sanitiseProviderError(payload));
    }
    const content = payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
    try {
        return {
            id: payload.id,
            json: JSON.parse(content || '{}')
        };
    } catch (error) {
        throw httpError(502, 'ai_invalid_json', 'AI provider returned invalid JSON');
    }
}

async function coachSuggestions(profile) {
    ensureConfigured();
    if (isLocalProvider()) return localCoachSuggestions(profile);

    const response = await chatJson([
        {
            role: 'system',
            content: 'You are a practical career coach. Respond only with valid JSON.'
        },
        {
            role: 'user',
            content: JSON.stringify({
                instruction: 'Return JSON: { tips: string[] }. Give 3 to 5 concise, actionable tips in French for this candidate.',
                candidateSkills: profile.skills || [],
                cvSummary: profile.summary || '',
                bestMatch: profile.bestMatch || null
            })
        }
    ]);

    return {
        promptVersion: COACH_PROMPT_VERSION,
        providerResponseId: response.id || null,
        tips: normaliseTips(response.json.tips),
        raw: response.json
    };
}

function localCvAnalysis(text) {
    const source = String(text || '');
    const knownSkills = [
        'JavaScript', 'TypeScript', 'Node', 'React', 'Python', 'SQL', 'MySQL', 'PostgreSQL',
        'Docker', 'Git', 'Excel', 'HTML', 'CSS', 'API', 'REST', 'Express', 'Laravel',
        'PHP', 'Java', 'C#', 'Power BI', 'Figma', 'AWS', 'Azure', 'Word', 'PowerPoint',
        'Vente', 'Commercial', 'Relation Client', 'Marketing', 'Communication',
        'Management', 'Gestion de projet', 'Scrum', 'Agile', 'Qualite', 'Qualité',
        'Production', 'Maintenance', 'Logistique', 'Approvisionnement', 'Achat',
        'Finance', 'Comptabilite', 'Comptabilité', 'Controle de gestion', 'Contrôle de gestion',
        'Ressources humaines', 'Recrutement', 'Formation', 'Français', 'Anglais',
        'HSE', 'Securite', 'Sécurité', 'Design', 'UI', 'UX', 'Data Analysis'
    ];
    const lower = source.toLowerCase();
    const extractedSkills = knownSkills.filter(skill => lower.includes(skill.toLowerCase()));
    const words = source.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const summary = words.length
        ? `Analyse locale du CV: ${words.slice(0, 34).join(' ')}${words.length > 34 ? '...' : ''}`
        : 'Analyse locale du CV terminee.';
    return {
        promptVersion: `${CV_PROMPT_VERSION}-local`,
        providerResponseId: 'local-cv-analysis',
        summary,
        extractedSkills,
        raw: {
            summary,
            extractedSkills,
            seniority: 'non determine',
            recommendedRoles: []
        }
    };
}

function localOpportunityRanking(profile) {
    const candidateSkills = normaliseSkillList(profile.skills || []);
    const matches = (profile.opportunities || []).map(opportunity => {
        const opportunitySkills = opportunity.skills || [];
        const searchable = [
            opportunity.title,
            opportunity.company,
            opportunity.location,
            opportunity.description,
            opportunitySkills.join(' ')
        ].join(' ').toLowerCase();
        const matchedSkills = candidateSkills.filter(skill => searchable.includes(skill.toLowerCase()));
        const skillOverlap = opportunitySkills.filter(skill => matchedSkills.some(item => item.toLowerCase() === String(skill).toLowerCase()));
        const score = Math.min(95, 35 + matchedSkills.length * 12 + skillOverlap.length * 8);
        return {
            opportunityId: opportunity.id,
            score,
            matchedSkills,
            missingSkills: opportunitySkills.filter(skill => !matchedSkills.some(item => item.toLowerCase() === String(skill).toLowerCase())).slice(0, 5),
            explanation: matchedSkills.length
                ? `Classement local base sur ${matchedSkills.length} competence(s) commune(s): ${matchedSkills.slice(0, 4).join(', ')}.`
                : 'Aucune competence commune detectee.'
        };
    }).filter(item => item.matchedSkills.length > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);
    return {
        promptVersion: `${MATCHING_PROMPT_VERSION}-local`,
        providerResponseId: 'local-matching',
        matches,
        raw: {}
    };
}

function localCoachSuggestions(profile) {
    const skills = normaliseSkillList(profile.skills || []);
    const bestMatch = profile.bestMatch || {};
    const missingSkills = normaliseSkillList(bestMatch.missingSkills || bestMatch.missing_skills || []);
    const matchedSkills = normaliseSkillList(bestMatch.matchedSkills || bestMatch.matched_skills || []);
    const tips = [];

    if (profile.summary) {
        tips.push('Transforme le resume de ton CV en 3 resultats mesurables lies au poste vise.');
    } else {
        tips.push('Ajoute un resume court a ton CV pour clarifier ton profil et ton objectif.');
    }
    if (skills.length) {
        tips.push(`Mets en avant tes competences les plus fortes: ${skills.slice(0, 3).join(', ')}.`);
    } else {
        tips.push('Renseigne au moins 5 competences prioritaires pour obtenir des recommandations plus precises.');
    }
    if (missingSkills.length) {
        tips.push(`Priorise une montee en competence sur ${missingSkills.slice(0, 2).join(' et ')}.`);
    } else if (matchedSkills.length) {
        tips.push(`Prepare des exemples concrets autour de ${matchedSkills.slice(0, 2).join(' et ')} pour ton prochain entretien.`);
    } else {
        tips.push('Lance un matching pour identifier les ecarts entre ton profil et les offres recentes.');
    }
    if (bestMatch.title || bestMatch.company) {
        tips.push(`Adapte ton CV a ${[bestMatch.title, bestMatch.company].filter(Boolean).join(' chez ')} avant de postuler.`);
    }

    return {
        promptVersion: `${COACH_PROMPT_VERSION}-local`,
        providerResponseId: 'local-coach',
        tips: tips.slice(0, 5),
        raw: {}
    };
}

function normaliseTips(value) {
    return Array.isArray(value)
        ? value.map(item => String(item || '').trim()).filter(Boolean).slice(0, 5)
        : [];
}

function normaliseSkillList(skills) {
    return Array.from(new Set(skills
        .map(skill => String(skill || '').trim())
        .filter(Boolean)
        .map(skill => skill.replace(/\s+/g, ' '))));
}

function sanitiseProviderError(payload) {
    const message = payload && payload.error && payload.error.message
        ? String(payload.error.message).replace(/sk-[A-Za-z0-9_-]+/g, 'sk-[redacted]')
        : undefined;
    return {
        providerCode: payload && payload.error && payload.error.code || null,
        providerType: payload && payload.error && payload.error.type || null,
        providerMessage: message || null
    };
}

module.exports = {
    analyseCvText,
    rankOpportunities,
    coachSuggestions,
    CV_PROMPT_VERSION,
    MATCHING_PROMPT_VERSION,
    COACH_PROMPT_VERSION
};
