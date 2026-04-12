import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <h1 className="text-xl font-bold">Launchpad</h1>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
            ログイン
          </Link>
          <Link href="/signup" className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">
            はじめる
          </Link>
        </div>
      </header>

      {/* ヒーロー */}
      <main className="max-w-4xl mx-auto px-6 py-20 space-y-20">
        <section className="text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            AI CXOが<br/>
            あなたの代わりに<br/>
            <span className="text-purple-400">3つのビジネス</span>を回す
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            言語と地域を入力するだけ。CEO (AI) が最適なビジネスを選び、
            CTO・CMO・COO・CFO が24時間自律稼働。
            初期投資$0、月$500から。
          </p>
          <Link
            href="/signup"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl text-lg font-medium transition-colors"
          >
            無料で始める
          </Link>
        </section>

        {/* 仕組み */}
        <section className="space-y-8">
          <h3 className="text-2xl font-bold text-center">30日で30実験</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: '言語と地域を入力',
                desc: '母国語で話すだけ。ターミナル知識不要。',
              },
              {
                step: '2',
                title: 'CEO が3事業を選定',
                desc: 'あなたの強みを活かせるデジタルビジネスをAIが提案。',
              },
              {
                step: '3',
                title: 'CXOが自律稼働',
                desc: 'CTO/CMO/COO/CFO が各事業を並行で実行。SEO記事、LP、ゲーム、デジタルプロダクトを自動生成。',
              },
            ].map((item) => (
              <div key={item.step} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <h4 className="font-semibold text-lg">{item.title}</h4>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ビジネステンプレート */}
        <section className="space-y-8">
          <h3 className="text-2xl font-bold text-center">初期投資$0のビジネス</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                type: 'Affiliate / SEO',
                desc: '多言語SEO記事を量産。長尾キーワードで世界中のニッチを攻略。',
                color: 'emerald',
              },
              {
                type: 'Digital Product',
                desc: 'テンプレート、ebook、プロンプト集をGumroadで販売。生成→LP→販売まで全自動。',
                color: 'blue',
              },
              {
                type: 'Game + Ads',
                desc: 'HTML5ゲームを自動生成→デプロイ→AdSenseで収益化。SNSバイラルで集客。',
                color: 'orange',
              },
            ].map((item) => (
              <div key={item.type} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
                <span className={`text-xs px-3 py-1 rounded-full bg-${item.color}-900/50 text-${item.color}-400 border border-${item.color}-800`}>
                  {item.type}
                </span>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 学習パス */}
        <section className="space-y-8">
          <h3 className="text-2xl font-bold text-center">4週間の学習パス</h3>
          <div className="space-y-4">
            {[
              { week: 'Week 1', title: 'CCに「起業したい」と話す', desc: 'CXOが3事業を開始。あなたは見守るだけ。' },
              { week: 'Week 2', title: '「どうなった？」と聞く', desc: '実験結果を確認。CCで微調整を覚える。' },
              { week: 'Week 3', title: '成功事業にリソース集中', desc: 'シナジー拡張。ニュースレター、YouTube、Print on Demand。' },
              { week: 'Week 4', title: '事業継続 or CCスキルで独立', desc: '成功→継続。失敗しても、CCを使えるフリーランサーになれる。' },
            ].map((item) => (
              <div key={item.week} className="flex gap-4 items-start bg-gray-900 border border-gray-800 rounded-xl p-5">
                <span className="text-xs bg-purple-900/50 text-purple-400 border border-purple-800 px-3 py-1 rounded-full whitespace-nowrap">
                  {item.week}
                </span>
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm text-gray-400 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4 pb-12">
          <h3 className="text-2xl font-bold">あなたの言語が、武器になる</h3>
          <p className="text-gray-400">多言語 x グローバル分散 = どの国のニッチも同時攻略</p>
          <Link
            href="/signup"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl text-lg font-medium transition-colors"
          >
            Launchpadを始める
          </Link>
        </section>
      </main>
    </div>
  )
}
