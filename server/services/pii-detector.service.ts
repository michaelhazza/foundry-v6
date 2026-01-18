import nlp from 'compromise';

export interface PiiDetectionResult {
  text: string;
  piiMappings: Record<string, string>;
  counts: {
    names: number;
    emails: number;
    phones: number;
    companies: number;
    addresses: number;
  };
}

export interface DetectionOptions {
  detectNames: boolean;
  detectEmails: boolean;
  detectPhones: boolean;
  detectCompanies: boolean;
  detectAddresses: boolean;
}

// Counters for generating unique placeholders
let nameCounter = 0;
let emailCounter = 0;
let phoneCounter = 0;
let companyCounter = 0;
let addressCounter = 0;

/**
 * Reset counters (call at the start of each processing run)
 */
export function resetCounters(): void {
  nameCounter = 0;
  emailCounter = 0;
  phoneCounter = 0;
  companyCounter = 0;
  addressCounter = 0;
}

// Regex patterns for PII detection
const patterns = {
  // Email pattern
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone patterns (various formats)
  phone: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,

  // US/UK/Australian phone extensions
  phoneWithExt: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}(?:\s*(?:ext|x|extension)[.\s]*\d{1,5})?\b/gi,

  // Street address pattern (simplified)
  streetAddress: /\b\d{1,5}\s+(?:[A-Za-z]+\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir|Way|Place|Pl)\b\.?/gi,

  // Zip code patterns
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,
};

// Common company suffixes
const companySuffixes = [
  'Inc', 'Inc.', 'LLC', 'L.L.C.', 'Ltd', 'Ltd.', 'Limited',
  'Corp', 'Corp.', 'Corporation', 'Co', 'Co.', 'Company',
  'LLP', 'L.L.P.', 'LP', 'L.P.', 'PLC', 'plc',
  'GmbH', 'AG', 'SA', 'NV', 'BV', 'Pty',
];

const companySuffixPattern = new RegExp(
  `\\b([A-Z][A-Za-z0-9\\s&'-]+)\\s+(${companySuffixes.join('|')})\\b`,
  'g'
);

/**
 * Detect and replace names using NLP
 */
function detectNames(text: string, mappings: Record<string, string>): string {
  const doc = nlp(text);
  const people = doc.people().out('array') as string[];

  for (const name of people) {
    if (name.length < 2) continue;
    if (mappings[name]) continue;

    nameCounter++;
    const placeholder = `[PERSON_${nameCounter}]`;
    mappings[name] = placeholder;
  }

  // Replace in text
  let result = text;
  for (const [original, placeholder] of Object.entries(mappings)) {
    if (placeholder.startsWith('[PERSON_')) {
      result = result.split(original).join(placeholder);
    }
  }

  return result;
}

/**
 * Detect and replace emails
 */
function detectEmails(text: string, mappings: Record<string, string>): string {
  const emails = text.match(patterns.email) || [];

  for (const email of emails) {
    if (mappings[email]) continue;

    emailCounter++;
    const placeholder = `[EMAIL_${emailCounter}]`;
    mappings[email] = placeholder;
  }

  let result = text;
  for (const [original, placeholder] of Object.entries(mappings)) {
    if (placeholder.startsWith('[EMAIL_')) {
      result = result.split(original).join(placeholder);
    }
  }

  return result;
}

/**
 * Detect and replace phone numbers
 */
function detectPhones(text: string, mappings: Record<string, string>): string {
  const phones = text.match(patterns.phoneWithExt) || [];

  for (const phone of phones) {
    if (mappings[phone]) continue;

    phoneCounter++;
    const placeholder = `[PHONE_${phoneCounter}]`;
    mappings[phone] = placeholder;
  }

  let result = text;
  for (const [original, placeholder] of Object.entries(mappings)) {
    if (placeholder.startsWith('[PHONE_')) {
      result = result.split(original).join(placeholder);
    }
  }

  return result;
}

/**
 * Detect and replace company names
 */
function detectCompanies(text: string, mappings: Record<string, string>): string {
  const doc = nlp(text);
  const orgs = doc.organizations().out('array') as string[];

  for (const org of orgs) {
    if (org.length < 2) continue;
    if (mappings[org]) continue;

    companyCounter++;
    const placeholder = `[COMPANY_${companyCounter}]`;
    mappings[org] = placeholder;
  }

  // Also check for company suffix patterns
  let match;
  while ((match = companySuffixPattern.exec(text)) !== null) {
    const company = match[0];
    if (mappings[company]) continue;

    companyCounter++;
    const placeholder = `[COMPANY_${companyCounter}]`;
    mappings[company] = placeholder;
  }

  let result = text;
  for (const [original, placeholder] of Object.entries(mappings)) {
    if (placeholder.startsWith('[COMPANY_')) {
      result = result.split(original).join(placeholder);
    }
  }

  return result;
}

/**
 * Detect and replace addresses
 */
function detectAddresses(text: string, mappings: Record<string, string>): string {
  const addresses = text.match(patterns.streetAddress) || [];

  for (const address of addresses) {
    if (mappings[address]) continue;

    addressCounter++;
    const placeholder = `[ADDRESS_${addressCounter}]`;
    mappings[address] = placeholder;
  }

  let result = text;
  for (const [original, placeholder] of Object.entries(mappings)) {
    if (placeholder.startsWith('[ADDRESS_')) {
      result = result.split(original).join(placeholder);
    }
  }

  return result;
}

/**
 * Count PII by type from mappings
 */
function countPii(mappings: Record<string, string>): PiiDetectionResult['counts'] {
  let names = 0;
  let emails = 0;
  let phones = 0;
  let companies = 0;
  let addresses = 0;

  for (const placeholder of Object.values(mappings)) {
    if (placeholder.startsWith('[PERSON_')) names++;
    else if (placeholder.startsWith('[EMAIL_')) emails++;
    else if (placeholder.startsWith('[PHONE_')) phones++;
    else if (placeholder.startsWith('[COMPANY_')) companies++;
    else if (placeholder.startsWith('[ADDRESS_')) addresses++;
  }

  return { names, emails, phones, companies, addresses };
}

/**
 * Detect and replace PII in text
 */
export function detectAndReplacePii(
  text: string,
  options: DetectionOptions,
  existingMappings: Record<string, string> = {}
): PiiDetectionResult {
  let result = text;
  const mappings = { ...existingMappings };

  // Order matters: detect emails and phones first (more specific patterns)
  // before names (more general NLP-based)

  if (options.detectEmails) {
    result = detectEmails(result, mappings);
  }

  if (options.detectPhones) {
    result = detectPhones(result, mappings);
  }

  if (options.detectNames) {
    result = detectNames(result, mappings);
  }

  if (options.detectCompanies) {
    result = detectCompanies(result, mappings);
  }

  if (options.detectAddresses) {
    result = detectAddresses(result, mappings);
  }

  return {
    text: result,
    piiMappings: mappings,
    counts: countPii(mappings),
  };
}

/**
 * Process a conversation (array of messages)
 */
export function processConversation(
  messages: Array<{ role: string; content: string }>,
  options: DetectionOptions
): {
  messages: Array<{ role: string; content: string }>;
  piiMappings: Record<string, string>;
  counts: PiiDetectionResult['counts'];
} {
  const allMappings: Record<string, string> = {};
  const processedMessages: Array<{ role: string; content: string }> = [];

  for (const message of messages) {
    const result = detectAndReplacePii(message.content, options, allMappings);
    processedMessages.push({
      role: message.role,
      content: result.text,
    });
    Object.assign(allMappings, result.piiMappings);
  }

  return {
    messages: processedMessages,
    piiMappings: allMappings,
    counts: countPii(allMappings),
  };
}
