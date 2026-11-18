// backend/routes/equityFinance.js
import express from 'express';
import { auth, requirePermission } from '../middleware/auth.js';
import {
  getFinancialDashboard,
  getCashFlowStatement,
  getProfitAndLoss,
  getBalanceSheet,
  getAccounts,
  createAccount,
  transferFunds,
  getEquityDetails,
  recordCapitalContribution,
  recordOwnerWithdrawal,
  getGeneralLedger,
  createJournalEntry,
  getReceivables,
  getPayables,
  getInventoryValuation
} from '../controllers/equityFinanceController.js';

const router = express.Router();

// Enforce authentication AND feature-level permission on ALL endpoints in this module
router.use(auth);
router.use(requirePermission('equityFinance'));

// 1. Financial Dashboard
router.get('/dashboard', getFinancialDashboard);

// 2. Cash Flow Statement
router.get('/cash-flow', getCashFlowStatement);

// 3. Profit & Loss / Income Statement
router.get('/profit-and-loss', getProfitAndLoss);

// 4. Balance Sheet
router.get('/balance-sheet', getBalanceSheet);

// 5. Chart of Accounts (Cash, Bank, Mobile Money)
router.get('/accounts', getAccounts);
router.post('/accounts', createAccount);
router.post('/transfers', transferFunds);

// 6. Owner's Equity & Capital
router.get('/equity', getEquityDetails);
router.post('/equity/contribution', recordCapitalContribution);
router.post('/equity/withdrawal', recordOwnerWithdrawal);

// 7. General Ledger & Double-Entry Accounting
router.get('/general-ledger', getGeneralLedger);
router.post('/journal-entry', createJournalEntry);

// 8. Accounts Receivable & Customer Debts
router.get('/receivables', getReceivables);

// 9. Accounts Payable & Supplier Debts
router.get('/payables', getPayables);

// 10. Inventory Valuation & COGS
router.get('/inventory-valuation', getInventoryValuation);

export default router;
