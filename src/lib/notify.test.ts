import { describe, it, expect, vi, beforeEach } from 'vitest'
import { escapeHtml, markdownToHtml } from './notify'

describe('escapeHtml', () => {
  it('< をエスケープする', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('& をエスケープする', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B')
  })

  it('& < > を同時にエスケープする', () => {
    expect(escapeHtml('<b>A & B</b>')).toBe('&lt;b&gt;A &amp; B&lt;/b&gt;')
  })

  it('クリーンなテキストは変換しない', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('空文字列は空文字列を返す', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('markdownToHtml', () => {
  it('## 見出しを h2 に変換し、内容を HTML エスケープする', () => {
    expect(markdownToHtml('## <bad> heading')).toContain('<h2>&lt;bad&gt; heading</h2>')
  })

  it('- リストを li に変換する', () => {
    expect(markdownToHtml('- item one')).toContain('<li>item one</li>')
  })

  it('**bold** を strong に変換する', () => {
    expect(markdownToHtml('**hello**')).toContain('<strong>hello</strong>')
  })

  it('### 見出しを h3 に変換し HTML エスケープする', () => {
    expect(markdownToHtml('### A & B')).toContain('<h3>A &amp; B</h3>')
  })
})

describe('sendReport', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('RESEND_API_KEY 未設定時は fetch を呼ばず skip する', async () => {
    delete process.env.RESEND_API_KEY
    process.env.NOTIFY_EMAIL = 'test@example.com'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { sendReport } = await import('./notify')
    await sendReport('subject', 'body')
    expect(fetch).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('RESEND_API_KEY'))
    warnSpy.mockRestore()
  })

  it('NOTIFY_EMAIL 未設定時は fetch を呼ばず skip する', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    delete process.env.NOTIFY_EMAIL
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { sendReport } = await import('./notify')
    await sendReport('subject', 'body')
    expect(fetch).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('NOTIFY_EMAIL'))
    warnSpy.mockRestore()
  })

  it('両方設定時は Resend API に fetch する', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    process.env.NOTIFY_EMAIL = 'user@example.com'
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)
    const { sendReport } = await import('./notify')
    await sendReport('Test Subject', '## <script>alert</script>')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(options.headers['Authorization']).toBe('Bearer test-key')
    const body = JSON.parse(options.body)
    expect(body.to).toEqual(['user@example.com'])
    expect(body.subject).toBe('Test Subject')
    expect(body.html).toContain('&lt;script&gt;')
    expect(body.html).not.toContain('<script>')
  })
})
