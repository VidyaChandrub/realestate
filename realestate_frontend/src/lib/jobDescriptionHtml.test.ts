import { describe, expect, it } from 'vitest';
import { getJobDescriptionText, sanitizeJobDescriptionHtml } from './jobDescriptionHtml';

describe('jobDescriptionHtml', () => {
  it('keeps allowed formatting and link protocols', () => {
    const html = sanitizeJobDescriptionHtml(
      '<h3>Role</h3><p><b>Build</b> tools for <a href="https://example.com">teams</a>.</p><ul><li>React</li></ul>',
    );

    expect(html).toContain('<h3>Role</h3>');
    expect(html).toContain('<b>Build</b>');
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">teams</a>');
    expect(html).toContain('<ul><li>React</li></ul>');
  });

  it('removes unsafe tags, attributes, and urls', () => {
    const html = sanitizeJobDescriptionHtml(
      '<p onclick="alert(1)" style="color:red">Hello <script>alert(1)</script><a href="javascript:alert(1)">bad</a></p>',
    );

    expect(html).toBe('<p>Hello bad</p>');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('style');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('script');
  });

  it('converts plain text descriptions into safe html', () => {
    const html = sanitizeJobDescriptionHtml('Line one\nLine two\n\nLine <three>');

    expect(html).toBe('<p>Line one<br>Line two</p><p>Line &lt;three&gt;</p>');
    // getJobDescriptionText replaces block boundaries with \n and preserves HTML entities
    expect(getJobDescriptionText(html)).toBe('Line one\nLine two\nLine &lt;three&gt;');
  });
});
