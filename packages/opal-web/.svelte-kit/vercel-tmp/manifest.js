export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["client-metadata.json","logo/Opal.svg","og.svg","robots.txt"]),
	mimeTypes: {".json":"application/json",".svg":"image/svg+xml",".txt":"text/plain"},
	_: {
		client: {start:"_app/immutable/entry/start.BpeoKpAn.js",app:"_app/immutable/entry/app.Cyu1ezEl.js",imports:["_app/immutable/entry/start.BpeoKpAn.js","_app/immutable/chunks/cTR0NaAQ.js","_app/immutable/chunks/KvXtuy0P.js","_app/immutable/chunks/DIqEgxI-.js","_app/immutable/entry/app.Cyu1ezEl.js","_app/immutable/chunks/KvXtuy0P.js","_app/immutable/chunks/PxZ7_Rs5.js","_app/immutable/chunks/DIqEgxI-.js","_app/immutable/chunks/BdX3pJC1.js","_app/immutable/chunks/BMAd1sdK.js","_app/immutable/chunks/vm8EO2as.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js')),
			__memo(() => import('../output/server/nodes/2.js')),
			__memo(() => import('../output/server/nodes/3.js')),
			__memo(() => import('../output/server/nodes/4.js'))
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
				id: "/about",
				pattern: /^\/about\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/import",
				pattern: /^\/import\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
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
