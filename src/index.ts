import { ImageResponse } from 'workers-og';

const handler: ExportedHandler = {
	async fetch(request, env, ctx) {
		const params = new URLSearchParams(new URL(request.url).search);
		const title = params.get('title') || 'vinh.dev';

		// @ts-ignore
		const inter600 = await env.WORKER_OG.get('inter600', 'arrayBuffer');
		// @ts-ignore
		const logo = await env.WORKER_OG.get('logo', 'text');
		// @ts-ignore
		const ogBackground = await env.WORKER_OG.get('ogBackground', 'text');

		const html = `
      <div style="
        backgroundColor: #292929;
        backgroundSize: 1200px 630px;
        height: 100%;
        width: 100%;
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;"
      >
        <div style="
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          height: 100%;
          width: 100%;
          padding: 5rem;"
        >
          <div style="
            display: flex;
            justify-content: flex-start;
            align-items: center;"
          >
            <span style="
              font-size: 60px;
              letter-spacing: -.05em;
              color: #d6d6d6;
              padding: .25em 1.5rem 0 1.5rem;"
            >
              vinh.dev
            </span>
            <img
              style="marginLeft: 0.25rem;"
              height="48"
              width="48"
              src="${logo}"
            />
          </div>
          <h1 style="
            font-size: 60px;
            letter-spacing: -.05em;
            color: white;
            padding: .25em 1.5rem 0 1.5rem;"
          >
            ${title}
          </h1>
        </div>
      </div>
    `;

		return new ImageResponse(html, {
			width: 1200,
			height: 630,
			fonts: [
				{
					name: 'Inter',
					data: inter600,
					style: 'normal',
				},
			],
		});
	},
};

export default handler;
