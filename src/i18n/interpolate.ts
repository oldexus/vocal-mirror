/**
 * VocalMirror — Template Variable Interpolator
 * 
 * Replaces `{key}`, `{ key }`, `{  key  }` placeholders with values from params object.
 * Preserves unsupplied placeholder tokens and safely handles strings, numbers, zero,
 * negative numbers, and CJK characters.
 */

export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!template || typeof template !== 'string') {
    return template ?? '';
  }

  if (!params || typeof params !== 'object') {
    return template;
  }

  return template.replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(params, key) && params[key] !== undefined && params[key] !== null) {
      return String(params[key]);
    }
    return match;
  });
}
