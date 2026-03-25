using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HudiSoftPOS.Data;
using HudiSoftPOS.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;

namespace HudiSoftPOS.ViewModels
{
    public partial class CustomerLedgerViewModel : ObservableObject
    {
        [ObservableProperty] private ObservableCollection<Customer> customers = new();
        [ObservableProperty] private Customer? selectedCustomer;
        [ObservableProperty] private ObservableCollection<LedgerTransaction> transactions = new();

        // Header & Live Clock
        [ObservableProperty] private string currentDateTime = string.Empty;
        private readonly DispatcherTimer _timer = new();

        // Summary Cards
        [ObservableProperty] private decimal totalDebit;
        [ObservableProperty] private decimal totalCredit;
        [ObservableProperty] private decimal currentBalance;
        [ObservableProperty] private string accountStatus = "N/A";

        // New Transaction Fields
        [ObservableProperty] private string newTransactionType = "Debit (Customer Owes)";
        [ObservableProperty] private decimal newTransactionAmount;
        [ObservableProperty] private string newTransactionReference = string.Empty;
        [ObservableProperty] private string newTransactionDescription = string.Empty;

        // Add Customer Overlay
        [ObservableProperty] private bool isAddCustomerOpen;
        [ObservableProperty] private string newCustomerName = string.Empty;
        [ObservableProperty] private string newCustomerPhone = string.Empty;
        [ObservableProperty] private string newCustomerEmail = string.Empty;
        [ObservableProperty] private string newCustomerAddress = string.Empty;

        public ObservableCollection<string> TransactionTypes { get; } = new() { "Debit (Customer Owes)", "Credit (Customer Paid)" };

        public CustomerLedgerViewModel()
        {
            _ = LoadCustomersAsync();
            StartClock();
        }

        private void StartClock()
        {
            _timer.Interval = TimeSpan.FromSeconds(1);
            _timer.Tick += (s, e) => {
                CurrentDateTime = DateTime.Now.ToString("dddd, MMMM dd, yyyy h:mm:ss tt");
            };
            _timer.Start();
            CurrentDateTime = DateTime.Now.ToString("dddd, MMMM dd, yyyy h:mm:ss tt");
        }

        [RelayCommand]
        private async Task LoadCustomersAsync()
        {
            using var context = new AppDbContext();
            var list = await context.Customers.OrderBy(c => c.Name).ToListAsync();
            Customers = new ObservableCollection<Customer>(list);
            if (SelectedCustomer == null && list.Count > 0)
                SelectedCustomer = list[0];
        }

        partial void OnSelectedCustomerChanged(Customer? value)
        {
            if (value != null)
                _ = LoadTransactionsAsync(value.Id);
            else
            {
                Transactions.Clear();
                TotalDebit = 0;
                TotalCredit = 0;
                CurrentBalance = 0;
                AccountStatus = "N/A";
            }
        }

        private async Task LoadTransactionsAsync(int customerId)
        {
            using var context = new AppDbContext();
            var list = await context.LedgerTransactions
                .Where(t => t.CustomerId == customerId)
                .OrderByDescending(t => t.TransactionDate)
                .ToListAsync();

            Transactions = new ObservableCollection<LedgerTransaction>(list);
            CalculateSummary();
        }

        private void CalculateSummary()
        {
            TotalDebit = Transactions.Where(t => t.Type == "Debit").Sum(t => t.Amount);
            TotalCredit = Transactions.Where(t => t.Type == "Credit").Sum(t => t.Amount);
            CurrentBalance = TotalDebit - TotalCredit;
            AccountStatus = CurrentBalance > 0 ? "Receivable" : (CurrentBalance < 0 ? "Payable" : "Balanced");
        }

        [RelayCommand]
        private async Task AddTransactionAsync()
        {
            if (SelectedCustomer == null) return;
            if (NewTransactionAmount <= 0)
            {
                MessageBox.Show("Please enter a valid amount.");
                return;
            }

            try
            {
                using var context = new AppDbContext();
                var transaction = new LedgerTransaction
                {
                    CustomerId = SelectedCustomer.Id,
                    TransactionDate = DateTime.Now,
                    Type = NewTransactionType.Contains("Debit") ? "Debit" : "Credit",
                    Amount = NewTransactionAmount,
                    Reference = NewTransactionReference,
                    Description = NewTransactionDescription,
                    BalanceAfter = CurrentBalance + (NewTransactionType.Contains("Debit") ? NewTransactionAmount : -NewTransactionAmount)
                };

                context.LedgerTransactions.Add(transaction);
                await context.SaveChangesAsync();

                // Reset fields
                NewTransactionAmount = 0;
                NewTransactionReference = string.Empty;
                NewTransactionDescription = string.Empty;

                await LoadTransactionsAsync(SelectedCustomer.Id);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error: {ex.Message}");
            }
        }

        [RelayCommand]
        private void OpenAddCustomer() => IsAddCustomerOpen = true;

        [RelayCommand]
        private void CloseAddCustomer() => IsAddCustomerOpen = false;

        [RelayCommand]
        private async Task SaveCustomerAsync()
        {
            if (string.IsNullOrWhiteSpace(NewCustomerName))
            {
                MessageBox.Show("Customer Name is required.");
                return;
            }

            using var context = new AppDbContext();
            var customer = new Customer
            {
                Name = NewCustomerName,
                Phone = NewCustomerPhone,
                Email = NewCustomerEmail,
                Address = NewCustomerAddress
            };

            context.Customers.Add(customer);
            await context.SaveChangesAsync();

            IsAddCustomerOpen = false;
            await LoadCustomersAsync();
            SelectedCustomer = customer;
        }

        [RelayCommand]
        private void PrintInvoice()
        {
            MessageBox.Show("Generating PDF Invoice...");
        }

        [RelayCommand]
        private async Task Refresh()
        {
            if (SelectedCustomer != null)
                await LoadTransactionsAsync(SelectedCustomer.Id);
            else
                await LoadCustomersAsync();
        }
    }
}
