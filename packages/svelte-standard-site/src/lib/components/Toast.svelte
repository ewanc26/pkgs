<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export type ToastType = 'success' | 'error' | 'info' | 'warning';

	export interface ToastMessage {
		id: string;
		message: string;
		type: ToastType;
		duration?: number;
	}

	interface Props {
		toasts: ToastMessage[];
		position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
		hasTheme?: boolean;
	}

	const { toasts, position = 'bottom-right', hasTheme = false }: Props = $props();

	const dispatch = createEventDispatcher<{ dismiss: string }>();

	function dismiss(id: string) {
		dispatch('dismiss', id);
	}
</script>

<div class="toast-container {position}" class:themed={hasTheme}>
	{#each toasts as toast}
		<div
			class="toast {toast.type}"
			class:themed={hasTheme}
			role="alert"
			aria-live="polite"
		>
			<div class="toast-icon">
				{#if toast.type === 'success'}
					<svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else if toast.type === 'error'}
					<svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else if toast.type === 'warning'}
					<svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
						<path
							fill-rule="evenodd"
							d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.516-2.63l6.28-10.875zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					<svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</div>
			<span class="toast-message">{toast.message}</span>
			<button class="toast-dismiss" onclick={() => dismiss(toast.id)} aria-label="Dismiss">
				<svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
					<path
						d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
					/>
				</svg>
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 24rem;
	}

	.top-right {
		top: 1rem;
		right: 1rem;
	}

	.top-left {
		top: 1rem;
		left: 1rem;
	}

	.bottom-right {
		bottom: 1rem;
		right: 1rem;
	}

	.bottom-left {
		bottom: 1rem;
		left: 1rem;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
		animation: slide-in 0.2s ease-out;
	}

	@keyframes slide-in {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.toast.success {
		background-color: rgb(220 252 231);
		color: rgb(22 101 52);
	}

	.toast.error {
		background-color: rgb(254 226 226);
		color: rgb(185 28 28);
	}

	.toast.warning {
		background-color: rgb(254 249 195);
		color: rgb(161 98 7);
	}

	.toast.info {
		background-color: rgb(239 246 255);
		color: rgb(30 64 175);
	}

	.toast-icon {
		flex-shrink: 0;
	}

	.toast-message {
		flex: 1;
		font-size: 0.875rem;
	}

	.toast-dismiss {
		flex-shrink: 0;
		padding: 0.25rem;
		border-radius: 0.25rem;
		background: transparent;
		border: none;
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.15s;
	}

	.toast-dismiss:hover {
		opacity: 1;
	}
</style>
