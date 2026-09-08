import { describe, expect, it } from '@jest/globals';
import { normalizeLeadData } from './lead-data.util';

describe('normalizeLeadData', () => {
  it('maps builder form labels onto canonical contact fields', () => {
    const next = normalizeLeadData(
      {
        'Full name': 'Ananya Mehta',
        'Phone number': '+91 98765 43101',
        'Email address': 'ananya@example.com',
        'Interested in': '3 BHK',
        Project: 'Skyline Heights',
      },
      { projectName: 'Skyline Heights' },
    );

    expect(next.fullName).toBe('Ananya Mehta');
    expect(next.name).toBe('Ananya Mehta');
    expect(next.phone).toBe('+91 98765 43101');
    expect(next.email).toBe('ananya@example.com');
    expect(next.interestedIn).toBe('3 BHK');
    expect(next.project).toBe('Skyline Heights');
  });
});
