import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type HomeFilePayload = {
  files: Array<{
    name: string;
    url: string;
  }>;
};

export async function GET() {
  const homeFilesDir = path.join(process.cwd(), "public", "home-files");

  try {
    const entries = await readdir(homeFilesDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
      .map((entry) => ({
        name: entry.name,
        url: `/home-files/${encodeURIComponent(entry.name)}`
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    return NextResponse.json<HomeFilePayload>({ files });
  } catch (error) {
    const details =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    if (details === "ENOENT") {
      return NextResponse.json<HomeFilePayload>({ files: [] });
    }

    return NextResponse.json<HomeFilePayload>({ files: [] }, { status: 500 });
  }
}
