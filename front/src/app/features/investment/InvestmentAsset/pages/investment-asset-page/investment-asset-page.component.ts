import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetCategory, AssetRiskLevel, InvestmentAsset } from '../../models/investment-asset.model';
import { InvestmentAssetVm } from '../../vm/investment-asset.vm';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-investment-asset-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investment-asset-page.component.html',
  styleUrl: './investment-asset-page.component.scss'
})
export class InvestmentAssetPageComponent implements OnInit {
  private readonly vm = inject(InvestmentAssetVm);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  errorMessage = '';

  assets: InvestmentAsset[] = [];

  searchTerm = '';
  categoryFilter: 'ALL' | AssetCategory = 'ALL';
  riskFilter: 'ALL' | AssetRiskLevel = 'ALL';

  readonly categoryOptions: Array<'ALL' | AssetCategory> = ['ALL', 'STOCK', 'CRYPTO', 'BOND', 'ETF', 'COMMODITY'];
  readonly riskOptions: Array<'ALL' | AssetRiskLevel> = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  ngOnInit(): void {
    this.loadAssets();
  }

  // ---- CRUD UI state ----
  formVisible = false;
  isEditing = false;
  editingAsset: Partial<InvestmentAsset> = {};

  showCreateForm(): void {
    this.formVisible = true;
    this.isEditing = false;
    this.editingAsset = { symbol: '', assetName: '', category: 'STOCK', riskLevel: 'MEDIUM' };
  }

  showEditForm(asset: InvestmentAsset): void {
    this.formVisible = true;
    this.isEditing = true;
    this.editingAsset = { ...asset };
  }

  cancelForm(): void {
    this.formVisible = false;
    this.editingAsset = {};
  }

  saveAsset(): void {
    const payload: Partial<InvestmentAsset> = {
      symbol: this.editingAsset.symbol,
      assetName: this.editingAsset.assetName,
      category: this.editingAsset.category as AssetCategory,
      riskLevel: this.editingAsset.riskLevel as AssetRiskLevel
    };

    this.loading = true;
    this.errorMessage = '';

    if (this.isEditing && this.editingAsset.assetId) {
      this.vm.update(this.editingAsset.assetId, payload).subscribe({
        next: () => {
          this.formVisible = false;
          this.loadAssets();
        },
        error: () => {
          this.errorMessage = 'Unable to update the asset.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.vm.create(payload).subscribe({
        next: () => {
          this.formVisible = false;
          this.loadAssets();
        },
        error: () => {
          this.errorMessage = 'Unable to create the asset.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteAsset(asset: InvestmentAsset): void {
    const confirmed = window.confirm('Delete this asset?');
    if (!confirmed || !asset.assetId) return;

    this.loading = true;
    this.vm.delete(asset.assetId).subscribe({
      next: () => this.loadAssets(),
      error: () => {
        this.errorMessage = 'Unable to delete the asset.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get filteredAssets(): InvestmentAsset[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.assets.filter((asset) => {
      const matchesSearch =
        !term ||
        asset.assetName.toLowerCase().includes(term) ||
        asset.symbol.toLowerCase().includes(term);

      const matchesCategory = this.categoryFilter === 'ALL' || asset.category === this.categoryFilter;
      const matchesRisk = this.riskFilter === 'ALL' || asset.riskLevel === this.riskFilter;

      return matchesSearch && matchesCategory && matchesRisk;
    });
  }

  get stocksCount(): number {
    return this.assets.filter((asset) => asset.category === 'STOCK').length;
  }

  get highRiskCount(): number {
    return this.assets.filter((asset) => asset.riskLevel === 'HIGH' || asset.riskLevel === 'VERY_HIGH').length;
  }

  get uniqueCategoriesCount(): number {
    return new Set(this.assets.map((asset) => asset.category)).size;
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchTerm = input?.value ?? '';
  }

  onCategoryFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const value = (select?.value ?? 'ALL') as 'ALL' | AssetCategory;
    this.categoryFilter = value;
  }

  onRiskFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const value = (select?.value ?? 'ALL') as 'ALL' | AssetRiskLevel;
    this.riskFilter = value;
  }

  loadAssets(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.vm.findAll().subscribe({
      next: (assets) => {
        this.assets = assets;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load assets right now.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getRiskBadgeClass(riskLevel: AssetRiskLevel): string {
    switch (riskLevel) {
      case 'LOW':
        return 'badge badge--low';
      case 'MEDIUM':
        return 'badge badge--medium';
      case 'HIGH':
      case 'VERY_HIGH':
        return 'badge badge--high';
      default:
        return 'badge';
    }
  }
}
