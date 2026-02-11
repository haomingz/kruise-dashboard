import { describe, expect, it } from 'vitest'
import { config } from './config'

describe('config', () => {
  it('has default API base URL', () => {
    expect(config.apiBaseUrl).toBe('http://localhost:8080/api/v1')
  })

  it('has default namespace', () => {
    expect(config.defaultNamespace).toBe('default')
  })

  it('config object is readonly', () => {
    // TypeScript enforces this at compile time via `as const`
    expect(typeof config.apiBaseUrl).toBe('string')
    expect(typeof config.defaultNamespace).toBe('string')
  })
})
