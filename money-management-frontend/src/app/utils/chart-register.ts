import { Chart, registerables } from 'chart.js';

let chartsRegistered = false;

export function ensureChartsRegistered(): void {
    if (chartsRegistered) {
        return;
    }

    Chart.register(...registerables);
    chartsRegistered = true;
}
