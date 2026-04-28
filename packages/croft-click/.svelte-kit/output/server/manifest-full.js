export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.svg"]),
	mimeTypes: {".svg":"image/svg+xml"},
	_: {
		client: {start:"_app/immutable/entry/start.BcxNmw3y.js",app:"_app/immutable/entry/app.BPQrlu07.js",imports:["_app/immutable/entry/start.BcxNmw3y.js","_app/immutable/chunks/C0yNXVWO.js","_app/immutable/chunks/vLEuCWTH.js","_app/immutable/chunks/bMqbrXgk.js","_app/immutable/entry/app.BPQrlu07.js","_app/immutable/chunks/vLEuCWTH.js","_app/immutable/chunks/BI-LeihI.js","_app/immutable/chunks/DMY-DcD8.js","_app/immutable/chunks/bMqbrXgk.js","_app/immutable/chunks/lydTNRRv.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
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
