using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HudiSoftPOS.Data;
using HudiSoftPOS.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.ObjectModel;

namespace HudiSoftPOS.ViewModels
{
    // Lightweight display model for dashboard recent orders
    public class DashboardOrderRow
    {
        public int Id { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public int ItemCount { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime OrderTime { get; set; }
    }

    public partial class DashboardViewModel : ObservableObject
    {
        [ObservableProperty] private decimal todaysRevenue;
        [ObservableProperty] private int todaysOrders;
        [ObservableProperty] private int completedOrders;
        [ObservableProperty] private decimal monthlyRevenue;
        [ObservableProperty] private int lowStockItems;
        [ObservableProperty] private int availableTables;
        [ObservableProperty] private int totalTables;
        [ObservableProperty] private decimal avgOrderValue;
        [ObservableProperty] private int totalCustomers;

        [ObservableProperty] private string revenueChange = "+12.5%";
        [ObservableProperty] private string ordersChange = "+8.2%";
        [ObservableProperty] private string completedChange = "+15%";
        [ObservableProperty] private string monthlyChange = "+18.3%";
        [ObservableProperty] private string customersChange = "+3.4%";
        [ObservableProperty] private string stockChange = "-2";
        [ObservableProperty] private string tablesChange = "65% occupied";
        [ObservableProperty] private string valueChange = "+5.2%";

        [ObservableProperty]
        private string lastUpdated = $"Today \u2022 Real-time POS Data \u2022 Updated {DateTime.Now:hh:mm tt}";

        [ObservableProperty]
        private string selectedPeriod = "Today";

        [ObservableProperty]
        private ObservableCollection<DashboardOrderRow> recentOrders = new();

        [ObservableProperty]
        private ObservableCollection<Product> topProducts = new();

        public DashboardViewModel()
        {
            LastUpdated = $"Today \u2022 Real-time POS Data \u2022 Updated {DateTime.Now:hh:mm tt}";
            Task.Run(LoadDashboardDataAsync);
        }

        [RelayCommand]
        private void LoadDashboardData()
        {
            LastUpdated = $"Today \u2022 Real-time POS Data \u2022 Updated {DateTime.Now:hh:mm tt}";
            Task.Run(LoadDashboardDataAsync);
        }

        private async Task LoadDashboardDataAsync()
        {
            try
            {
                using (var context = new AppDbContext())
                {
                    var today = DateTime.Today;

                    // Sales
                    TodaysOrders = await context.Orders.CountAsync(o => o.OrderTime >= today);
                    TodaysRevenue = await context.Orders
                        .Where(o => o.OrderTime >= today)
                        .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;

                    CompletedOrders = await context.Orders.CountAsync(o => o.Status == "Completed");

                    var startOfMonth = new DateTime(today.Year, today.Month, 1);
                    MonthlyRevenue = await context.Orders
                        .Where(o => o.OrderTime >= startOfMonth)
                        .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;

                    // Customers, Inventory, Tables
                    TotalCustomers = await context.Users.CountAsync();
                    LowStockItems = await context.Products.CountAsync(p => p.StockQuantity < 10);
                    AvailableTables = await context.Tables.CountAsync(t => !t.IsOccupied);
                    TotalTables = await context.Tables.CountAsync();

                    // Avg Order Value
                    var totalCount = await context.Orders.CountAsync();
                    var totalRev = await context.Orders.SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
                    AvgOrderValue = totalCount > 0 ? totalRev / totalCount : 0;

                    // Recent Orders (last 10)
                    var orders = await context.Orders
                        .Include(o => o.OrderItems)
                        .Include(o => o.User)
                        .OrderByDescending(o => o.OrderTime)
                        .Take(10)
                        .ToListAsync();

                    var rows = orders.Select(o => new DashboardOrderRow
                    {
                        Id = o.Id,
                        CustomerName = o.User?.Username ?? "Walking Customer",
                        ItemCount = o.OrderItems?.Count ?? 0,
                        TotalAmount = o.TotalAmount,
                        Status = o.Status,
                        OrderTime = o.OrderTime
                    }).ToList();

                    // Top Products (by price as proxy for popularity)
                    var products = await context.Products
                        .OrderByDescending(p => p.Price)
                        .Take(8)
                        .ToListAsync();

                    // Update on UI thread
                    System.Windows.Application.Current?.Dispatcher.Invoke(() =>
                    {
                        RecentOrders = new ObservableCollection<DashboardOrderRow>(rows);
                        TopProducts = new ObservableCollection<Product>(products);
                    });
                }
            }
            catch (Exception)
            {
                // Silently handle - UI shows zeros
            }
        }
    }
}
