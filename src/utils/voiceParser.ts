import { Product } from '../types';

export interface ParsedVoiceItem {
  action: 'add' | 'remove' | 'clear';
  rawQuery: string;
  product?: Product;
  quantity: number;
  unit?: string;
  confidence: number;
  error?: string;
}

export interface VoiceParseResult {
  rawTranscript: string;
  items: ParsedVoiceItem[];
  hasClearCommand: boolean;
}

// Convert Devanagari numerals (०, १, २, ३, ४, ५, ६, ७, ८, ९) to standard ASCII digits (0-9)
export function normalizeDevanagariDigits(str: string): string {
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return str.replace(/[०-९]/g, (ch) => String(devanagariDigits.indexOf(ch)));
}

// Hindi & English numeric word maps
const NUMBER_MAP: Record<string, number> = {
  // English
  'one': 1,
  'two': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'six': 6,
  'seven': 7,
  'eight': 8,
  'nine': 9,
  'ten': 10,
  'eleven': 11,
  'twelve': 12,
  'dozen': 12,
  'half': 0.5,
  'quarter': 0.25,

  // Hindi (Latin script / Hinglish)
  'ek': 1,
  'aik': 1,
  'do': 2,
  'doo': 2,
  'teen': 3,
  'tin': 3,
  'chaar': 4,
  'char': 4,
  'paanch': 5,
  'panch': 5,
  'chheh': 6,
  'che': 6,
  'chhe': 6,
  'saat': 7,
  'sat': 7,
  'aath': 8,
  'ath': 8,
  'nau': 9,
  'das': 10,
  'gyarah': 11,
  'barah': 12,
  'darjan': 12,
  'aadha': 0.5,
  'adha': 0.5,
  'pao': 0.25,
  'paav': 0.25,
  'dedh': 1.5,
  'deydh': 1.5,
  'derh': 1.5,
  'dhai': 2.5,
  'dhayi': 2.5,
  'sawwa': 1.25,
  'sawa': 1.25,

  // Devanagari Hindi
  'एक': 1,
  'दो': 2,
  'तीन': 3,
  'चार': 4,
  'पांच': 5,
  'पाँच': 5,
  'छह': 6,
  'छः': 6,
  'सात': 7,
  'आठ': 8,
  'नौ': 9,
  'दस': 10,
  'ग्यारह': 11,
  'बारह': 12,
  'दर्जन': 12,
  'आधा': 0.5,
  'पाव': 0.25,
  'डेढ़': 1.5,
  'ढाई': 2.5,
  'सवा': 1.25,
};

// Unit aliases
const UNIT_ALIASES: Record<string, string> = {
  'kg': 'Kg',
  'kilo': 'Kg',
  'kilos': 'Kg',
  'kilogram': 'Kg',
  'kilograms': 'Kg',
  'किलो': 'Kg',
  'किग्रा': 'Kg',

  'gram': 'Gram',
  'grams': 'Gram',
  'gm': 'Gram',
  'gms': 'Gram',
  'g': 'Gram',
  'ग्राम': 'Gram',

  'liter': 'Ltr',
  'liters': 'Ltr',
  'litre': 'Ltr',
  'litres': 'Ltr',
  'ltr': 'Ltr',
  'l': 'Ltr',
  'लीटर': 'Ltr',

  'packet': 'Pack',
  'packets': 'Pack',
  'pack': 'Pack',
  'packs': 'Pack',
  'pkt': 'Pack',
  'pkts': 'Pack',
  'पैकेट': 'Pack',
  'पैक': 'Pack',

  'piece': 'Pcs',
  'pieces': 'Pcs',
  'pcs': 'Pcs',
  'pc': 'Pcs',
  'पीस': 'Pcs',
  'नग': 'Pcs',

  'bottle': 'Box',
  'bottles': 'Box',
  'बोतल': 'Box',

  'box': 'Box',
  'boxes': 'Box',
  'डिब्बा': 'Box',
  'बॉक्स': 'Box',
};

// Remove / delete action keywords
const REMOVE_KEYWORDS = [
  'hatao', 'hata do', 'hata de', 'hata dena', 'hata',
  'remove', 'delete', 'minus', 'nikal do', 'nikalo', 'kam karo',
  'हटाओ', 'हटा दो', 'हटा दें', 'हटाएं', 'निकालो', 'कम करो'
];

// Clear entire cart keywords
const CLEAR_KEYWORDS = [
  'clear cart', 'cart clear', 'khali karo', 'cart khali', 'pura hatao', 'reset cart',
  'कार्ट खाली करो', 'सब हटा दो', 'साफ करो', 'कार्ट साफ'
];

// Noise words to strip from item search
const NOISE_WORDS = new Set([
  'add', 'jodo', 'jod', 'dalo', 'daalo', 'dal', 'rakho', 'karo', 'kardo', 'kar', 'do', 'de', 'dena',
  'lagao', 'lgao', 'chahiye', 'mangta', 'mangti', 'plz', 'please', 'aur', 'and', 'bhi', 'plus',
  'saath', 'sath', 'me', 'mein', 'ka', 'ki', 'ke', 'ko', 'se', 'hai', 'hain', 'jo', 'woh',
  'thoda', 'jara', 'zara',
  'जोड़ो', 'जोड़', 'डालो', 'डाल', 'रखो', 'करो', 'कर', 'दो', 'दे', 'चाहिए', 'और', 'भी', 'का', 'की', 'के', 'में', 'लगाओ'
]);

// Bilingual synonyms dictionary: maps common query terms to words found in catalog names/nameHi
const PRODUCT_SYNONYMS: Record<string, string[]> = {
  // Groceries & Staples
  'maggi': ['maggi', 'maggie', 'noodles', 'मैगी', 'नूडल्स'],
  'maggie': ['maggi', 'maggie', 'noodles', 'मैगी', 'नूडल्स'],
  'noodles': ['maggi', 'maggie', 'noodles', 'मैगी', 'नूडल्स'],
  'मैगी': ['maggi', 'maggie', 'noodles', 'मैगी', 'नूडल्स'],
  'नूडल्स': ['maggi', 'maggie', 'noodles', 'मैगी', 'नूडल्स'],

  'sugar': ['sugar', 'cheeni', 'shakkar', 'chini', 'चीनी', 'शक्कर', 'madhur'],
  'cheeni': ['sugar', 'cheeni', 'shakkar', 'chini', 'चीनी', 'शक्कर', 'madhur'],
  'shakkar': ['sugar', 'cheeni', 'shakkar', 'chini', 'चीनी', 'शक्कर', 'madhur'],
  'chini': ['sugar', 'cheeni', 'shakkar', 'chini', 'चीनी', 'शक्कर', 'madhur'],
  'चीनी': ['sugar', 'cheeni', 'shakkar', 'chini', 'चीनी', 'शक्कर', 'madhur'],
  'शक्कर': ['sugar', 'cheeni', 'shakkar', 'chini', 'चीनी', 'शक्कर', 'madhur'],

  'rice': ['rice', 'chawal', 'basmati', 'चावल', 'बासमती', 'india gate', 'rozzana'],
  'chawal': ['rice', 'chawal', 'basmati', 'चावल', 'बासमती', 'india gate', 'rozzana'],
  'basmati': ['rice', 'chawal', 'basmati', 'चावल', 'बासमती', 'india gate'],
  'चावल': ['rice', 'chawal', 'basmati', 'चावल', 'बासमती', 'india gate'],
  'बासमती': ['rice', 'chawal', 'basmati', 'चावल', 'बासमती', 'india gate'],

  'atta': ['atta', 'flour', 'chakki', 'aashirvaad', 'gehun', 'आटा', 'गेहूं', 'आशीर्वाद'],
  'flour': ['atta', 'flour', 'chakki', 'aashirvaad', 'आटा'],
  'aashirvaad': ['aashirvaad', 'ashirwad', 'atta', 'आशीर्वाद', 'आटा'],
  'आटा': ['atta', 'flour', 'chakki', 'aashirvaad', 'आटा', 'आशीर्वाद'],
  'आशीर्वाद': ['aashirvaad', 'ashirwad', 'atta', 'आशीर्वाद', 'आटा'],

  'salt': ['salt', 'namak', 'tata', 'टाटा नमक', 'नमक'],
  'namak': ['salt', 'namak', 'tata', 'टाटा नमक', 'नमक'],
  'tata': ['tata', 'salt', 'dal', 'sampann', 'टाटा'],
  'नमक': ['salt', 'namak', 'tata', 'टाटा नमक', 'नमक'],

  'oil': ['oil', 'tel', 'fortune', 'sunflower', 'mustard', 'refined', 'तेल', 'फॉर्च्यून'],
  'tel': ['oil', 'tel', 'fortune', 'sunflower', 'mustard', 'refined', 'तेल', 'फॉर्च्यून'],
  'fortune': ['fortune', 'oil', 'tel', 'फॉर्च्यून', 'तेल'],
  'तेल': ['oil', 'tel', 'fortune', 'sunflower', 'mustard', 'तेल', 'फॉर्च्यून'],
  'फॉर्च्यून': ['fortune', 'oil', 'tel', 'फॉर्च्यून', 'तेल'],

  // Dairy
  'butter': ['butter', 'makkhan', 'amul', 'मक्खन', 'अमूल'],
  'makkhan': ['butter', 'makkhan', 'amul', 'मक्खन', 'अमूल'],
  'makhan': ['butter', 'makkhan', 'amul', 'मक्खन', 'अमूल'],
  'amul': ['amul', 'butter', 'milk', 'cheese', 'अमूल', 'मक्खन', 'दूध'],
  'मक्खन': ['butter', 'makkhan', 'amul', 'मक्खन', 'अमूल'],
  'अमूल': ['amul', 'butter', 'milk', 'मक्खन', 'दूध'],

  'milk': ['milk', 'doodh', 'amul', 'taaza', 'दूध', 'अमूल'],
  'doodh': ['milk', 'doodh', 'amul', 'taaza', 'दूध', 'अमूल'],
  'दूध': ['milk', 'doodh', 'amul', 'taaza', 'दूध', 'अमूल'],

  // Biscuits & Confectionery
  'biscuit': ['biscuit', 'biscuits', 'parle', 'parle-g', 'good day', 'बिस्किट', 'पारले-जी'],
  'biscuits': ['biscuit', 'biscuits', 'parle', 'parle-g', 'बिस्किट', 'पारले-जी'],
  'parle': ['parle', 'parle-g', 'biscuit', 'पारले-जी', 'बिस्किट'],
  'parle-g': ['parle', 'parle-g', 'biscuit', 'पारले-जी', 'बिस्किट'],
  'पारले': ['parle', 'parle-g', 'biscuit', 'पारले-जी', 'बिस्किट'],
  'बिस्किट': ['biscuit', 'biscuits', 'parle', 'parle-g', 'बिस्किट'],

  'chocolate': ['chocolate', 'cadbury', 'silk', 'dairy milk', 'चॉकलेट', 'कैडबरी'],
  'silk': ['chocolate', 'silk', 'cadbury', 'चॉकलेट'],
  'cadbury': ['cadbury', 'silk', 'chocolate', 'कैडबरी'],
  'चॉकलेट': ['chocolate', 'cadbury', 'silk', 'चॉकलेट', 'कैडबरी'],

  // Personal Care & Soaps
  'soap': ['soap', 'sabun', 'lux', 'dettol', 'lifebuoy', 'साबुन', 'लक्स', 'डेटॉल'],
  'sabun': ['soap', 'sabun', 'lux', 'dettol', 'lifebuoy', 'साबुन', 'लक्स', 'डेटॉल'],
  'lux': ['lux', 'soap', 'sabun', 'लक्स', 'साबुन'],
  'साबुन': ['soap', 'sabun', 'lux', 'dettol', 'साबुन', 'लक्स'],
  'लक्स': ['lux', 'soap', 'sabun', 'लक्स', 'साबुन'],

  'dettol': ['dettol', 'soap', 'handwash', 'डेटॉल', 'हैंडवॉश'],
  'डेटॉल': ['dettol', 'soap', 'handwash', 'डेटॉल'],

  'surf': ['surf', 'surf excel', 'detergent', 'washing powder', 'सर्फ', 'सर्फ एक्सेल'],
  'detergent': ['surf', 'detergent', 'washing powder', 'सर्फ', 'सर्फ एक्सेल'],
  'सर्फ': ['surf', 'surf excel', 'detergent', 'सर्फ', 'सर्फ एक्सेल'],

  // Tea & Beverages
  'tea': ['tea', 'chai', 'red label', 'taj mahal', 'चाय', 'चाय पत्ती'],
  'chai': ['tea', 'chai', 'red label', 'patti', 'चाय', 'चाय पत्ती'],
  'चाय': ['tea', 'chai', 'red label', 'चाय', 'चाय पत्ती'],

  // Pulses / Dal
  'dal': ['dal', 'daal', 'toor', 'arhar', 'chana', 'sampann', 'दाल', 'अरहर दाल', 'तूर दाल'],
  'daal': ['dal', 'daal', 'toor', 'arhar', 'दाल', 'अरहर दाल'],
  'toor': ['toor', 'arhar', 'dal', 'daal', 'तूर दाल', 'अरहर दाल', 'दाल'],
  'arhar': ['toor', 'arhar', 'dal', 'daal', 'अरहर दाल', 'तूर दाल', 'दाल'],
  'दाल': ['dal', 'daal', 'toor', 'arhar', 'दाल', 'अरहर दाल', 'तूर दाल'],

  // Vegetables
  'aloo': ['aloo', 'potato', 'आलू'],
  'potato': ['potato', 'aloo', 'आलू'],
  'आलू': ['aloo', 'potato', 'आलू'],

  'pyaz': ['pyaz', 'pyaaz', 'onion', 'प्याज़', 'प्याज'],
  'pyaaz': ['pyaz', 'pyaaz', 'onion', 'प्याज़'],
  'onion': ['onion', 'pyaz', 'प्याज़'],
  'प्याज़': ['pyaz', 'onion', 'प्याज़', 'आलू'],
  'प्याज': ['pyaz', 'onion', 'प्याज़'],

  // Snacks
  'bhujia': ['bhujia', 'namkeen', 'haldiram', 'भुजिया', 'हल्दीराम'],
  'haldiram': ['haldiram', 'bhujia', 'हल्दीराम'],
  'भुजिया': ['bhujia', 'namkeen', 'haldiram', 'भुजिया'],
};

/**
 * Normalizes text: converts devanagari digits, trims, lowercases, cleans punctuation
 */
export function cleanText(text: string): string {
  const asciiDigits = normalizeDevanagariDigits(text);
  return asciiDigits
    .toLowerCase()
    .replace(/[,\.?!;।]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates string similarity (Levenshtein-based Dice coefficient)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0;
  if (str1.includes(str2) || str2.includes(str1)) return 0.85;

  const pairs1 = getBigrams(str1);
  const pairs2 = getBigrams(str2);
  const union = pairs1.length + pairs2.length;
  if (union === 0) return 0;

  let hits = 0;
  for (const p of pairs1) {
    if (pairs2.includes(p)) hits++;
  }

  return (2.0 * hits) / union;
}

function getBigrams(str: string): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.slice(i, i + 2));
  }
  return bigrams;
}

/**
 * Finds best matching product from the catalog using direct name, hindi name,
 * barcode, SKU, category, and bilingual synonym expansion.
 */
export function matchProduct(queryText: string, catalog: Product[]): { product: Product; score: number } | null {
  const cleanQ = cleanText(queryText);
  if (!cleanQ || catalog.length === 0) return null;

  // Extract raw query tokens, discarding noise words
  const rawTokens = cleanQ.split(' ').filter(w => !NOISE_WORDS.has(w) && w.length > 0);
  const queryTokens = rawTokens.length > 0 ? rawTokens : [cleanQ];

  // Expand query tokens with synonyms
  const expandedTerms = new Set<string>();
  expandedTerms.add(cleanQ);

  for (const tok of queryTokens) {
    expandedTerms.add(tok);
    if (PRODUCT_SYNONYMS[tok]) {
      for (const syn of PRODUCT_SYNONYMS[tok]) {
        expandedTerms.add(syn.toLowerCase());
      }
    }
  }

  let bestProduct: Product | null = null;
  let bestScore = 0;

  for (const prod of catalog) {
    let score = 0;
    const prodName = cleanText(prod.name);
    const prodNameHi = prod.nameHi ? cleanText(prod.nameHi) : '';
    const prodCategory = cleanText(prod.category);
    const barcode = cleanText(prod.barcode);
    const sku = cleanText(prod.sku);

    // 1. Direct barcode / SKU match
    if (barcode === cleanQ || sku === cleanQ) {
      return { product: prod, score: 1.0 };
    }

    // 2. Exact match in name or Hindi name
    if (prodName === cleanQ || prodNameHi === cleanQ) {
      return { product: prod, score: 0.98 };
    }

    // 3. Substring match against full clean query
    if (prodName.includes(cleanQ) || (prodNameHi && prodNameHi.includes(cleanQ))) {
      score += 0.85;
    }

    // 4. Match against expanded synonyms
    const prodTokens = [...prodName.split(' '), ...(prodNameHi ? prodNameHi.split(' ') : [])];

    let matchedTermsCount = 0;
    for (const term of expandedTerms) {
      // Direct token or substring match in product name / Hindi name
      if (prodName.includes(term) || (prodNameHi && prodNameHi.includes(term))) {
        matchedTermsCount += 1.5;
        continue;
      }

      // Check if product tokens match synonym
      if (prodTokens.some(pTok => pTok === term || pTok.startsWith(term) || term.startsWith(pTok))) {
        matchedTermsCount += 1.2;
        continue;
      }

      // Fuzzy check for minor spelling variations (e.g. 'maggie' vs 'maggi')
      let tokenBestSim = 0;
      for (const pTok of prodTokens) {
        if (pTok.length > 2 && term.length > 2) {
          const sim = calculateSimilarity(pTok, term);
          if (sim > tokenBestSim) tokenBestSim = sim;
        }
      }
      if (tokenBestSim > 0.65) {
        matchedTermsCount += tokenBestSim;
      }
    }

    if (queryTokens.length > 0) {
      score += (matchedTermsCount / queryTokens.length) * 0.7;
    }

    // 5. Category match
    if (queryTokens.some(q => prodCategory.includes(q))) {
      score += 0.2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestProduct = prod;
    }
  }

  // Threshold: must be reasonably confident (0.30 or higher)
  if (bestProduct && bestScore >= 0.30) {
    return { product: bestProduct, score: Math.min(1.0, bestScore) };
  }

  return null;
}

/**
 * Parses an individual clause/segment (e.g. "2 packet maggi" or "hata do amul butter")
 */
function parseClause(clause: string, catalog: Product[]): ParsedVoiceItem {
  let cleaned = cleanText(clause);

  // Check for clear command
  for (const clr of CLEAR_KEYWORDS) {
    if (cleaned.includes(clr)) {
      return {
        action: 'clear',
        rawQuery: clause,
        quantity: 0,
        confidence: 1.0,
      };
    }
  }

  // Check action (remove vs add)
  let action: 'add' | 'remove' = 'add';
  for (const rem of REMOVE_KEYWORDS) {
    if (cleaned.includes(rem)) {
      action = 'remove';
      cleaned = cleaned.replace(rem, ' ').trim();
      break;
    }
  }

  // Parse quantity and unit
  let quantity = 1;
  let unit: string | undefined = undefined;

  const tokens = cleaned.split(' ').filter(Boolean);
  const remainingTokens: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    // Check if numeric digit e.g. "2", "2.5", "500"
    const asNum = parseFloat(tok);
    if (!isNaN(asNum) && asNum > 0) {
      // Check if followed by unit e.g. "500 gram"
      if (i + 1 < tokens.length && UNIT_ALIASES[tokens[i + 1]]) {
        unit = UNIT_ALIASES[tokens[i + 1]];
        if (unit === 'Gram') {
          // 500 gram = 0.5 kg for loose / standard weight items
          quantity = asNum >= 50 ? asNum / 1000 : asNum;
        } else {
          quantity = asNum;
        }
        i++; // skip unit token
        continue;
      } else {
        quantity = asNum;
        continue;
      }
    }

    // Check numeric word e.g. "ek", "do", "teen", "aadha", "dhai", "एक", "दो"
    if (NUMBER_MAP[tok] !== undefined) {
      const numVal = NUMBER_MAP[tok];
      // Check next token for unit e.g. "aadha kilo"
      if (i + 1 < tokens.length && UNIT_ALIASES[tokens[i + 1]]) {
        unit = UNIT_ALIASES[tokens[i + 1]];
        quantity = numVal;
        i++; // skip unit token
        continue;
      } else {
        quantity = numVal;
        continue;
      }
    }

    // Check standalone unit e.g. "kilo" -> quantity 1, unit Kg
    if (UNIT_ALIASES[tok]) {
      unit = UNIT_ALIASES[tok];
      continue;
    }

    // Filter out common noise words
    if (NOISE_WORDS.has(tok)) {
      continue;
    }

    remainingTokens.push(tok);
  }

  const productQuery = remainingTokens.join(' ').trim();
  const match = matchProduct(productQuery, catalog);

  if (!match) {
    return {
      action,
      rawQuery: clause,
      quantity,
      unit,
      confidence: 0,
      error: `"${productQuery || clause}" दुकान की इन्वेंट्री में नहीं मिला`,
    };
  }

  return {
    action,
    rawQuery: clause,
    product: match.product,
    quantity,
    unit: unit || match.product.unit,
    confidence: match.score,
  };
}

/**
 * Main parser: takes a raw transcript (Hindi, English, or Hinglish)
 * splits by multi-item conjunctives ("aur", "and", ",", "plus", "fir")
 * and extracts individual cart modifications.
 */
export function parseVoiceBillingCommand(transcript: string, catalog: Product[]): VoiceParseResult {
  const cleaned = transcript.trim();
  if (!cleaned) {
    return { rawTranscript: '', items: [], hasClearCommand: false };
  }

  // Quick check if entire command is clear cart
  for (const clr of CLEAR_KEYWORDS) {
    if (cleanText(cleaned).includes(clr)) {
      return {
        rawTranscript: cleaned,
        items: [{ action: 'clear', rawQuery: cleaned, quantity: 0, confidence: 1.0 }],
        hasClearCommand: true,
      };
    }
  }

  // Split into clauses by conjunctives: English ("aur", "and", "plus", "fir") and Devanagari ("और", "तथा", "एवं", "फिर")
  const splitRegex = /(?:\s+(?:aur|and|plus|fir|phir|saath me|saath mein)\s+)|(?:\s*(?:और|तथा|एवं|फिर)\s*)|[,;।\n+]+/gi;
  const rawClauses = cleaned
    .split(splitRegex)
    .map(c => c.trim())
    .filter(c => c.length > 0);

  const parsedItems: ParsedVoiceItem[] = [];
  let hasClear = false;

  for (const clause of rawClauses) {
    const parsed = parseClause(clause, catalog);
    if (parsed.action === 'clear') {
      hasClear = true;
    }
    parsedItems.push(parsed);
  }

  return {
    rawTranscript: cleaned,
    items: parsedItems,
    hasClearCommand: hasClear,
  };
}

/**
 * Speech synthesis confirmation helper
 */
export function speakConfirmation(text: string, langCode: 'hi-IN' | 'en-IN' = 'hi-IN') {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(v => v.lang.startsWith(langCode.split('-')[0])) || voices[0];
    if (matchVoice) {
      utterance.voice = matchVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech synthesis failures in restricted browsers
  }
}
