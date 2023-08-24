import { ImageResponse } from 'workers-og';

export default {
  // @ts-ignore
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const params = new URLSearchParams(new URL(request.url).search);
		const title = params.get('title') || 'Lorem ipsum';

		const inter400 = await env.WORKER_OG.get('inter400', 'arrayBuffer');
		const ogIconBase64 = await env.WORKER_OG.get('ogIconBase64', 'text');

		const html = `
      <div style="
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
              height="92"
              width="92"
              src="data:image/png;base64,${ogIconBase64}"
            />
            <div style="
              display: flex;
              align-items: flex-start;
              flex-direction: column;
              padding-left: 3rem;"
            >
              <span style="
                font-size: 28px;
                color: #999999;
                text-align: left;
                padding-bottom: 0.4rem"
              >
                Vinh Pham
              </span>
              <span style="
                font-size: 60px;
                color: white;
                text-align: left;"
              >
                ${title}
              </span>
            </div>
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
					data: inter400,
					style: 'normal',
				},
			],
		});
	},
};
