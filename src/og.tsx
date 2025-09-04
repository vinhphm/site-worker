import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api"
import { Hono } from "hono"
import { getLocalFonts } from "./getFonts"
import { loadImage } from "./loadImage"

// HTTP status codes
const HTTP_INTERNAL_SERVER_ERROR = 500

const app = new Hono<{ Bindings: Env }>()

export default app.get("/", async (c) => {
  try {
    const { title } = c.req.query()

    // Add input validation
    if (!title) {
      throw new Error("Missing required query parameters")
    }

    const SocialCardTemplate = await (async () => {
      const style = c.req.query("style")

      switch (style) {
        default:
          return Style1()
      }
    })()

    // ---------------------------------------- //
    // Font Configuration

    // ********************** Google Fonts ********************** //
    // const font = await googleFont(
    //  `${mainText ?? ''}${description ?? ''}${footerText ?? ''}`,
    //  'Noto Sans JP',
    //  900,
    //  'normal'
    // );

    // ********************** Github Fonts ********************** //
    // const font = await githubFonts();

    // ********************** Direct Font ********************** //
    // const font = await directFont(
    //  'https://github.com/Synesthesias/PLATEAU-SDK-for-Unity-GameSample/raw/refs/heads/main/Assets/Font/DotGothic16-Regular.ttf',
    //  'DotGothic16',
    //  400,
    //  'normal'
    // );

    // ********************** Local Font ********************** //
    // const font = await getLocalFont(c, 'Poppins-Regular.ttf', 400, 'normal');

    // ********************** Local Fonts ********************** //
    const font = await getLocalFonts(c, [
      { path: "Inter-SemiBold.ttf", weight: 600 },
    ])

    // END Font Configuration

    // console.log(font);
    // -----------------------------------------

    // http://127.0.0.1:8787/og?title=Building%20the%20Future%20of%20Web%20Development
    async function Style1() {
      try {
        const logo = await loadImage(c, "/images/logo.png")

        return (
          <div
            style={{
              backgroundColor: "#F0EFEA",
              backgroundSize: "1200px 630px",
              height: "100%",
              width: "100%",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-start",
                height: "100%",
                width: "100%",
                padding: "5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "48px",
                    letterSpacing: "-.05em",
                    color: "#717170",
                    padding: "0.125em 1.5rem 0 1.5rem",
                  }}
                >
                  vinh.dev
                </span>
                {logo && (
                  <img
                    alt="vinh.dev"
                    height="40"
                    src={logo}
                    style={{ marginLeft: "0.1rem" }}
                    width="40"
                  />
                )}
              </div>
              <h1
                style={{
                  fontSize: "60px",
                  letterSpacing: "-.05em",
                  color: "#141412",
                  padding: ".25em 1.5rem 0 1.5rem",
                }}
              >
                {title}
              </h1>
            </div>
          </div>
        )
      } catch (error) {
        console.error("Style3 rendering error:", error)
        throw error
      }
    }

    return new ImageResponse(SocialCardTemplate, {
      width: 1200,
      height: 630,
      fonts: Array.isArray(font) ? [...font] : [font],
    })
  } catch (error: any) {
    console.error("OG Image generation error:", error)
    return c.json(
      { error: "Failed to generate image", details: error.message },
      HTTP_INTERNAL_SERVER_ERROR
    )
  }
})
