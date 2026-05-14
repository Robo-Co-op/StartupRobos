import { describe, it, expect } from 'vitest'
import { extractText } from './responseSchemas'

describe('extractText', () => {
  it('extracts text from a normal text block', () => {
    const response = { content: [{ type: 'text', text: 'Hello world' }] }
    expect(extractText(response)).toBe('Hello world')
  })

  it('returns empty string for empty content array', () => {
    const response = { content: [] }
    expect(extractText(response)).toBe('')
  })

  it('returns empty string for non-text block (e.g. tool_use)', () => {
    const response = { content: [{ type: 'tool_use', id: 'x', name: 'f', input: {} }] }
    expect(extractText(response)).toBe('')
  })

  it('returns empty string when text is undefined', () => {
    const response = { content: [{ type: 'text' }] }
    expect(extractText(response)).toBe('')
  })

  it('only reads the first content block', () => {
    const response = {
      content: [
        { type: 'text', text: 'first' },
        { type: 'text', text: 'second' },
      ],
    }
    expect(extractText(response)).toBe('first')
  })
})
