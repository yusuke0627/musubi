import db from "@/lib/db";
import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();
  const advertisers = db.prepare("SELECT id, name FROM advertisers").all() as { id: number; name: string }[];
  const publishers = db.prepare("SELECT id, name FROM publishers").all() as { id: number; name: string }[];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="flex justify-end mb-8">
          {session ? (
            <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-full shadow-sm border">
              <span className="text-sm text-gray-600 font-medium">Logged in as <strong className="text-gray-900">{session.user?.email}</strong></span>
              <form action={async () => {
                "use server";
                await signOut();
              }}>
                <button className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold transition-all">
                  Logout
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 transition-all shadow-md">
              Login
            </Link>
          )}
        </div>

        <h1 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Musubi</h1>
        <p className="text-xl text-slate-600 mb-12 italic">Connecting Value, Bridging Growth.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Admin Card */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">System Admin</h3>
            <Link
              href="/admin"
              className="w-full bg-slate-800 text-white py-3 px-4 rounded-lg font-semibold hover:bg-slate-700 transition-colors text-center"
            >
              Administrator Dashboard
            </Link>
          </div>

          {/* Advertisers Card */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Advertisers (広告主)</h3>
            <ul className="space-y-3 text-left">
              {advertisers.map((adv) => (
                <li key={adv.id}>
                  <Link
                    href={`/advertiser/${adv.id}`}
                    className="text-blue-600 font-medium hover:underline flex items-center"
                  >
                    <span className="mr-2">👤</span>
                    {adv.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Publishers Card */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Publishers (媒体社)</h3>
            <ul className="space-y-3 text-left">
              {publishers.map((pub) => (
                <li key={pub.id}>
                  <Link
                    href={`/publisher/${pub.id}`}
                    className="text-emerald-600 font-medium hover:underline flex items-center"
                  >
                    <span className="mr-2">🌐</span>
                    {pub.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
