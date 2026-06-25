import test from 'node:test';
import assert from 'node:assert/strict';

const emailService = await import('../dist/services/emailService.js');

test('invite email includes a hyperlink to the Ecology login page', () => {
  const previousUrl = process.env.ECOLOGY_PUBLIC_URL;
  process.env.ECOLOGY_PUBLIC_URL = 'https://enzom.duckdns.org/ecology/';

  try {
    const html = emailService.buildInviteEmailHtml('Host', 'Forest Game');

    assert.match(html, /<a\b[^>]*href="https:\/\/enzom\.duckdns\.org\/ecology\/"[^>]*>/);
    assert.match(html, /Log in to Ecology/);
  } finally {
    if (previousUrl === undefined) {
      delete process.env.ECOLOGY_PUBLIC_URL;
    } else {
      process.env.ECOLOGY_PUBLIC_URL = previousUrl;
    }
  }
});
