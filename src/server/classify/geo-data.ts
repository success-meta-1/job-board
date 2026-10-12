import type { RegionId } from '@/shared/types';

export const REGIONS: { id: RegionId; label: string }[] = [
  { id: 'north-america', label: 'North America' },
  { id: 'latam', label: 'Latin America & Caribbean' },
  { id: 'europe', label: 'Europe' },
  { id: 'middle-east', label: 'Middle East' },
  { id: 'africa', label: 'Africa' },
  { id: 'asia', label: 'Asia' },
  { id: 'oceania', label: 'Oceania' },
];

const REGION_KEYS: Record<string, RegionId> = {
  n: 'north-america',
  l: 'latam',
  e: 'europe',
  m: 'middle-east',
  f: 'africa',
  a: 'asia',
  o: 'oceania',
};

/** `ISO2|Name|region key|aliases separated by ;` */
const COUNTRY_TABLE = `
US|United States|n|USA;United States of America;America
CA|Canada|n|
MX|Mexico|l|México
GT|Guatemala|l|
BZ|Belize|l|
SV|El Salvador|l|
HN|Honduras|l|
NI|Nicaragua|l|
CR|Costa Rica|l|
PA|Panama|l|Panamá
CU|Cuba|l|
DO|Dominican Republic|l|
HT|Haiti|l|
JM|Jamaica|l|
TT|Trinidad and Tobago|l|Trinidad
BS|Bahamas|l|
BB|Barbados|l|
PR|Puerto Rico|l|
DM|Dominica|l|
LC|Saint Lucia|l|
GD|Grenada|l|
AG|Antigua and Barbuda|l|
KN|Saint Kitts and Nevis|l|
VC|Saint Vincent and the Grenadines|l|
CO|Colombia|l|
VE|Venezuela|l|
EC|Ecuador|l|
PE|Peru|l|Perú
BO|Bolivia|l|
BR|Brazil|l|Brasil
PY|Paraguay|l|
UY|Uruguay|l|
AR|Argentina|l|
CL|Chile|l|
GY|Guyana|l|
SR|Suriname|l|
GB|United Kingdom|e|Great Britain;Britain;England;Scotland;Wales;Northern Ireland
IE|Ireland|e|
FR|France|e|
DE|Germany|e|Deutschland
NL|Netherlands|e|The Netherlands;Holland
BE|Belgium|e|
LU|Luxembourg|e|
CH|Switzerland|e|Schweiz;Suisse
AT|Austria|e|Österreich
ES|Spain|e|España
PT|Portugal|e|
IT|Italy|e|Italia
GR|Greece|e|
MT|Malta|e|
CY|Cyprus|e|
SE|Sweden|e|Sverige
NO|Norway|e|Norge
DK|Denmark|e|Danmark
FI|Finland|e|Suomi
IS|Iceland|e|
EE|Estonia|e|
LV|Latvia|e|
LT|Lithuania|e|
PL|Poland|e|Polska
CZ|Czechia|e|Czech Republic
SK|Slovakia|e|
HU|Hungary|e|
RO|Romania|e|
BG|Bulgaria|e|
HR|Croatia|e|
SI|Slovenia|e|
RS|Serbia|e|
BA|Bosnia and Herzegovina|e|Bosnia
ME|Montenegro|e|
MK|North Macedonia|e|Macedonia
AL|Albania|e|
XK|Kosovo|e|
MD|Moldova|e|
UA|Ukraine|e|
BY|Belarus|e|
RU|Russia|e|Russian Federation
TR|Türkiye|e|Turkey;Turkiye
GE|Georgia|e|Sakartvelo
AM|Armenia|e|
AZ|Azerbaijan|e|
AD|Andorra|e|
MC|Monaco|e|
LI|Liechtenstein|e|
SM|San Marino|e|
AE|United Arab Emirates|m|Emirates
SA|Saudi Arabia|m|
QA|Qatar|m|
KW|Kuwait|m|
BH|Bahrain|m|
OM|Oman|m|
IL|Israel|m|
JO|Jordan|m|
LB|Lebanon|m|
IQ|Iraq|m|
IR|Iran|m|
SY|Syria|m|
YE|Yemen|m|
PS|Palestine|m|
EG|Egypt|f|
MA|Morocco|f|
DZ|Algeria|f|
TN|Tunisia|f|
LY|Libya|f|
NG|Nigeria|f|
GH|Ghana|f|
KE|Kenya|f|
ET|Ethiopia|f|
UG|Uganda|f|
TZ|Tanzania|f|
RW|Rwanda|f|
ZA|South Africa|f|
ZW|Zimbabwe|f|
ZM|Zambia|f|
MZ|Mozambique|f|
AO|Angola|f|
NA|Namibia|f|
BW|Botswana|f|
SN|Senegal|f|
CI|Côte d'Ivoire|f|Ivory Coast;Cote d'Ivoire
CM|Cameroon|f|
MU|Mauritius|f|
SD|Sudan|f|
SS|South Sudan|f|
MG|Madagascar|f|
ML|Mali|f|
NE|Niger|f|
BF|Burkina Faso|f|
BJ|Benin|f|
TG|Togo|f|
GN|Guinea|f|
SL|Sierra Leone|f|
LR|Liberia|f|
CD|DR Congo|f|Democratic Republic of the Congo;DRC
CG|Republic of the Congo|f|Congo
GA|Gabon|f|
MW|Malawi|f|
SO|Somalia|f|
ER|Eritrea|f|
DJ|Djibouti|f|
CV|Cape Verde|f|Cabo Verde
SC|Seychelles|f|
LS|Lesotho|f|
SZ|Eswatini|f|Swaziland
GM|Gambia|f|
GW|Guinea-Bissau|f|
GQ|Equatorial Guinea|f|
CF|Central African Republic|f|
TD|Chad|f|
MR|Mauritania|f|
BI|Burundi|f|
CN|China|a|
HK|Hong Kong|a|
TW|Taiwan|a|
MO|Macau|a|Macao
JP|Japan|a|
KR|South Korea|a|Korea;Republic of Korea
KP|North Korea|a|
MN|Mongolia|a|
IN|India|a|
PK|Pakistan|a|
BD|Bangladesh|a|
LK|Sri Lanka|a|
NP|Nepal|a|
BT|Bhutan|a|
MV|Maldives|a|
AF|Afghanistan|a|
SG|Singapore|a|
MY|Malaysia|a|
ID|Indonesia|a|
TH|Thailand|a|
VN|Vietnam|a|Viet Nam
PH|Philippines|a|
KH|Cambodia|a|
LA|Laos|a|
MM|Myanmar|a|Burma
BN|Brunei|a|
TL|Timor-Leste|a|East Timor
KZ|Kazakhstan|a|
UZ|Uzbekistan|a|
KG|Kyrgyzstan|a|
TJ|Tajikistan|a|
TM|Turkmenistan|a|
AU|Australia|o|
NZ|New Zealand|o|Aotearoa
FJ|Fiji|o|
PG|Papua New Guinea|o|
WS|Samoa|o|
TO|Tonga|o|
VU|Vanuatu|o|
SB|Solomon Islands|o|
`;

export interface CountryRecord {
  code: string;
  name: string;
  region: RegionId;
  aliases: string[];
}

export const COUNTRIES: CountryRecord[] = COUNTRY_TABLE.trim()
  .split('\n')
  .map((line) => {
    const [code, name, regionKey, aliases] = line.split('|');
    return {
      code,
      name,
      region: REGION_KEYS[regionKey],
      aliases: aliases ? aliases.split(';').filter(Boolean) : [],
    };
  });

export const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** Common ISO 3166-1 alpha-3 codes seen in structured job data. */
export const ISO3_TO_ISO2: Record<string, string> = {
  USA: 'US', CAN: 'CA', MEX: 'MX', BRA: 'BR', ARG: 'AR', COL: 'CO', CHL: 'CL', PER: 'PE', URY: 'UY',
  GBR: 'GB', IRL: 'IE', FRA: 'FR', DEU: 'DE', NLD: 'NL', BEL: 'BE', LUX: 'LU', CHE: 'CH', AUT: 'AT',
  ESP: 'ES', PRT: 'PT', ITA: 'IT', GRC: 'GR', SWE: 'SE', NOR: 'NO', DNK: 'DK', FIN: 'FI', ISL: 'IS',
  EST: 'EE', LVA: 'LV', LTU: 'LT', POL: 'PL', CZE: 'CZ', SVK: 'SK', HUN: 'HU', ROU: 'RO', BGR: 'BG',
  HRV: 'HR', SVN: 'SI', SRB: 'RS', UKR: 'UA', TUR: 'TR', CYP: 'CY', MLT: 'MT', ARE: 'AE', SAU: 'SA',
  ISR: 'IL', QAT: 'QA', EGY: 'EG', NGA: 'NG', KEN: 'KE', ZAF: 'ZA', GHA: 'GH', MAR: 'MA', IND: 'IN',
  PAK: 'PK', BGD: 'BD', LKA: 'LK', CHN: 'CN', HKG: 'HK', TWN: 'TW', JPN: 'JP', KOR: 'KR', SGP: 'SG',
  MYS: 'MY', IDN: 'ID', THA: 'TH', VNM: 'VN', PHL: 'PH', AUS: 'AU', NZL: 'NZ', RUS: 'RU', BLR: 'BY',
  GEO: 'GE', ARM: 'AM', KAZ: 'KZ',
};

/** Unambiguous upper-case tokens (matched case-sensitively). */
export const COUNTRY_TOKENS: Record<string, string> = {
  US: 'US', USA: 'US', 'U.S.': 'US', 'U.S.A.': 'US', 'U.S': 'US',
  UK: 'GB', 'U.K.': 'GB', UAE: 'AE', 'U.A.E.': 'AE', KSA: 'SA', NYC: 'US', CDMX: 'MX',
};

export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

export const CA_PROVINCES: Record<string, string> = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick', NL: 'Newfoundland',
  NS: 'Nova Scotia', NT: 'Northwest Territories', NU: 'Nunavut', ON: 'Ontario',
  PE: 'Prince Edward Island', QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon',
};

/** Sub-national names that identify a country on their own. */
export const SUBDIVISIONS: Record<string, string> = {
  ...Object.fromEntries(Object.values(US_STATES).map((s) => [s, 'US'])),
  ...Object.fromEntries(Object.values(CA_PROVINCES).map((s) => [s, 'CA'])),
  'Washington DC': 'US', 'Washington, DC': 'US', 'Washington D.C.': 'US', 'Washington, D.C.': 'US',
  'Québec': 'CA',
  'New South Wales': 'AU', NSW: 'AU', Queensland: 'AU', 'Western Australia': 'AU',
  'South Australia': 'AU', Tasmania: 'AU',
  Bavaria: 'DE', Bayern: 'DE', Catalonia: 'ES', Catalunya: 'ES', Lombardy: 'IT',
  'Île-de-France': 'FR', Karnataka: 'IN', Maharashtra: 'IN', Telangana: 'IN', 'Tamil Nadu': 'IN',
};

/** Tech hubs and large cities. Matched case-sensitively. */
const CITY_TABLE: Record<string, string> = {
  US: 'New York;San Francisco;Bay Area;SF Bay Area;Silicon Valley;Los Angeles;Seattle;Austin;Boston;Chicago;Denver;Atlanta;Miami;Dallas;Houston;San Diego;San Jose;Palo Alto;Mountain View;Menlo Park;Sunnyvale;Redwood City;Oakland;Philadelphia;Pittsburgh;Phoenix;Salt Lake City;Minneapolis;Detroit;Nashville;Raleigh;Charlotte;Baltimore;Columbus;Cincinnati;Cleveland;Indianapolis;St. Louis;Kansas City;Las Vegas;Orlando;Tampa;Boulder;Brooklyn;Manhattan;Jersey City;Irvine;Santa Monica;Santa Clara;Cupertino;San Mateo;Bellevue;Redmond;Kirkland;Arlington;Durham;Ann Arbor;Madison;Omaha;Sacramento;Honolulu;Anchorage',
  CA: 'Toronto;Vancouver;Montreal;Montréal;Ottawa;Calgary;Edmonton;Waterloo;Kitchener;Quebec City;Winnipeg;Halifax;Mississauga;Victoria, BC',
  MX: 'Mexico City;Ciudad de México;Guadalajara;Monterrey;Querétaro;Tijuana',
  BR: 'São Paulo;Sao Paulo;Rio de Janeiro;Belo Horizonte;Florianópolis;Florianopolis;Curitiba;Porto Alegre;Recife;Brasília;Campinas',
  AR: 'Buenos Aires;Rosario;Mendoza',
  CO: 'Bogotá;Bogota;Medellín;Medellin;Barranquilla',
  CL: 'Santiago de Chile;Santiago;Valparaíso',
  PE: 'Lima',
  UY: 'Montevideo',
  CR: 'San José, Costa Rica',
  GB: 'London;Manchester;Edinburgh;Glasgow;Bristol;Birmingham;Leeds;Liverpool;Cambridge;Oxford;Belfast;Cardiff;Newcastle;Sheffield;Nottingham;Brighton;Milton Keynes',
  IE: 'Dublin;Cork;Galway;Limerick',
  FR: 'Paris;Lyon;Marseille;Toulouse;Nantes;Bordeaux;Lille;Montpellier;Grenoble;Sophia Antipolis',
  DE: 'Berlin;Munich;München;Hamburg;Frankfurt;Cologne;Köln;Stuttgart;Düsseldorf;Dusseldorf;Leipzig;Dresden;Nuremberg;Nürnberg;Hanover;Hannover;Karlsruhe;Bonn;Heidelberg;Mannheim',
  NL: 'Amsterdam;Rotterdam;Utrecht;The Hague;Den Haag;Eindhoven;Delft;Groningen',
  BE: 'Brussels;Bruxelles;Antwerp;Antwerpen;Ghent;Gent;Leuven',
  CH: 'Zurich;Zürich;Geneva;Genève;Basel;Lausanne;Bern;Zug',
  AT: 'Vienna;Wien;Graz;Linz;Salzburg;Innsbruck',
  ES: 'Madrid;Barcelona;Valencia;Seville;Sevilla;Málaga;Malaga;Bilbao;Zaragoza',
  PT: 'Lisbon;Lisboa;Porto;Braga;Coimbra',
  IT: 'Milan;Milano;Rome;Roma;Turin;Torino;Bologna;Florence;Firenze;Naples;Napoli',
  GR: 'Athens;Thessaloniki',
  SE: 'Stockholm;Gothenburg;Göteborg;Malmö;Malmo;Uppsala',
  NO: 'Oslo;Bergen;Trondheim',
  DK: 'Copenhagen;København;Aarhus',
  FI: 'Helsinki;Espoo;Tampere;Oulu',
  IS: 'Reykjavik;Reykjavík',
  EE: 'Tallinn;Tartu',
  LV: 'Riga',
  LT: 'Vilnius;Kaunas',
  PL: 'Warsaw;Warszawa;Kraków;Krakow;Cracow;Wrocław;Wroclaw;Gdańsk;Gdansk;Poznań;Poznan;Łódź;Lodz;Katowice',
  CZ: 'Prague;Praha;Brno',
  SK: 'Bratislava;Košice',
  HU: 'Budapest;Debrecen',
  RO: 'Bucharest;București;Cluj-Napoca;Cluj;Iași;Iasi;Timișoara;Timisoara;Brașov',
  BG: 'Sofia;Plovdiv;Varna',
  HR: 'Zagreb',
  SI: 'Ljubljana',
  RS: 'Belgrade;Beograd;Novi Sad',
  UA: 'Kyiv;Kiev;Lviv;Kharkiv;Odesa;Odessa;Dnipro',
  TR: 'Istanbul;İstanbul;Ankara;Izmir;İzmir',
  CY: 'Limassol;Nicosia;Larnaca',
  MT: 'Valletta',
  AM: 'Yerevan',
  GE: 'Tbilisi;Batumi',
  BY: 'Minsk',
  RU: 'Moscow;Saint Petersburg;Novosibirsk',
  MD: 'Chișinău;Chisinau',
  BA: 'Sarajevo',
  MK: 'Skopje',
  AL: 'Tirana',
  AE: 'Dubai;Abu Dhabi;Sharjah',
  SA: 'Riyadh;Jeddah;Dammam',
  QA: 'Doha',
  IL: 'Tel Aviv;Tel Aviv-Yafo;Jerusalem;Haifa;Herzliya',
  JO: 'Amman',
  LB: 'Beirut',
  BH: 'Manama',
  KW: 'Kuwait City',
  OM: 'Muscat',
  EG: 'Cairo;Alexandria',
  NG: 'Lagos;Abuja',
  KE: 'Nairobi',
  ZA: 'Cape Town;Johannesburg;Pretoria;Durban',
  GH: 'Accra',
  RW: 'Kigali',
  MA: 'Casablanca;Rabat',
  TN: 'Tunis',
  UG: 'Kampala',
  ET: 'Addis Ababa',
  TZ: 'Dar es Salaam',
  DZ: 'Algiers',
  CN: 'Beijing;Shanghai;Shenzhen;Guangzhou;Hangzhou;Chengdu',
  TW: 'Taipei',
  JP: 'Tokyo;Osaka;Kyoto;Fukuoka',
  KR: 'Seoul;Busan',
  IN: 'Bangalore;Bengaluru;Mumbai;New Delhi;Delhi;Hyderabad;Chennai;Pune;Gurgaon;Gurugram;Noida;Kolkata;Ahmedabad;Kochi',
  PK: 'Karachi;Lahore;Islamabad',
  BD: 'Dhaka',
  LK: 'Colombo',
  NP: 'Kathmandu',
  SG: 'Singapore',
  MY: 'Kuala Lumpur;Penang',
  ID: 'Jakarta;Bali;Bandung;Surabaya',
  TH: 'Bangkok;Chiang Mai',
  VN: 'Ho Chi Minh City;Saigon;Hanoi;Da Nang',
  PH: 'Manila;Makati;Cebu;Taguig;Quezon City',
  KH: 'Phnom Penh',
  KZ: 'Almaty;Astana',
  UZ: 'Tashkent',
  KG: 'Bishkek',
  MN: 'Ulaanbaatar',
  AU: 'Sydney;Melbourne;Brisbane;Perth;Adelaide;Canberra;Gold Coast',
  NZ: 'Auckland;Wellington;Christchurch',
};

export const CITIES: Record<string, string> = Object.fromEntries(
  Object.entries(CITY_TABLE).flatMap(([code, list]) => list.split(';').map((city) => [city, code])),
);

/** Cities whose name also exists in the US; a trailing US state code wins. */
export const AMBIGUOUS_CITIES = new Set(['Cambridge', 'Birmingham', 'Paris', 'London', 'Valencia', 'Santiago', 'Arlington', 'Durham', 'Victoria', 'Waterloo', 'Saint Petersburg', 'Columbus']);

/** Country names that collide with a US state; only aliases/cities identify them. */
export const NAME_MATCH_EXCLUDED = new Set(['GE']);

export interface AreaPhrase {
  phrase: string;
  caseSensitive?: boolean;
  /** Too generic to trust in free text (titles/snippets); only used on location fields. */
  weak?: boolean;
  regions?: RegionId[];
  countries?: string[];
  worldwide?: boolean;
}

/** Multi-country areas commonly used in remote job postings. */
export const AREA_PHRASES: AreaPhrase[] = [
  ...['Worldwide', 'Anywhere', 'Work from anywhere', 'Fully distributed'].map((phrase) => ({ phrase, worldwide: true })),
  ...['Global', 'Globally', 'Any location', 'International'].map((phrase) => ({ phrase, worldwide: true, weak: true })),
  { phrase: 'North America', regions: ['north-america'] },
  { phrase: 'Americas', regions: ['north-america', 'latam'] },
  { phrase: 'Latin America', regions: ['latam'] },
  { phrase: 'South America', regions: ['latam'] },
  { phrase: 'Central America', regions: ['latam'] },
  { phrase: 'Caribbean', regions: ['latam'] },
  { phrase: 'LATAM', regions: ['latam'] },
  { phrase: 'LatAm', regions: ['latam'], caseSensitive: true },
  { phrase: 'Europe', regions: ['europe'] },
  { phrase: 'European Union', regions: ['europe'] },
  { phrase: 'European', regions: ['europe'], weak: true },
  { phrase: 'EU', regions: ['europe'], caseSensitive: true },
  { phrase: 'EEA', regions: ['europe'], caseSensitive: true },
  { phrase: 'CET', regions: ['europe'], caseSensitive: true, weak: true },
  { phrase: 'CEST', regions: ['europe'], caseSensitive: true, weak: true },
  { phrase: 'CEE', regions: ['europe'], caseSensitive: true },
  { phrase: 'EMEA', regions: ['europe', 'middle-east', 'africa'] },
  { phrase: 'MENA', regions: ['middle-east', 'africa'] },
  { phrase: 'Middle East', regions: ['middle-east'] },
  { phrase: 'GCC', regions: ['middle-east'], caseSensitive: true },
  { phrase: 'Africa', regions: ['africa'] },
  { phrase: 'APAC', regions: ['asia', 'oceania'] },
  { phrase: 'Asia Pacific', regions: ['asia', 'oceania'] },
  { phrase: 'Asia-Pacific', regions: ['asia', 'oceania'] },
  { phrase: 'Southeast Asia', regions: ['asia'] },
  { phrase: 'SEA', regions: ['asia'], caseSensitive: true, weak: true },
  { phrase: 'Asia', regions: ['asia'] },
  { phrase: 'Oceania', regions: ['oceania'] },
  { phrase: 'ANZ', countries: ['AU', 'NZ'], caseSensitive: true },
  { phrase: 'Nordics', countries: ['SE', 'NO', 'DK', 'FI', 'IS'] },
  { phrase: 'Nordic', countries: ['SE', 'NO', 'DK', 'FI', 'IS'] },
  { phrase: 'Scandinavia', countries: ['SE', 'NO', 'DK'] },
  { phrase: 'DACH', countries: ['DE', 'AT', 'CH'], caseSensitive: true },
  { phrase: 'Benelux', countries: ['BE', 'NL', 'LU'] },
  { phrase: 'Baltics', countries: ['EE', 'LV', 'LT'] },
  { phrase: 'UK&I', countries: ['GB', 'IE'], caseSensitive: true },
];
