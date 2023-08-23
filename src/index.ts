import { ImageResponse } from 'workers-og';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const params = new URLSearchParams(new URL(request.url).search);
		const title = params.get('title') || 'Lorem ipsum';

		// Split the title into lines of max 25 characters
		const lines = title
			.trim()
			.split(/(.{0,25})(?:\s|$)/g)
			.filter(Boolean);

		// Map the lines to your placeholders
		const data: Record<string, string> = {
			line1: lines[0],
			line2: lines[1],
			line3: lines[2],
		};

		const inter400ArrayBuffer = await env.WORKER_OG.get('inter400', 'arrayBuffer');
		const ogIconBase64 = await env.WORKER_OG.get('ogIconBase64', 'text');

		const html = `
      <div
        style="
          background: black;
          height: 100%;
          width: 100%;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;"
      >
        <div style="
          display: flex;
          align-items: center;
          justify-content: flex-start;
          height: 100%;"
        >
          <div style="
            display: flex;
            align-items: flex-start;
            width: 100%;
            padding: 8rem 6rem;"
          >
            <img
              style="margin-top: 2rem"
              height="92"
              src="data:image/png;base64,${ogIconBase64}"
              width="92"
            />
            <h1 style="
              padding-left: 3rem;
              font-size: 60px;
              color: white;
              font-weight: bold;
              text-align: left;"
            >
                ${title}
            </h1>
            </div>
        </div>
    </div>
    `;

		return new ImageResponse(html, {
			width: 1200,
			height: 630,
			fonts: [
				{
					name: 'Inter',
					data: inter400ArrayBuffer,
					style: 'normal',
				},
			],
		});
	},
};
