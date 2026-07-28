import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { id } = await params;
  const url = new URL(`/home/activate/${encodeURIComponent(id)}`, request.url);

  return NextResponse.redirect(url);
}
