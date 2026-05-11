/**
 * Shared Chart.js registration.
 *
 * Import only the modules actually used by Tourmaline's charts,
 * rather than the full `registerables` bundle (~200KB).
 *
 * Components should import `Chart` from here, not from `chart.js` directly.
 */
import {
	Chart,
	BarController,
	BarElement,
	RadarController,
	RadialLinearScale,
	CategoryScale,
	LinearScale,
	Filler,
	Tooltip,
	Legend
} from 'chart.js';

Chart.register(
	BarController,
	BarElement,
	RadarController,
	RadialLinearScale,
	CategoryScale,
	LinearScale,
	Filler,
	Tooltip,
	Legend
);

export { Chart };
