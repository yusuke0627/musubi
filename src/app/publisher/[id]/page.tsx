import db from "@/lib/db";
import { getDailyStats } from "@/services/stats";
import Link from "next/link";
import { notFound, forbidden } from "next/navigation";
import StatsChart from "@/components/StatsChart";
import { requestPayout } from "./actions";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublisherDashboard({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as any;

  // Authorization check (IDOR Protection)
  if (user?.role !== 'admin' && (user?.role !== 'publisher' || user?.linked_id.toString() !== id)) {
    return forbidden();
  }

  const publisher = db.prepare('SELECT * FROM publishers WHERE id = ?').get(id) as any;

  if (!publisher) return notFound();

  const stats = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM impressions WHERE publisher_id = ?) as impressions,
      (SELECT COUNT(*) FROM clicks WHERE publisher_id = ? AND is_valid = 1) as clicks
  `).get(id, id) as any;

  const payouts = db.prepare('SELECT * FROM payouts WHERE publisher_id = ? ORDER BY created_at DESC').all(id) as any[];
  const dailyStats = getDailyStats({ publisherId: id }) as any[];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center border-b pb-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Publisher: {publisher.name}</h1>
          <Link href="/" className="text-blue-600 hover:underline">← Back to Portal</Link>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Impressions</h3>
            <div className="text-2xl font-bold text-gray-900">{stats.impressions}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Clicks</h3>
            <div className="text-2xl font-bold text-gray-900">{stats.clicks}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Current Balance</h3>
            <div className="text-2xl font-bold text-emerald-600">¥{publisher.balance.toLocaleString()}</div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Performance Over Time</h2>
          <StatsChart data={dailyStats} />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Payout Section */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Payout</h2>
            <div className="bg-gray-50 p-4 rounded-lg flex flex-col gap-4">
              <div>
                <p className="text-sm text-gray-600">Minimum Payout: <strong>¥1,000</strong></p>
                {publisher.balance < 1000 && (
                  <p className="text-xs text-red-500 mt-1">
                    You need ¥{(1000 - publisher.balance).toLocaleString()} more to request a payout.
                  </p>
                )}
              </div>
              <form action={async (formData) => {
                "use server";
                await requestPayout(formData);
              }}>
                <input type="hidden" name="publisher_id" value={publisher.id} />
                <button
                  type="submit"
                  disabled={publisher.balance < 1000}
                  className={`w-full py-3 px-4 rounded-lg font-bold transition-colors ${
                    publisher.balance < 1000
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                  }`}
                >
                  Request Payout
                </button>
              </form>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-4 text-gray-800">Payout History</h3>
            <div className="overflow-hidden border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('ja-JP')}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">¥{p.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">No payout history.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Integration Section */}
          <div className="flex flex-col gap-8">
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-gray-800">ads.txt Configuration</h2>
              <p className="text-sm text-gray-600 mb-4">
                プラットフォームの透明性を高めるため、以下のリンクからあなたの <code>ads.txt</code> を取得し、あなたのサイトのルートディレクトリに配置してください。
              </p>
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between border">
                <code className="text-sm text-gray-800 truncate">
                  /api/ads.txt?publisher_id={publisher.id}
                </code>
                <a 
                  href={`/api/ads.txt?publisher_id=${publisher.id}`} 
                  target="_blank"
                  className="ml-4 text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap"
                >
                  View ads.txt ↗
                </a>
              </div>
            </section>

            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Ad Tag Integration</h2>
              <p className="text-sm text-gray-600 mb-4">下記のタグをあなたのサイト (<code>{publisher.domain}</code>) に埋め込んでください。</p>
              <pre className="bg-gray-900 text-emerald-400 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                {`<iframe src="http://localhost:3000/api/serve?publisher_id=${publisher.id}" width="300" height="250" frameborder="0"></iframe>`}
              </pre>
            </section>

            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Live Preview</h2>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex items-center justify-center bg-white min-h-[300px]">
                <iframe src={`/api/serve?publisher_id=${publisher.id}`} width="320" height="260" frameBorder="0"></iframe>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
