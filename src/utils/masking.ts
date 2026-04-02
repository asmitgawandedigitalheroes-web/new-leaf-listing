/**
 * Utility to mask an email address for privacy.
 * Example: 'john.doe@example.com' -> 'j***e@example.com'
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) {
    return local.charAt(0) + '***@' + domain;
  }
  return local.charAt(0) + '***' + local.charAt(local.length - 1) + '@' + domain;
}

/**
 * Utility to mask a full name for privacy.
 * Example: 'John Smith' -> 'J*** S***'
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return '—';
  return name
    .split(' ')
    .map(part => {
      if (part.length <= 1) return part;
      return part.charAt(0) + '***';
    })
    .join(' ');
}

/**
 * Utility to mask a phone number for privacy.
 * Example: '+1 (555) 000-1234' -> '+1 (555) ***-1234'
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  // Keep start and end, mask the middle
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length < 8) return '********';
  return cleaned.substring(0, 3) + '***' + cleaned.substring(cleaned.length - 4);
}
