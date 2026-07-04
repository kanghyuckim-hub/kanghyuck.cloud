import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import * as cheerio from "cheerio";

const C = {
  navy: "1e3a5f",
  blue: "2563eb",
  indigo: "4f46e5",
  light: "eff6ff",
  slate: "f8fafc",
  white: "ffffff",
  text: "0f172a",
  sub: "64748b",
  border: "e2e8f0",
  stripe: "f1f5f9",
  green: "059669",
  red: "dc2626",
};

function cellOpt(
  text: string,
  opts: { bold?: boolean; bg?: string; color?: string; align?: "left" | "center" | "right" } = {}
) {
  return {
    text,
    options: {
      bold: opts.bold ?? false,
      fontSize: 9,
      color: opts.color ?? C.text,
      fill: { color: opts.bg ?? C.white },
      align: opts.align ?? "center",
      valign: "middle" as const,
      margin: [2, 4, 2, 4] as [number, number, number, number],
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const { html } = await request.json();
    if (!html) return NextResponse.json({ error: "HTML이 필요합니다." }, { status: 400 });

    const $ = cheerio.load(html);

    // ── Extract structured data ──────────────────────────────────────
    const title = $("h1").first().text().trim() || "월간실적보고서";
    const subtitleCandidates = $("h2, h3, p").slice(0, 3).map((_, el) => $(el).text().trim()).get();
    const subtitle = subtitleCandidates.find((t) => t && t !== title) ?? "";

    // Tables
    type ParsedTable = { title: string; headers: string[]; rows: string[][] };
    const tables: ParsedTable[] = [];
    $("table").each((i, table) => {
      const tTitle =
        $(table).prev("h1,h2,h3,h4,h5").first().text().trim() ||
        $(table).closest("section,div").children("h1,h2,h3,h4").first().text().trim() ||
        `표 ${i + 1}`;

      const headers = $(table)
        .find("thead tr th, thead tr td")
        .map((_, el) => $(el).text().trim())
        .get();

      const rows: string[][] = [];
      $(table)
        .find("tbody tr")
        .each((_, tr) => {
          const cells = $(tr)
            .find("td, th")
            .map((_, td) => $(td).text().trim())
            .get();
          if (cells.length) rows.push(cells);
        });

      // fallback: no thead
      if (!headers.length && !rows.length) {
        $(table)
          .find("tr")
          .each((idx, tr) => {
            const cells = $(tr)
              .find("td, th")
              .map((_, td) => $(td).text().trim())
              .get();
            if (idx === 0) headers.push(...cells);
            else rows.push(cells);
          });
      }

      if (rows.length > 0 || headers.length > 0) {
        tables.push({ title: tTitle.slice(0, 50), headers, rows });
      }
    });

    // ── Build PPT ────────────────────────────────────────────────────
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_16x9";
    pptx.title = title;

    // ── Slide 1 : Cover ──────────────────────────────────────────────
    const s1 = pptx.addSlide();
    s1.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: C.navy } });
    s1.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.06, fill: { color: C.blue } });
    s1.addShape("rect", { x: 0, y: 4.94, w: "100%", h: 0.06, fill: { color: C.indigo } });

    s1.addText("MONTHLY PERFORMANCE REPORT", {
      x: 0.7, y: 1.4, w: 8.6, h: 0.4,
      fontSize: 12, bold: true, color: "93c5fd", align: "left", charSpacing: 2,
    });
    s1.addText(title, {
      x: 0.7, y: 1.85, w: 8.6, h: 1.2,
      fontSize: 38, bold: true, color: C.white, align: "left",
    });
    if (subtitle) {
      s1.addText(subtitle.slice(0, 80), {
        x: 0.7, y: 3.1, w: 8, h: 0.5,
        fontSize: 16, color: "bfdbfe", align: "left",
      });
    }
    const now = new Date();
    s1.addText(`${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, "0")}`, {
      x: 0.7, y: 4.4, w: 3, h: 0.35,
      fontSize: 12, color: "93c5fd", align: "left",
    });

    // ── Slide 2 : Table of Contents ───────────────────────────────────
    if (tables.length > 0) {
      const s2 = pptx.addSlide();
      s2.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: C.slate } });
      s2.addShape("rect", { x: 0, y: 0, w: 0.12, h: "100%", fill: { color: C.navy } });

      s2.addText("목차", {
        x: 0.5, y: 0.35, w: 9, h: 0.55,
        fontSize: 24, bold: true, color: C.navy,
      });
      s2.addShape("rect", { x: 0.5, y: 0.95, w: 9, h: 0.025, fill: { color: C.blue } });

      tables.forEach((t, i) => {
        s2.addText(`${String(i + 1).padStart(2, "0")}  ${t.title}`, {
          x: 0.7, y: 1.2 + i * 0.55, w: 7, h: 0.45,
          fontSize: 14, color: C.text,
        });
        s2.addText(`${i + 3}`, {
          x: 8.8, y: 1.2 + i * 0.55, w: 0.8, h: 0.45,
          fontSize: 14, color: C.sub, align: "right",
        });
        if (i < tables.length - 1) {
          s2.addShape("rect", {
            x: 0.7, y: 1.65 + i * 0.55, w: 9, h: 0.005,
            fill: { color: C.border },
          });
        }
      });
    }

    // ── Slide 3+ : Each Table ─────────────────────────────────────────
    for (const tbl of tables) {
      const slide = pptx.addSlide();
      slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: C.slate } });
      slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: "100%", fill: { color: C.navy } });

      // Title area
      slide.addText(tbl.title, {
        x: 0.4, y: 0.28, w: 9.2, h: 0.55,
        fontSize: 20, bold: true, color: C.navy,
      });
      slide.addShape("rect", { x: 0.4, y: 0.88, w: 9.2, h: 0.03, fill: { color: C.blue } });

      // Build table rows
      const colCount = Math.max(tbl.headers.length, ...tbl.rows.map((r) => r.length), 1);
      const pptRows: ReturnType<typeof cellOpt>[][] = [];

      if (tbl.headers.length > 0) {
        pptRows.push(
          tbl.headers.map((h) =>
            cellOpt(h, { bold: true, bg: C.navy, color: C.white, align: "center" })
          )
        );
      }

      const maxDataRows = 16;
      tbl.rows.slice(0, maxDataRows).forEach((row, ri) => {
        const bg = ri % 2 === 0 ? C.white : C.stripe;
        const normalizedRow = Array.from({ length: colCount }, (_, ci) => row[ci] ?? "");
        pptRows.push(
          normalizedRow.map((cell, ci) =>
            cellOpt(cell, { bg, align: ci === 0 ? "left" : "center" })
          )
        );
      });

      if (tbl.rows.length > maxDataRows) {
        pptRows.push([
          cellOpt(`… 외 ${tbl.rows.length - maxDataRows}행`, {
            bg: C.light, color: C.sub, align: "center",
          }),
          ...Array.from({ length: colCount - 1 }, () => cellOpt("", { bg: C.light })),
        ]);
      }

      if (pptRows.length > 0) {
        const colW = 9.2 / colCount;
        slide.addTable(pptRows as PptxGenJS.TableRow[], {
          x: 0.4,
          y: 1.05,
          w: 9.2,
          rowH: 0.34,
          colW: Array(colCount).fill(colW),
          border: { type: "solid", color: C.border, pt: 0.5 },
        });
      }

      // Page number
      slide.addText(`${tables.indexOf(tbl) + 3}`, {
        x: 9.0, y: 4.85, w: 0.8, h: 0.25,
        fontSize: 9, color: C.sub, align: "right",
      });
    }

    // ── Return buffer ─────────────────────────────────────────────────
    const pptxBuffer = await pptx.write({ outputType: "nodebuffer" });
    const encodedName = encodeURIComponent("월간실적보고서.pptx");

    return new NextResponse(pptxBuffer as Buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
      },
    });
  } catch (error) {
    console.error("PPT 내보내기 오류:", error);
    return NextResponse.json({ error: "PPT 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
