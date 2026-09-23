import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Social preview (X, Telegram, Discord…), rendered once at build time into
// out/og.png. A route rather than opengraph-image.tsx so the file keeps its
// .png extension: GitHub Pages picks the content type from it.
export const dynamic = "force-static";

const size = { width: 1200, height: 630 };

const LIME = "#ccff00";
const ORANGE = "#ff4b1f";
const BNB = "#f0b90b";
const BG = "#0a0a00";
const DIM = "#888870";

/** The site's fonts from Google Fonts. Without a browser user agent the API serves TTF, which satori reads. */
async function googleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`)).text();
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error(`${family}: no TTF in the Google Fonts response`);
  return (await fetch(url)).arrayBuffer();
}

export async function GET() {
  const [barlow, mono, logo] = await Promise.all([
    googleFont("Barlow Condensed", 900),
    googleFont("Share Tech Mono", 400),
    readFile(join(process.cwd(), "public/favicon.svg")),
  ]);
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;
  const corner = (pos: Record<string, number>, sides: string) => (
    <div style={{
      position: "absolute", width: 36, height: 36, ...pos,
      borderColor: ORANGE, borderStyle: "solid",
      borderTopWidth: sides.includes("t") ? 4 : 0, borderBottomWidth: sides.includes("b") ? 4 : 0,
      borderLeftWidth: sides.includes("l") ? 4 : 0, borderRightWidth: sides.includes("r") ? 4 : 0,
    }}/>
  );

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", background: BG, position: "relative",
        fontFamily: "Share Tech Mono",
      }}>
        {corner({ top: 40, left: 40 }, "tl")}
        {corner({ top: 40, right: 40 }, "tr")}
        {corner({ bottom: 40, left: 40 }, "bl")}
        {corner({ bottom: 40, right: 40 }, "br")}

        <div style={{ display: "flex", fontSize: 28, letterSpacing: 8, color: ORANGE, whiteSpace: "pre" }}>
          <span>{"// BACKED BY "}</span><span style={{ color: BNB }}>BNB</span><span>. BRIX BY BRIX.</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginTop: 30, fontFamily: "Barlow Condensed", fontSize: 170, fontWeight: 900, lineHeight: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- satori renders plain <img> only */}
          <img src={logoSrc} width={108} height={108} style={{ marginRight: 26 }} alt=""/>
          <span style={{ color: "#e8e8e0" }}>$</span>
          <span style={{ color: LIME }}>BRIX</span>
          <span style={{ color: "#e8e8e0", marginLeft: 36 }}>BURNS</span>
          <span style={{ color: ORANGE }}>.</span>
        </div>

        <div style={{
          display: "flex", marginTop: 40, padding: "14px 34px", border: `2px solid ${ORANGE}`,
          background: "rgba(255,75,31,.08)", color: ORANGE, fontSize: 40, letterSpacing: 8,
        }}>
          THE FLOOR RISES.
        </div>

        <div style={{ display: "flex", marginTop: 44, fontSize: 24, letterSpacing: 4, color: DIM }}>
          BNB CHAIN · 2,222 TRIXSTERS ON ROBINHOOD CHAIN · BRIX-BURNS.COM
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Barlow Condensed", data: barlow, weight: 900, style: "normal" },
        { name: "Share Tech Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
