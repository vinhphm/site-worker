import { ImageResponse } from 'workers-og';

const handler: ExportedHandler = {
	async fetch(request, env, ctx) {
		const params = new URLSearchParams(new URL(request.url).search);
		const title = params.get('title') || 'Vinh Pham';

		// @ts-ignore
		const geist500 = await env.WORKER_OG.get('geist500', 'arrayBuffer');
		// @ts-ignore
		const logo = await env.WORKER_OG.get('logo', 'text');
		// @ts-ignore
		const ogBackground = await env.WORKER_OG.get('ogBackground', 'text');

		const html = `
      <div style="
        backgroundImage: url(${ogBackground});
        backgroundRepeat: no-repeat;
        backgroundPosition: center;
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
            justify-content: flex-start;"
          >
            <img
              height="92"
              width="92"
              src="${logo}"
            />
            <span style="
              width: 42px;
              margin-left: 4px;
              border-bottom: 8px solid white;"
            >
            </span>
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
					name: 'Geist',
					data: geist500,
					style: 'normal',
				},
			],
		});
	},
};

export default handler;
