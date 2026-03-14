import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="bg-white p-12 rounded-2xl shadow-xl border border-gray-100 max-w-lg">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-4xl font-black text-gray-900 mb-4">403 - Forbidden</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Access Denied. You do not have permission to view this page.
          If you believe this is an error, please contact your administrator.
        </p>
        <Link 
          href="/" 
          className="inline-block bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 transition-all shadow-md"
        >
          Return to Portal
        </Link>
      </div>
    </div>
  );
}
