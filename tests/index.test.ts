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

import { LogViewer } from '../src/Logger';

describe('ConfigParser - additional tests', () => {
  const parser = new ConfigParser();

  it('interpolates multiple vars in sequence', () => {
    const ctx = { a: 'foo', b: 'bar', c: 'baz' };
    expect(parser.interpolate('${a}-${b}-${c}', ctx)).toBe('foo-bar-baz');
  });

  it('handles deeply nested interpolation', () => {
    const ctx = { provider: { settings: { env: 'staging' } } };
    expect(parser.interpolate('${provider.settings.env}', ctx)).toBe('staging');
  });

  it('handles empty string interpolation', () => {
    expect(parser.interpolate('', {})).toBe('');
  });

  it('leaves multiple missing vars intact', () => {
    expect(parser.interpolate('${a} and ${b}', {})).toBe('${a} and ${b}');
  });

  it('replaces var at start of string', () => {
    expect(parser.interpolate('${env}-server', { env: 'prod' })).toBe('prod-server');
  });

  it('replaces var at end of string', () => {
    expect(parser.interpolate('prefix-${env}', { env: 'dev' })).toBe('prefix-dev');
  });

  it('handles number values as strings', () => {
    const ctx = { port: 3000 };
    expect(parser.interpolate('port-${port}', ctx as any)).toBe('port-3000');
  });
});

describe('Packager - additional tests', () => {
  const packager = new Packager();

  it('formats 0 bytes', () => {
    expect(packager.formatSize(0)).toBe('0 B');
  });

  it('formats 1023 bytes as B', () => {
    expect(packager.formatSize(1023)).toBe('1023 B');
  });

  it('formats exactly 1 KB', () => {
    expect(packager.formatSize(1024)).toBe('1.0 KB');
  });

  it('formats exactly 1 MB', () => {
    expect(packager.formatSize(1024 * 1024)).toBe('1.0 MB');
  });

  it('formats 10 MB', () => {
    expect(packager.formatSize(10 * 1024 * 1024)).toBe('10.0 MB');
  });

  it('formats 512 KB', () => {
    expect(packager.formatSize(512 * 1024)).toBe('512.0 KB');
  });
});
