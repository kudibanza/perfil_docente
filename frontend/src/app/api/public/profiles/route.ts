import { NextRequest, NextResponse } from "next/server";
import { apiRequest } from "@/lib/api/server";

const pageSize = 12;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 200) ?? "";
  const requestedPage = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const page = Number.isSafeInteger(requestedPage)
    ? Math.max(1, Math.min(requestedPage, 100000))
    : 1;
  const params = new URLSearchParams({
    limit: String(pageSize + 1),
    offset: String((page - 1) * pageSize),
  });
  if (query) params.set("q", query);

  try {
    const response = await apiRequest(`/public/profiles?${params.toString()}`);
    if (!response.ok)
      return NextResponse.json(
        { detail: "Não foi possível carregar os perfis públicos." },
        { status: 502 },
      );
    const received = await response.json();
    return NextResponse.json(
      { profiles: received.slice(0, pageSize), hasNextPage: received.length > pageSize },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { detail: "Não foi possível ligar ao serviço de perfis." },
      { status: 502 },
    );
  }
}
