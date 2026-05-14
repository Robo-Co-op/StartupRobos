/**
 * @upstash/ratelimit を使ったレートリミッターのユニットテスト
 * TDD: Red → Green の順で実装
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- モック定義（vi.mock はホイストされるためファイル先頭に記述）---

// limit() メソッドのモック（各テストで挙動を制御する）
const mockLimit = vi.fn()

// @upstash/redis の Redis クラスをコンストラクタ互換でモック
vi.mock('@upstash/redis', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Redis: class MockRedis { constructor(_opts: { url: string; token: string }) {} },
}))

// @upstash/ratelimit の Ratelimit をモック（slidingWindow も static として設定）
vi.mock('@upstash/ratelimit', () => {
  class MockRatelimit {
    limit: ReturnType<typeof vi.fn>
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_opts: unknown) { this.limit = mockLimit }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static slidingWindow(_limit: number, _window: string) { return 'sliding-window-config' }
  }
  return { Ratelimit: MockRatelimit }
})

// モック設定後にインポート
import { makeRateLimiter } from './rateLimit'

// --- テスト ---

describe('makeRateLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // テスト用の環境変数を設定（各テストで必要に応じて上書き）
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
  })

  it('最初の呼び出しは許可される（success: true）', async () => {
    // Arrange: limit() が成功を返すよう設定
    mockLimit.mockResolvedValue({ success: true })

    const check = makeRateLimiter(10, 60)
    const allowed = await check('user-001')

    expect(allowed).toBe(true)
    expect(mockLimit).toHaveBeenCalledWith('user-001')
  })

  it('上限を超えたリクエストは拒否される（success: false）', async () => {
    // Arrange: limit() が失敗を返すよう設定
    mockLimit.mockResolvedValue({ success: false })

    const check = makeRateLimiter(10, 60)
    const allowed = await check('user-002')

    expect(allowed).toBe(false)
    expect(mockLimit).toHaveBeenCalledWith('user-002')
  })

  it('UPSTASH 環境変数が未設定の場合はフォールバックして全リクエストを許可する', async () => {
    // Arrange: 環境変数を削除してフォールバックを強制
    const savedUrl = process.env.UPSTASH_REDIS_REST_URL
    const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    // フォールバックパスはファクトリー呼び出し時点で分岐するため、
    // 環境変数削除後にファクトリーを呼ぶ
    const check = makeRateLimiter(10, 60)
    const allowed = await check('user-003')

    // フォールバック: Redisに接続せず true を返す
    expect(allowed).toBe(true)
    // limit() は呼ばれない
    expect(mockLimit).not.toHaveBeenCalled()

    // 環境変数を復元
    process.env.UPSTASH_REDIS_REST_URL = savedUrl
    process.env.UPSTASH_REDIS_REST_TOKEN = savedToken
  })
})
