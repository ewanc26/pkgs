export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["client-metadata.json","logo/Opal.svg","robots.txt"]),
	mimeTypes: {".json":"application/json",".svg":"image/svg+xml",".txt":"text/plain"},
	_: {
		client: {start:"_app/immutable/entry/start.PUVNC_Sy.js",app:"_app/immutable/entry/app.BhgqRTev.js",imports:["_app/immutable/entry/start.PUVNC_Sy.js","_app/immutable/chunks/Qp3B5XMG.js","_app/immutable/chunks/9VeCAWtE.js","_app/immutable/chunks/DhRmkkCw.js","_app/immutable/entry/app.BhgqRTev.js","_app/immutable/chunks/9VeCAWtE.js","_app/immutable/chunks/DdeFJgsq.js","_app/immutable/chunks/DhRmkkCw.js","_app/immutable/chunks/isM9luo4.js","_app/immutable/chunks/CQmILjMx.js","_app/immutable/chunks/BKqvpmVb.js","_app/immutable/chunks/C_hTd_0H.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js')),
			__memo(() => import('../output/server/nodes/2.js')),
			__memo(() => import('../output/server/nodes/3.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/import",
				pattern: /^\/import\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
