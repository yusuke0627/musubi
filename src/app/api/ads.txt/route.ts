import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publisherId = searchParams.get("publisher_id");

  if (!publisherId) {
    return new NextResponse("publisher_id is required", { status: 400 });
  }

  // Check if the publisher exists
  const publisher = db.prepare('SELECT id FROM publishers WHERE id = ?').get(publisherId);
  if (!publisher) {
    return new NextResponse("Publisher not found", { status: 404 });
  }

  // Define the ads.txt content
  // Format: <Field #1>, <Field #2>, <Field #3>, <Field #4>
  // Field 1: Domain name of the advertising system
  // Field 2: Publisher's Account ID
  // Field 3: Type of Account/Relationship (DIRECT or RESELLER)
  // Field 4: Certification Authority ID (Optional, using a placeholder for now)
  const adNetworkDomain = process.env.ADNETWORK_DOMAIN || 'adnetwork.local';
  const certificationId = 'f08c47fec0942fa0'; // Placeholder Certification ID
  
  const content = `# ads.txt for Publisher ${publisherId}\n${adNetworkDomain}, ${publisherId}, DIRECT, ${certificationId}\n`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600" // Cache for 1 hour to reduce DB load
    },
  });
}
