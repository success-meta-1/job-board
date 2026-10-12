import type { AtsId, DirectBoard, SearchSource, SourceGroup } from '@/shared/types';

const src = (group: SourceGroup, id: string, label: string, operator: string): SearchSource => ({
  id,
  label,
  group,
  operator,
});

/** Saved Google searches from `bookmarks_2_1_24(1).html`, grouped by bookmark folder. */
export const SEARCH_SOURCES: SearchSource[] = [
  src('ATS', 'workable', 'Workable', 'site:workable.com'),
  src('ATS', 'dover', 'Dover Jobs', 'site:dover.com'),
  src('ATS', 'startup-jobs', 'Startup Jobs', 'site:startup.jobs'),
  src('ATS', 'cleverstaff', 'Cleverstaff Jobs', 'site:cleverstaff.net'),
  src('ATS', 'greenhouse', 'Greenhouse', 'site:greenhouse.io'),
  src('ATS', 'lever', 'Lever', 'site:lever.co'),
  src('ATS', 'ashby', 'Ashbyhq', 'site:jobs.ashbyhq.com'),
  src('ATS', 'needle', 'Needle', 'site:jobs.needle.so'),
  src('ATS', 'personio-com', 'Personio.com/job', 'site:https://*.personio.com/job'),
  src('ATS', 'personio-de', 'Personio.de/job', 'site:https://*.personio.de/job'),
  src('ATS', 'recruitee', 'Recruitee', 'site:recruitee.com'),
  src('ATS', 'breezy', 'Breezy', 'site:breezy.hr'),
  src('ATS', 'teamtailor', 'Teamtailor', 'site:teamtailor.com/jobs/*'),
  src('ATS', 'join', 'Join', 'site:join.com'),
  src('ATS', 'freshteam', 'Freshteam', 'site:freshteam.com/jobs'),
  src('ATS', 'applytojob', 'Applytojob', 'site:applytojob.com'),
  src('ATS', 'zohorecruit', 'Zoho Recruit', 'site:zohorecruit.com'),
  src('ATS', 'smartrecruiters', 'SmartRecruiters', 'site:jobs.smartrecruiters.com'),
  src('ATS', 'jobvite', 'Jobvite', 'site:jobvite.com'),
  src('ATS', 'gusto', 'Gusto', 'site:jobs.gusto.com'),
  src('ATS', 'trakstar', 'Trakstar', 'site:hire.trakstar.com/jobs/'),
  src('ATS', 'comeet', 'Comeet', 'site:comeet.com/jobs'),
  src('ATS', 'personio', 'Personio', 'site:jobs.personio.com/job'),
  src('ATS', 'rippling', 'Rippling ATS', 'site:rippling-ats.com'),
  src('ATS', 'careers-page', 'Careers-page', 'site:careers-page.com'),

  src('Careers', 'careers-com', '.com/careers', 'site:https://*.com/careers'),
  src('Careers', 'careers-co', '.co/careers', 'site:https://*.co/careers'),
  src('Careers', 'careers-org', '.org/careers', 'site:https://*.org/careers'),
  src('Careers', 'careers-de', '.de/careers', 'site:https://*.de/careers'),
  src('Careers', 'careers-io', '.io/careers', 'site:https://*.io/careers'),
  src('Careers', 'careers-ai', '.ai/careers', 'site:https://*.ai/careers'),
  src('Careers', 'careers-any', '*/careers', 'site:https://*/careers'),
  src('Careers', 'careers-sub-com', 'careers.*.com', 'site:https://careers.*.com'),
  src('Careers', 'careers-sub-co', 'careers.*.co', 'site:https://careers.*.co'),
  src('Careers', 'careers-sub-ai', 'careers.*.ai', 'site:https://careers.*.ai'),
  src('Careers', 'careers-sub-any', 'careers.*', 'site:https://careers.*'),
  src('Careers', 'careers-inurl', 'inurl:careers', 'inurl:careers'),

  src('Career', 'career-com', '.com/career', 'site:https://*.com/career'),
  src('Career', 'career-co', '.co/career', 'site:https://*.co/career'),
  src('Career', 'career-org', '.org/career', 'site:https://*.org/career'),
  src('Career', 'career-de', '.de/career', 'site:https://*.de/career'),
  src('Career', 'career-io', '.io/career', 'site:https://*.io/career'),
  src('Career', 'career-ai', '.ai/career', 'site:https://*.ai/career'),
  src('Career', 'career-any', '*/career', 'site:https://*/career'),
  src('Career', 'career-sub-com', 'career.*.com', 'site:https://career.*.com'),
  src('Career', 'career-sub-co', 'career.*.co', 'site:https://career.*.co'),
  src('Career', 'career-sub-org', 'career.*.org', 'site:https://career.*.org'),
  src('Career', 'career-sub-de', 'career.*.de', 'site:https://career.*.de'),
  src('Career', 'career-sub-io', 'career.*.io', 'site:https://career.*.io'),
  src('Career', 'career-sub-ai', 'career.*.ai', 'site:https://career.*.ai'),
  src('Career', 'career-sub-any', 'career.*', 'site:https://career.*'),
  src('Career', 'career-inurl', 'inurl:career', 'inurl:career'),

  src('Other', 'notion', 'Notion pages', 'site:https://*.notion.site/'),
  src('Other', 'hiring', 'inurl:hiring', 'inurl:hiring'),
];

/** Non-search bookmarks: job boards that are opened directly. */
export const DIRECT_BOARDS: DirectBoard[] = [
  { id: 'clubofcode', label: 'Club of Code', url: 'https://app.clubofcode.io/dashboard/search' },
  { id: 'functional-works', label: 'Functional Works', url: 'https://functional.works-hub.com/jobs/search' },
  { id: 'startupjobs', label: 'startupjobs', url: 'https://www.startupjobs.com/jobs' },
  { id: 'workinstartups', label: 'Work in startups', url: 'https://workinstartups.com/job-board/' },
  { id: 'tryremotely', label: 'tryremotely', url: 'https://tryremotely.com/jobs' },
  { id: 'remotefront', label: 'Remote jobs (remotefront)', url: 'https://www.remotefront.io/' },
  { id: 'startup-jobs-direct', label: 'startup jobs', url: 'https://startup.jobs/' },
];

/**
 * Public company boards that can be scanned without any search API key.
 * Boards discovered through Google results are added to this list automatically.
 */
export const SEED_BOARDS: { ats: AtsId; slug: string }[] = [
  ...['airbnb', 'stripe', 'figma', 'discord', 'gitlab', 'cloudflare', 'databricks', 'anthropic', 'reddit', 'dropbox', 'duolingo', 'vercel', 'datadog', 'coinbase'].map(
    (slug) => ({ ats: 'greenhouse' as const, slug }),
  ),
  ...['palantir', 'spotify'].map((slug) => ({ ats: 'lever' as const, slug })),
  ...['openai', 'notion', 'linear', 'ramp', 'posthog', 'supabase'].map((slug) => ({ ats: 'ashby' as const, slug })),
];

const linkedinRemote24h = (keywords: string, geoId: string) =>
  `https://www.linkedin.com/jobs/search/?${new URLSearchParams({ f_TPR: 'r86400', f_WT: '2', geoId, keywords, sortBy: 'DD' })}`;

/** Remote full-stack searches posted in the last 24h, newest first. */
export const SEED_LINKEDIN_SEARCHES: { label: string; url: string }[] = [
  { label: 'Philippines', url: linkedinRemote24h('full stack', '103121230') },
  { label: 'European Union', url: linkedinRemote24h('remote full stack', '91000000') },
  { label: 'Hong Kong', url: linkedinRemote24h('full stack', '100862922') },
  { label: 'Singapore', url: linkedinRemote24h('full stack', '103804675') },
  { label: 'Malaysia', url: linkedinRemote24h('full stack', '106808692') },
  { label: 'Thailand', url: linkedinRemote24h('full stack', '105146118') },
  { label: 'Indonesia', url: linkedinRemote24h('full stack', '102478259') },
  { label: 'Vietnam', url: linkedinRemote24h('full stack', '104195383') },
  ...(
    [
      ['United Kingdom', '101165590'],
      ['Germany', '101282230'],
      ['Spain', '105646813'],
      ['France', '105015875'],
      ['Poland', '105072130'],
      ['Romania', '106670623'],
      ['Portugal', '100364837'],
      ['Italy', '103350119'],
      ['Estonia', '102974008'],
      ['Ireland', '104738515'],
      ['Bulgaria', '105333783'],
      ['Malta', '100961908'],
      ['Netherlands', '102890719'],
      ['Belgium', '100565514'],
      ['Hungary', '100288700'],
      ['Croatia', '104688944'],
      ['Switzerland', '106693272'],
      ['Czechia', '104508036'],
      ['Denmark', '104514075'],
      ['Finland', '100456013'],
      ['India', '102713980'],
      ['Japan', '101355337'],
      ['Australia', '101452733'],
      ['New Zealand', '105490917'],
      ['United States', '103644278'],
      ['Canada', '101174742'],
      ['Mexico', '103323778'],
      ['Colombia', '100876405'],
      ['Argentina', '100446943'],
      ['Brazil', '106057199'],
      ['Chile', '104621616'],
    ] as const
  ).map(([label, geoId]) => ({ label, url: linkedinRemote24h('remote full stack', geoId) })),
];
