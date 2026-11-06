import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { PublicSimulateurComponent } from './pages/public-simulateur/public-simulateur.component';
import { authGuard, authChildGuard, adminGuard, agentGuard } from './core/guards/auth.guard';

export const routes: Routes = [

  // ── Public ─────────────────────────────────────────────
  { path: '',           component: HomeComponent, pathMatch: 'full' },
  { path: 'home',       component: HomeComponent },
  { path: 'login',      component: LoginComponent },
  { path: 'register',   component: RegisterComponent },
  { path: 'simulateur', component: PublicSimulateurComponent },


  // ── Credit ─────────────────────────────────────────────
  {
    path: 'credit',
    canActivate: [authGuard],
    loadChildren: () => import('./features/credit/credit.module').then(m => m.CreditModule)
  },

  // ── User ───────────────────────────────────────────────
  {
    path: 'user',
    canActivate: [agentGuard],
    canActivateChild: [agentGuard],
    loadChildren: () => import('./features/user/User/user.routes').then(m => m.routes)
  },
  {
    path: 'user/kyc-doc',
    canActivate: [agentGuard],
    loadChildren: () => import('./features/user/KycDocument/kyc-document.routes').then(m => m.routes)
  },

  // ── Wallet ─────────────────────────────────────────────
  {
    path: 'wallet',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadChildren: () => import('./features/wallet/Wallet/wallet.routes').then(m => m.routes)
  },
  {
    path: 'wallet/transactions',
    canActivate: [authGuard],
    loadChildren: () => import('./features/wallet/Transaction/transaction.routes').then(m => m.routes)
  },
  {
    path: 'wallet/audit',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/wallet/TransactionAuditLog/transaction-audit-log.routes').then(m => m.routes)
  },
  {
    path: 'wallet/loan-transactions',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/wallet/TransactionLoan/transaction-loan.routes').then(m => m.routes)
  },
  {
    path: 'wallet/virtual-card',
    canActivate: [authGuard],
    loadChildren: () => import('./features/wallet/VirtualCard/virtual-card.routes').then(m => m.routes)
  },

  // ── Support ────────────────────────────────────────────
  {
    path: 'support/notifications',
    canActivate: [authGuard],
    loadChildren: () => import('./features/support/Notification/notification.routes').then(m => m.routes)
  },
  {
    path: 'support/reclamations',
    canActivate: [authGuard],
    loadChildren: () => import('./features/support/Reclamation/reclamation.routes').then(m => m.routes)
  },
  {
    path: 'support/reclamation-attachments',
    canActivate: [authGuard],
    loadChildren: () => import('./features/support/ReclamationAttachment/reclamation-attachment.routes').then(m => m.routes)
  },
  {
    path: 'support/reclamation-history',
    canActivate: [authGuard],
    loadChildren: () => import('./features/support/ReclamationHistory/reclamation-history.routes').then(m => m.routes)
  },
  {
    path: 'support/reclamation-messages',
    canActivate: [authGuard],
    loadChildren: () => import('./features/support/ReclamationMessage/reclamation-message.routes').then(m => m.routes)
  },


  // ── Investment ─────────────────────────────────────────
  {
    path: 'investissement/chart',
    canActivate: [authGuard],
    loadChildren: () => import('./features/investment/investment.routes').then(m => m.routes)
  },
  {
    path: 'investissement/assets',
    canActivate: [authGuard],
    loadChildren: () => import('./features/investment/InvestmentAsset/investment-asset.routes').then(m => m.routes)
  },
  {
    path: 'investissement/orders',
    canActivate: [authGuard],
    loadChildren: () => import('./features/investment/InvestmentOrder/investment-order.routes').then(m => m.routes)
  },
  {
    path: 'investissement/strategies',
    canActivate: [authGuard],
    loadChildren: () => import('./features/investment/InvestmentStrategy/investment-strategy.routes').then(m => m.routes)
  },
  {
    path: 'investissement/portfolio',
    canActivate: [authGuard],
    loadChildren: () => import('./features/investment/PortfolioPosition/portfolio-position.routes').then(m => m.routes)
  },

  // ── Fallback ───────────────────────────────────────────
  { path: '**', redirectTo: '' }
];
