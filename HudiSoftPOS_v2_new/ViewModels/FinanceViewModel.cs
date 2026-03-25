using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HudiSoftPOS.Data;
using HudiSoftPOS.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System;

namespace HudiSoftPOS.ViewModels
{
    public partial class FinanceViewModel : ObservableObject
    {
        [ObservableProperty] private ObservableCollection<FinanceTransaction> transactions = new();
        
        // Summary Cards
        [ObservableProperty] private decimal totalIncome;
        [ObservableProperty] private decimal totalExpense;
        [ObservableProperty] private decimal balance;

        // Filters
        [ObservableProperty] private string searchQuery = string.Empty;
        [ObservableProperty] private DateTime fromDate = DateTime.Now.AddMonths(-1);
        [ObservableProperty] private DateTime toDate = DateTime.Now;
        [ObservableProperty] private string selectedType = "All";

        // Add Transaction Dialog
        [ObservableProperty] private bool isAddTransactionOpen;
        [ObservableProperty] private DateTime newDate = DateTime.Now;
        [ObservableProperty] private string newType = "Income";
        [ObservableProperty] private string newCategory = "General";
        [ObservableProperty] private decimal newAmount;
        [ObservableProperty] private string newPaymentMethod = "Cash";
        [ObservableProperty] private string newNote = string.Empty;
        [ObservableProperty] private string newReference = string.Empty;

        public ObservableCollection<string> TransactionTypes { get; } = new() { "All", "Income", "Expense" };
        public ObservableCollection<string> AddTransactionTypes { get; } = new() { "Income", "Expense" };
        public ObservableCollection<string> Categories { get; } = new() { "General", "Salary", "Utility", "Stock", "Rent", "Marketing" };
        public ObservableCollection<string> PaymentMethods { get; } = new() { "Cash", "Bank", "Card", "Multiple", "Transfer" };

        public FinanceViewModel()
        {
            _ = LoadTransactionsAsync();
        }

        [RelayCommand]
        private async Task LoadTransactionsAsync()
        {
            using var context = new AppDbContext();
            var query = context.FinanceTransactions.AsQueryable();

            // Filtering logic
            query = query.Where(t => t.Date >= FromDate.Date && t.Date <= ToDate.Date.AddDays(1).AddSeconds(-1));

            if (SelectedType != "All")
                query = query.Where(t => t.Type == SelectedType);

            if (!string.IsNullOrEmpty(SearchQuery))
                query = query.Where(t => t.Note.Contains(SearchQuery) || t.Reference.Contains(SearchQuery));

            var list = await query.OrderByDescending(t => t.Date).ToListAsync();
            Transactions = new ObservableCollection<FinanceTransaction>(list);

            TotalIncome = list.Where(t => t.Type == "Income").Sum(t => t.Amount);
            TotalExpense = list.Where(t => t.Type == "Expense").Sum(t => t.Amount);
            Balance = TotalIncome - TotalExpense;
        }

        [RelayCommand]
        private void OpenAddTransaction()
        {
            NewDate = DateTime.Now;
            NewAmount = 0;
            NewNote = string.Empty;
            NewReference = string.Empty;
            IsAddTransactionOpen = true;
        }

        [RelayCommand]
        private void CloseAddTransaction() => IsAddTransactionOpen = false;

        [RelayCommand]
        private async Task SaveTransactionAsync()
        {
            if (NewAmount <= 0)
            {
                MessageBox.Show("Please enter a valid amount.");
                return;
            }

            try
            {
                using var context = new AppDbContext();
                var transaction = new FinanceTransaction
                {
                    Date = NewDate,
                    Type = NewType,
                    Category = NewCategory,
                    Amount = NewAmount,
                    PaymentMethod = NewPaymentMethod,
                    Note = NewNote,
                    Reference = NewReference
                };

                context.FinanceTransactions.Add(transaction);
                await context.SaveChangesAsync();

                IsAddTransactionOpen = false;
                await LoadTransactionsAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error saving transaction: {ex.Message}");
            }
        }

        [RelayCommand]
        private async Task ApplyFiltersAsync()
        {
            await LoadTransactionsAsync();
        }

        [RelayCommand]
        private void ExportCSV()
        {
            var path = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Finance_Report.csv");
            try
            {
                using var writer = new System.IO.StreamWriter(path, false, System.Text.Encoding.UTF8);
                writer.WriteLine("Date,Type,Amount,Payment,Note");
                foreach (var t in Transactions)
                    writer.WriteLine($"{t.Date:yyyy-MM-dd},{t.Type},{t.Amount:F2},{t.PaymentMethod},\"{t.Note}\"");
                MessageBox.Show($"Exported to {path}", "Export CSV", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Export failed: {ex.Message}", "Export CSV", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        partial void OnFromDateChanged(DateTime value) => _ = LoadTransactionsAsync();
        partial void OnToDateChanged(DateTime value) => _ = LoadTransactionsAsync();
        partial void OnSelectedTypeChanged(string value) => _ = LoadTransactionsAsync();
        partial void OnSearchQueryChanged(string value) => _ = LoadTransactionsAsync();
    }
}
