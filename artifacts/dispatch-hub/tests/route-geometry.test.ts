import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeGooglePolyline } from '../src/components/dispatch/routeGeometry';

test('decodes Google encoded coordinates for drawing a driving route', () => {
  assert.deepEqual(decodeGooglePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'), [
    [38.5, -120.2],
    [40.7, -120.95],
    [43.252, -126.453],
  ]);
});

test('malformed or empty encoded routes draw no line', () => {
  assert.deepEqual(decodeGooglePolyline(''), []);
  assert.deepEqual(decodeGooglePolyline('abc'), []);
  assert.deepEqual(decodeGooglePolyline('a'.repeat(100_001)), []);
});
