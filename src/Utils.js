import { DateTime } from 'luxon';
import unflatten from 'unflatten';
//
const { fromMillis } = DateTime;
const { fromEntries } = Object;
// https://aws.amazon.com/blogs/compute/support-for-multi-value-parameters-in-amazon-api-gateway/
// (rawHeaders: Array<string>): { [string]: Array<string> }
export function parseMultiValueHeaders(rawHeaders) {
  if (rawHeaders.length === 0) return null;
  //
  const map = new Map();
  const unflattened = unflatten(rawHeaders, 2);
  // eslint-disable-next-line no-restricted-syntax
  for (const key of Object.keys(unflattened)) {
    const item = map.get(key);
    if (item) item.push(unflattened[key]);
    else map.set(key, [unflattened[key]]);
  }
  return fromEntries(map);
}
// https://aws.amazon.com/blogs/compute/support-for-multi-value-parameters-in-amazon-api-gateway/
// [ [ 'petType', 'dog' ], [ 'petType', 'fish' ] ]
// => { petType: [ 'dog', 'fish' ] },
export function parseMultiValueQueryStringParameters(url) {
  // dummy placeholder url for the WHATWG URL constructor
  // https://github.com/nodejs/node/issues/12682
  const { searchParams } = new URL(url, 'http://example');
  //
  if (Array.from(searchParams).length === 0) return null
  const map = new Map();
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of searchParams) {
    const item = map.get(key);
    if (item) item.push(value)
    else map.set(key, [value])
  }
  return fromEntries(map);
}
export function parseQueryStringParameters(url) {
  // dummy placeholder url for the WHATWG URL constructor
  // https://github.com/nodejs/node/issues/12682
  const { searchParams } = new URL(url, 'http://example');
  if (Array.from(searchParams).length === 0) return null
  return fromEntries(searchParams);
}
// CLF -> Common Log Format
// https://httpd.apache.org/docs/1.3/logs.html#common
export function formatToClfTime(millis) {
  return fromMillis(millis).toFormat('dd/MMM/yyyy:HH:mm:ss ZZZ')
}
//
export function nullIfEmpty(obj) {
  return obj && (Object.keys(obj).length > 0 ? obj : null)
}
