**Spotlight:** Validate DEA registration numbers using the official checksum algorithm. Identify registrant types and detect formatting errors instantly.

Validate DEA registration numbers using the official checksum algorithm. Identifies registrant type (dispenser, manufacturer, distributor, etc.) and detects formatting errors. No external dataset required -- pure algorithmic validation.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/validate` | Validate a single DEA number |
| POST | `/validate/batch` | Validate up to 25 DEA numbers at once |
| GET | `/generate-test` | Generate a valid test DEA number for development |

### Quick Start

```javascript
const response = await fetch('https://dea-number-validator.p.rapidapi.com/validate?dea=AB1234563', {
  headers: {
    'x-rapidapi-key': 'YOUR_API_KEY',
    'x-rapidapi-host': 'dea-number-validator.p.rapidapi.com'
  }
});
const data = await response.json();
// { valid: true, dea: "AB1234563", checkDigit: 3, registrantType: "Dispenser", errors: [] }
```

### Rate Limits

| Plan | Requests/month | Rate |
|------|---------------|------|
| Basic (Pay Per Use) | Unlimited | 10/min |
| Pro ($9.99/mo) | 5,000 | 50/min |
| Ultra ($29.99/mo) | 25,000 | 200/min |
| Mega ($99.99/mo) | 100,000 | 500/min |
