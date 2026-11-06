import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface PortfolioTopPosition {
  assetSymbol: string;
  currentValue: number;
  profitLossDollars: number;
  profitLossPercentage: number;
  portfolioSharePct: number;
}

@Component({
  selector: 'app-investment-insight',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './investment-insight.component.html',
  styleUrls: ['./investment-insight.component.scss']
})
export class InvestmentInsightComponent {
  readonly analysis = input<any>(null);
  readonly loading = input(false);
  readonly error = input('');
  readonly positions = input<PortfolioTopPosition[]>([]);
  readonly positionsLoading = input(false);
  readonly totalValue = input(0);

  readonly refresh = output<void>();

  readonly detailOpen = signal(false);

  // Keep the details accordion collapsed whenever a new analysis is loaded.
  private readonly resetDetailOnAnalysis = effect(() => {
    this.analysis();
    this.detailOpen.set(false);
  });

  readonly sentimentLabel = computed(() => {
    const sentiment = this.analysis()?.sentiment || 'neutral';
    const labels: { [key: string]: string } = {
      bullish: '📈 Haussier',
      bearish: '📉 Baissier',
      neutral: '➡️ Neutre'
    };
    return labels[sentiment] || 'Neutre';
  });

  formatPercentage(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '-';
    }

    return `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
  }

  formatYield(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '-';
    }

    return `${Number(value).toFixed(2)}%`;
  }

  getTrendBadgeClass(trend: string): string {
    const normalized = String(trend || '').toLowerCase();

    if (normalized === 'bullish') return 'is-bullish';
    if (normalized === 'bearish') return 'is-bearish';
    return 'is-neutral';
  }

  getSeverityClass(severity: string): string {
    const normalized = String(severity || '').toLowerCase();

    if (normalized === 'high') return 'is-high';
    if (normalized === 'medium') return 'is-medium';
    return 'is-low';
  }
}
