/**
 * Personally identifiable information (PII) masking utility
 * Removes sensitive information from agent inputs
 */
export function maskPII(text: string): string {
  return text
    // Email addresses
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    // Phone numbers (Japanese and international formats)
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]')
    .replace(/\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{4,10}/g, '[PHONE]')
    // Passport numbers (basic pattern)
    .replace(/\b[A-Z]{1,2}\d{6,9}\b/g, '[PASSPORT]')
    // Numeric IDs (9-12 digits)
    .replace(/\b\d{9,12}\b/g, '[ID_NUMBER]')
    // Credit card numbers
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_NUMBER]')
}
