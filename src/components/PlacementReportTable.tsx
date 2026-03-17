interface PlacementStat {
  id: number;
  name: string;
  domain: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  revenue: number;
}

interface PlacementReportTableProps {
  placements: PlacementStat[];
}

export default function PlacementReportTable({ placements }: PlacementReportTableProps) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-slate-50/50">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Placement Report (by Domain)</h2>
        <p className="text-sm text-gray-500 mt-1">あなたの広告が表示された媒体社別のパフォーマンス統計です。</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50 z-10 border-r border-gray-100">Publisher</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Imps</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Clicks</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">CTR</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-blue-400 uppercase tracking-widest">CV</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-blue-400 uppercase tracking-widest">CVR</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-emerald-400 uppercase tracking-widest">CPA</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-emerald-400 uppercase tracking-widest">Revenue</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {placements.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors text-sm">
                <td className="px-6 py-4 sticky left-0 bg-white z-10 border-r border-gray-100">
                  <div className="font-bold text-gray-900 leading-tight">{p.name}</div>
                  <div className="text-[10px] text-gray-400">{p.domain}</div>
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                  {p.impressions.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                  {p.clicks.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-gray-600 font-bold">
                    {p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : '0.00'}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-blue-700">
                  {p.conversions.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-blue-600 font-black">
                    {p.clicks > 0 ? ((p.conversions / p.clicks) * 100).toFixed(2) : '0.00'}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">
                  {p.conversions > 0 ? `¥${Math.floor(p.cost / p.conversions).toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">
                  ¥{p.revenue.toLocaleString()}
                </td>
              </tr>
            ))}
            {placements.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                  No placement data available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
