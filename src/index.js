import express from 'express';

const app = express();
const PORT = process.env.PORT || 3010;
const MAX_BATCH = 25;

// --- Registrant type lookup ---

const REGISTRANT_TYPES = {
  A: 'Dispenser (Hospitals, Pharmacies, Practitioners)',
  B: 'Dispenser (Hospitals, Pharmacies, Practitioners)',
  C: 'Manufacturer (Schedule I Researcher)',
  D: 'Manufacturer (Schedule I Researcher)',
  E: 'Manufacturer (Schedule I Researcher)',
  F: 'Manufacturer',
  G: 'Distributor',
  H: 'Distributor',
  J: 'Distributor',
  K: 'Distributor',
  L: 'Reverse Distributor',
  M: 'Mid-Level Practitioner',
  P: 'Narcotic Treatment Program',
  R: 'Narcotic Treatment Program',
  S: 'Narcotic Treatment Program',
  T: 'Narcotic Treatment Program',
  X: 'Suboxone/Subutex Prescriber',
};

const resolveRegistrantType = (letter) =>
  REGISTRANT_TYPES[letter.toUpperCase()] || 'Unknown';

// --- DEA checksum logic ---

const computeCheckDigit = (digits) => {
  const oddSum = [0, 2, 4].reduce((sum, i) => sum + digits[i], 0);
  const evenSum = [1, 3, 5].reduce((sum, i) => sum + digits[i], 0);
  const total = oddSum + evenSum * 2;
  return total % 10;
};

const validateDea = (raw) => {
  const errors = [];
  const dea = (raw || '').trim().toUpperCase();

  if (!dea) {
    errors.push('DEA number is required');
    return { valid: false, dea: raw || '', checkDigit: null, registrantType: null, errors };
  }

  if (dea.length !== 9) {
    errors.push(`DEA number must be exactly 9 characters, got ${dea.length}`);
  }

  const letterPart = dea.slice(0, 2);
  const digitPart = dea.slice(2);

  if (!/^[A-Z]{2}$/.test(letterPart)) {
    errors.push('First two characters must be letters');
  }

  if (!/^\d{7}$/.test(digitPart)) {
    errors.push('Last seven characters must be digits');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      dea,
      checkDigit: null,
      registrantType: letterPart.length >= 1 ? resolveRegistrantType(letterPart[0]) : null,
      errors,
    };
  }

  const digits = digitPart.split('').map(Number);
  const expectedCheck = computeCheckDigit(digits.slice(0, 6));
  const actualCheck = digits[6];

  if (expectedCheck !== actualCheck) {
    errors.push(`Check digit mismatch: expected ${expectedCheck}, got ${actualCheck}`);
  }

  return {
    valid: errors.length === 0,
    dea,
    checkDigit: actualCheck,
    registrantType: resolveRegistrantType(letterPart[0]),
    errors,
  };
};

// --- Test number generator ---

const generateTestDea = (lastNameInitial) => {
  const prefix = 'A';
  const second = lastNameInitial.toUpperCase();
  const randomDigits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10));
  const checkDigit = computeCheckDigit(randomDigits);
  const number = `${prefix}${second}${randomDigits.join('')}${checkDigit}`;

  return {
    dea: number,
    disclaimer: 'This is a randomly generated test DEA number for development and testing purposes only. It is not a real DEA registration.',
    registrantType: resolveRegistrantType(prefix),
  };
};

// --- Sanitize input ---

const sanitize = (str) =>
  typeof str === 'string' ? str.replace(/[^\w]/g, '').slice(0, 20) : '';

// --- Middleware ---

const securityHeaders = (_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'",
  });
  next();
};

app.use(securityHeaders);
app.use(express.json({ limit: '10kb' }));

// --- Routes ---

app.get('/', (_req, res) => {
  res.json({
    name: 'DEA Number Validator API',
    version: '1.0.0',
    description: 'Validate DEA registration numbers using the official checksum algorithm. Identify registrant types and detect formatting errors.',
    endpoints: {
      'GET /': 'API information',
      'GET /health': 'Health check',
      'GET /validate?dea=AB1234563': 'Validate a single DEA number',
      'POST /validate/batch': 'Validate up to 25 DEA numbers (body: { numbers: [...] })',
      'GET /generate-test?lastName=S': 'Generate a valid test DEA number for a given last name initial',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/validate', (req, res) => {
  const raw = sanitize(req.query.dea);

  if (!raw) {
    return res.status(400).json({
      valid: false,
      dea: '',
      checkDigit: null,
      registrantType: null,
      errors: ['Query parameter "dea" is required'],
    });
  }

  const result = validateDea(raw);
  const status = result.valid ? 200 : 200;
  res.status(status).json(result);
});

app.post('/validate/batch', (req, res) => {
  const { numbers } = req.body || {};

  if (!Array.isArray(numbers) || numbers.length === 0) {
    return res.status(400).json({
      error: 'Request body must include a "numbers" array with at least one DEA number',
    });
  }

  if (numbers.length > MAX_BATCH) {
    return res.status(400).json({
      error: `Maximum ${MAX_BATCH} DEA numbers per batch request`,
    });
  }

  const results = numbers.map((n) => validateDea(sanitize(String(n))));
  const validCount = results.filter((r) => r.valid).length;

  res.json({
    total: results.length,
    valid: validCount,
    invalid: results.length - validCount,
    results,
  });
});

app.get('/generate-test', (req, res) => {
  const raw = sanitize(req.query.lastName || '');
  const initial = raw ? raw[0] : null;

  if (!initial || !/^[A-Z]$/i.test(initial)) {
    return res.status(400).json({
      error: 'Query parameter "lastName" is required and must start with a letter (A-Z)',
    });
  }

  const result = generateTestDea(initial);
  res.json(result);
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`DEA Validator API running on port ${PORT}`);
});
