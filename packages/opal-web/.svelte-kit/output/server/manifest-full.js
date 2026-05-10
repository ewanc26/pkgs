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
		client: {start:"_app/immutable/entry/start.DxTGPUJ3.js",app:"_app/immutable/entry/app.BR4fJfSd.js",imports:["_app/immutable/entry/start.DxTGPUJ3.js","_app/immutable/chunks/C3foBj0y.js","_app/immutable/chunks/C9ycXwdM.js","_app/immutable/chunks/BXMgjFSP.js","_app/immutable/entry/app.BR4fJfSd.js","_app/immutable/chunks/C9ycXwdM.js","_app/immutable/chunks/CnBaZEsy.js","_app/immutable/chunks/BXMgjFSP.js","_app/immutable/chunks/mvCUnwHR.js","_app/immutable/chunks/BswsiB5H.js","_app/immutable/chunks/D_zWhSq2.js","_app/immutable/chunks/D7PBw_Wm.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js'))
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
