import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export default function middleware(req: NextRequest) {
  void req
  return NextResponse.next()
}

export const config = { matcher: [] }
