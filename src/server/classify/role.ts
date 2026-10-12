import type { RoleCategory, Seniority } from '@/shared/types';

/** Evaluated in order against the job title; first match wins. */
const ROLE_RULES: [RoleCategory, RegExp][] = [
  ['Eng. Management', /\b(?:engineering|development|software) manager\b|\bhead of (?:engineering|technology|development)\b|\bdirector,? (?:of )?engineering\b|\bvp,? (?:of )?engineering\b|\bcto\b|\bchief technology/i],
  ['Product', /\bproduct (?:manager|owner|lead)\b|\btechnical program manager\b|\bprogram manager\b/i],
  ['Design', /\bdesigner\b|\bux researcher\b|\bdesign lead\b/i],
  ['Security', /\bsecurity\b|\bappsec\b|\bdevsecops\b|\bpenetration\b|\binfosec\b|\bcyber/i],
  ['AI / ML', /\bmachine learning\b|\bML\b|\bAI\b|\bdeep learning\b|\bLLM\b|\bNLP\b|\bcomputer vision\b|\bdata scientist\b|\bapplied scientist\b|\bresearch (?:scientist|engineer)\b/i],
  ['Data', /\bdata (?:engineer|analyst|platform|infrastructure|architect)\b|\banalytics engineer\b|\bbusiness intelligence\b|\bBI (?:developer|engineer|analyst)\b|\bETL\b|\bdatabase\b|\bDBA\b/i],
  ['DevOps / SRE', /\bdevops\b|\bSRE\b|\bsite reliability\b|\bplatform engineer|\binfrastructure\b|\bcloud (?:engineer|architect)\b|\bsystems? (?:engineer|administrator)\b|\breliability\b|\bnetwork engineer\b/i],
  ['Mobile', /\bios\b|\bandroid\b|\bmobile\b|\bflutter\b|\breact native\b|\bswift\b/i],
  ['QA / Test', /\bQA\b|\bquality (?:assurance|engineer)\b|\btest (?:engineer|automation|analyst)\b|\bSDET\b|\bautomation engineer\b|\btester\b/i],
  ['Embedded', /\bembedded\b|\bfirmware\b|\bFPGA\b|\bhardware\b|\brobotics\b|\belectrical engineer\b/i],
  ['Blockchain', /\bblockchain\b|\bweb3\b|\bsolidity\b|\bsmart contracts?\b|\bcrypto\b|\bdefi\b/i],
  ['Game', /\bgame(?:play)?\b|\bunity\b|\bunreal\b/i],
  ['Full-stack', /\bfull[\s-]?stack\b/i],
  ['Frontend', /\bfront[\s-]?end\b|\bUI (?:engineer|developer)\b|\bUX engineer\b|\bweb developer\b|\breact\b|\bangular\b|\bvue\b|\bjavascript (?:developer|engineer)\b/i],
  ['Backend', /\bback[\s-]?end\b|\bserver[\s-]side\b|\bAPI (?:engineer|developer)\b|\bgolang\b|\bgo (?:engineer|developer)\b|\bjava (?:engineer|developer)\b|\bpython (?:engineer|developer)\b|\bnode(?:\.?js)? (?:engineer|developer)\b|\bruby\b|\bphp\b|\.net\b|\brails\b|\bdjango\b|\bscala\b|\belixir\b|\brust\b/i],
  ['Software Engineer', /\bsoftware\b|\bdeveloper\b|\bengineer\b|\bprogrammer\b|\bSWE\b|\bcoder\b/i],
];

export function classifyRole(title: string): RoleCategory {
  return ROLE_RULES.find(([, re]) => re.test(title))?.[0] ?? 'Other';
}

const SENIORITY_RULES: [Seniority, RegExp][] = [
  ['Intern', /\bintern(?:ship)?\b|\btrainee\b|\bworking student\b|\bwerkstudent\b|\bapprentice/i],
  ['Staff / Principal', /\bstaff\b|\bprincipal\b|\bdistinguished\b|\bfellow\b/i],
  ['Manager', /\b(?:engineering|development|software) manager\b|\bdirector\b|\bhead of\b|\bvp\b|\bvice president\b|\bchief\b|\bcto\b/i],
  ['Lead', /\blead\b|\btech lead\b|\bteam lead\b/i],
  ['Senior', /\bsenior\b|\bsr\.?(?=\s|$)|\bIII\b|\bIV\b|\bexpert\b/i],
  ['Junior', /\bjunior\b|\bjr\.?(?=\s|$)|\bentry[\s-]level\b|\bgraduate\b|\bnew grad\b|\bassociate\b|(?:engineer|developer) I\b(?!I)/i],
  ['Mid', /\bmid[\s-]?(?:level|senior)?\b|\bintermediate\b|\bII\b/i],
  ['Staff / Principal', /\barchitect\b/i],
];

export function classifySeniority(title: string): Seniority {
  return SENIORITY_RULES.find(([, re]) => re.test(title))?.[0] ?? 'Unspecified';
}
