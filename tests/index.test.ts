import { describe, it, expect } from 'vitest';
import { ConfigParser } from '../src/Config';
import { Packager } from '../src/Packager';

describe('ConfigParser', () => {
  describe('interpolate', () => {
    const parser = new ConfigParser();

    it('replaces simple variables', () => {
      const ctx = { stage: 'prod', region: 'us-east-1' };
      expect(parser.interpolate('${stage}', ctx)).toBe('prod');
      expect(parser.interpolate('${region}', ctx)).toBe('us-east-1');
    });

    it('replaces nested variables', () => {
      const ctx = { provider: { region: 'eu-west-1' } };
      expect(parser.interpolate('${provider.region}', ctx)).toBe('eu-west-1');
    });

    it('keeps unresolved variables intact', () => {
      const ctx = { stage: 'dev' };
      expect(parser.interpolate('${missing}', ctx)).toBe('${missing}');
    });

    it('replaces multiple variables in one string', () => {
      const ctx = { env: 'prod', region: 'us-east-1' };
      expect(parser.interpolate('${env}-${region}', ctx)).toBe('prod-us-east-1');
    });

    it('returns string unchanged if no variables', () => {
      expect(parser.interpolate('hello world', {})).toBe('hello world');
    });
  });
});

describe('Packager', () => {
  describe('formatSize', () => {
    const packager = new Packager();

    it('formats bytes', () => {
      expect(packager.formatSize(500)).toBe('500 B');
    });

    it('formats kilobytes', () => {
      expect(packager.formatSize(1024)).toBe('1.0 KB');
      expect(packager.formatSize(2048)).toBe('2.0 KB');
    });

    it('formats megabytes', () => {
      expect(packager.formatSize(1024 * 1024)).toBe('1.0 MB');
      expect(packager.formatSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });
  });
});
