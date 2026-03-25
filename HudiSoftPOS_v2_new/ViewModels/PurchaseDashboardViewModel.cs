using CommunityToolkit.Mvvm.ComponentModel;
using HudiSoftPOS.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;

namespace HudiSoftPOS.ViewModels
{
    /// <summary>Dashboard for Purchase Management: summary stats and module cards (like the reference image).</summary>
    public partial class PurchaseDashboardViewModel : ObservableObject
    {
        [ObservableProperty] private decimal totalPurchaseAmount;
        [ObservableProperty] private decimal totalPurchaseAmountToday;
        [ObservableProperty] private int totalPurchases;
        [ObservableProperty] private int totalPurchasesToday;
        [ObservableProperty] private int activeSuppliers;
        [ObservableProperty] private int pendingOrdersCount;

        [ObservableProperty] private string backendUrl = "https://hudi-soft-com.onrender.com/api";
        [ObservableProperty] private string connectionStatus = "Connected";
        [ObservableProperty] private string currentTime = DateTime.Now.ToString("h:mm:ss tt");

        public PurchaseDashboardViewModel()
        {
            _ = LoadStatsAsync();
        }

        private async Task LoadStatsAsync()
        {
            try
            {
                using var context = new AppDbContext();
                var todayStart = DateTime.Today;

                var purchases = await context.Purchases.ToListAsync();
                TotalPurchases = purchases.Count;
                TotalPurchaseAmount = purchases.Sum(p => p.TotalAmount);
                var todayPurchases = purchases.Where(p => p.PurchaseDate >= todayStart).ToList();
                TotalPurchasesToday = todayPurchases.Count;
                TotalPurchaseAmountToday = todayPurchases.Sum(p => p.TotalAmount);

                ActiveSuppliers = await context.Suppliers.CountAsync();
                PendingOrdersCount = await context.Orders.CountAsync(o => o.Status == "Pending");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading purchase stats: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }
    }
}
