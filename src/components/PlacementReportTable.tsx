interface PlacementStat {
  id: number;
  name: string;
  domain: string;
  impressions: number;
  clicks: number;
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
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Publisher</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Domain</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Impressions</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Clicks</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">CTR</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {placements.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors text-sm">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{p.name}</div>
                  <div className="text-[10px] text-gray-400">ID: {p.id}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                    {p.domain}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                  {p.impressions.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                  {p.clicks.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-blue-600 font-black">
                    {p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : '0.00'}%
                  </span>
                </td>
              </tr>
            ))}
            {placements.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic font-medium">
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
