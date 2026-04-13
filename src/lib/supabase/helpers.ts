/**
 * Convert snake_case string to camelCase.
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/**
 * Convert camelCase string to snake_case.
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

/**
 * Recursively convert all object keys from snake_case to camelCase.
 */
export function toCamel<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T
  if (typeof obj !== 'object') return obj as T

  if (Array.isArray(obj)) {
    return obj.map((item) => toCamel(item)) as T
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[toCamelCase(key)] = toCamel(value)
  }
  return result as T
}

/**
 * Recursively convert all object keys from camelCase to snake_case.
 */
export function toSnake<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T
  if (typeof obj !== 'object') return obj as T

  if (Array.isArray(obj)) {
    return obj.map((item) => toSnake(item)) as T
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[toSnakeCase(key)] = toSnake(value)
  }
  return result as T
}
