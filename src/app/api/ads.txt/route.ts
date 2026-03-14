import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publisherIdParam = searchParams.get("publisher_id");

  if (!publisherIdParam) {
    return new NextResponse("publisher_id is required", { status: 400 });
  }

  const publisherId = parseInt(publisherIdParam, 10);

  // Check if the publisher exists
  const publisher = await prisma.publisher.findUnique({
    where: { id: publisherId },
    select: { id: true }
  });

  if (!publisher) {
    return new NextResponse("Publisher not found", { status: 404 });
  }

  const adNetworkDomain = process.env.ADNETWORK_DOMAIN || 'adnetwork.local';
  const certificationId = 'f08c47fec0942fa0'; 
  
  const content = `# ads.txt for Publisher ${publisherId}\n${adNetworkDomain}, ${publisherId}, DIRECT, ${certificationId}\n`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600" 
    },
  });
}
