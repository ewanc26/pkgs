
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const GC_INITIAL_HEAP_SIZE: string;
	export const USER_CWD: string;
	export const LETTA_RESTORE_ENABLED_CHANNELS: string;
	export const NIX_PROFILES: string;
	export const PERSIST_CWD: string;
	export const NODE: string;
	export const INIT_CWD: string;
	export const TERM: string;
	export const SHELL: string;
	export const TMPDIR: string;
	export const GIT_CONFIG_VALUE_0: string;
	export const npm_config_npm_globalconfig: string;
	export const NODE_OPTIONS: string;
	export const ORIGINAL_XDG_CURRENT_DESKTOP: string;
	export const MallocNanoZone: string;
	export const LETTA_MEMFS_GIT_PROXY_BASE_URL: string;
	export const VIPSHOME: string;
	export const npm_config_registry: string;
	export const GIT_TERMINAL_PROMPT: string;
	export const USER: string;
	export const LETTA_CHANNEL_RUNTIME_ROOT: string;
	export const COMMAND_MODE: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const LETTA_DESKTOP_DEBUG_PANEL: string;
	export const npm_config_globalconfig: string;
	export const SSH_AUTH_SOCK: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const npm_execpath: string;
	export const PAGER: string;
	export const ELECTRON_RUN_AS_NODE: string;
	export const npm_config_frozen_lockfile: string;
	export const npm_config_verify_deps_before_run: string;
	export const XDG_CONFIG_DIRS: string;
	export const LETTA_CONVERSATION_ID: string;
	export const PATH: string;
	export const TERMINFO_DIRS: string;
	export const npm_package_json: string;
	export const STARSHIP_CONFIG: string;
	export const GIT_CONFIG_KEY_0: string;
	export const __CFBundleIdentifier: string;
	export const PWD: string;
	export const npm_command: string;
	export const npm_lifecycle_event: string;
	export const EDITOR: string;
	export const npm_config__jsr_registry: string;
	export const npm_package_name: string;
	export const LETTA_BASE_URL: string;
	export const GIT_CONFIG_COUNT: string;
	export const NODE_PATH: string;
	export const XPC_FLAGS: string;
	export const NIX_SSL_CERT_FILE: string;
	export const npm_config_node_gyp: string;
	export const GCM_INTERACTIVE: string;
	export const XPC_SERVICE_NAME: string;
	export const pnpm_config_verify_deps_before_run: string;
	export const npm_package_version: string;
	export const SSH_ASKPASS: string;
	export const AGENT_ID: string;
	export const SHLVL: string;
	export const MANPAGER: string;
	export const HOME: string;
	export const LETTA_AGENT_ID: string;
	export const npm_config_store_dir: string;
	export const LOGNAME: string;
	export const LETTA_API_KEY: string;
	export const npm_lifecycle_script: string;
	export const XDG_DATA_DIRS: string;
	export const CONVERSATION_ID: string;
	export const npm_config_user_agent: string;
	export const GIT_ASKPASS: string;
	export const OSLogRateLimit: string;
	export const GIT_PAGER: string;
	export const __HM_SESS_VARS_SOURCED: string;
	export const npm_node_execpath: string;
	export const __HM_ZSH_SESS_VARS_SOURCED: string;
	export const NIX_USER_PROFILE_DIR: string;
	export const __NIX_DARWIN_SET_ENVIRONMENT_DONE: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		GC_INITIAL_HEAP_SIZE: string;
		USER_CWD: string;
		LETTA_RESTORE_ENABLED_CHANNELS: string;
		NIX_PROFILES: string;
		PERSIST_CWD: string;
		NODE: string;
		INIT_CWD: string;
		TERM: string;
		SHELL: string;
		TMPDIR: string;
		GIT_CONFIG_VALUE_0: string;
		npm_config_npm_globalconfig: string;
		NODE_OPTIONS: string;
		ORIGINAL_XDG_CURRENT_DESKTOP: string;
		MallocNanoZone: string;
		LETTA_MEMFS_GIT_PROXY_BASE_URL: string;
		VIPSHOME: string;
		npm_config_registry: string;
		GIT_TERMINAL_PROMPT: string;
		USER: string;
		LETTA_CHANNEL_RUNTIME_ROOT: string;
		COMMAND_MODE: string;
		PNPM_SCRIPT_SRC_DIR: string;
		LETTA_DESKTOP_DEBUG_PANEL: string;
		npm_config_globalconfig: string;
		SSH_AUTH_SOCK: string;
		__CF_USER_TEXT_ENCODING: string;
		npm_execpath: string;
		PAGER: string;
		ELECTRON_RUN_AS_NODE: string;
		npm_config_frozen_lockfile: string;
		npm_config_verify_deps_before_run: string;
		XDG_CONFIG_DIRS: string;
		LETTA_CONVERSATION_ID: string;
		PATH: string;
		TERMINFO_DIRS: string;
		npm_package_json: string;
		STARSHIP_CONFIG: string;
		GIT_CONFIG_KEY_0: string;
		__CFBundleIdentifier: string;
		PWD: string;
		npm_command: string;
		npm_lifecycle_event: string;
		EDITOR: string;
		npm_config__jsr_registry: string;
		npm_package_name: string;
		LETTA_BASE_URL: string;
		GIT_CONFIG_COUNT: string;
		NODE_PATH: string;
		XPC_FLAGS: string;
		NIX_SSL_CERT_FILE: string;
		npm_config_node_gyp: string;
		GCM_INTERACTIVE: string;
		XPC_SERVICE_NAME: string;
		pnpm_config_verify_deps_before_run: string;
		npm_package_version: string;
		SSH_ASKPASS: string;
		AGENT_ID: string;
		SHLVL: string;
		MANPAGER: string;
		HOME: string;
		LETTA_AGENT_ID: string;
		npm_config_store_dir: string;
		LOGNAME: string;
		LETTA_API_KEY: string;
		npm_lifecycle_script: string;
		XDG_DATA_DIRS: string;
		CONVERSATION_ID: string;
		npm_config_user_agent: string;
		GIT_ASKPASS: string;
		OSLogRateLimit: string;
		GIT_PAGER: string;
		__HM_SESS_VARS_SOURCED: string;
		npm_node_execpath: string;
		__HM_ZSH_SESS_VARS_SOURCED: string;
		NIX_USER_PROFILE_DIR: string;
		__NIX_DARWIN_SET_ENVIRONMENT_DONE: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
