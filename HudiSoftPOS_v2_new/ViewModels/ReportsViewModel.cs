using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HudiSoftPOS.Data;
using HudiSoftPOS.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;

namespace HudiSoftPOS.ViewModels
{
    public partial class ReportsViewModel : ObservableObject
    {
        [ObservableProperty] private decimal totalSales;
        [ObservableProperty] private int totalOrders;
        [ObservableProperty] private decimal averageOrderValue;
        [ObservableProperty] private string topProduct = "N/A";
        [ObservableProperty] private string reportPeriod = "Today";

        [ObservableProperty] private ObservableCollection<Order> recentOrders = new();
        [ObservableProperty] private ObservableCollection<TopProductInfo> topProductsList = new();

        /// <summary>Report tiles for the Reports Dashboard (like the reference image).</summary>
        public ObservableCollection<ReportTileItem> ReportTiles { get; } = new()
        {
            new ReportTileItem("Payment Report", "All payment transactions"),
            new ReportTileItem("Product Report", "Product sales and stock"),
            new ReportTileItem("Mobile Payment Report", "Mobile payment transactions"),
            new ReportTileItem("Audit Trail Report", "System activity logs"),
            new ReportTileItem("Orders Report", "All orders summary"),
            new ReportTileItem("Cashier Handover Report", "Cashier handover details"),
            new ReportTileItem("All Cashier Handovers", "Historical handovers"),
            new ReportTileItem("Previous Payment Report", "Historical payments"),
            new ReportTileItem("SMS Payment Report", "SMS payment transactions"),
            new ReportTileItem("Advance Report", "Advance payments"),
            new ReportTileItem("Sales Report", "Sales analysis"),
            new ReportTileItem("Daily Summary", "Daily sales summary"),
            new ReportTileItem("Inventory Report", "Stock levels and alerts"),
            new ReportTileItem("Customer Report", "Customer transactions")
        };

        public ReportsViewModel()
        {
            _ = LoadReportDataAsync("Today");
        }

        [RelayCommand]
        private void OpenReport(ReportTileItem tile)
        {
            if (tile == null) return;
            MessageBox.Show($"Opening report: {tile.Title}\n\n{tile.Description}", "Report", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        [RelayCommand]
        public async Task LoadReportDataAsync(string period)
        {
            ReportPeriod = period;
            DateTime startDate = DateTime.Today;

            if (period == "This Week") startDate = DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek);
            else if (period == "This Month") startDate = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
            else if (period == "Yesterday") startDate = DateTime.Today.AddDays(-1);

            DateTime endDate = (period == "Yesterday") ? DateTime.Today : DateTime.Now;

            using var context = new AppDbContext();
            
            var orders = await context.Orders
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
                .Where(o => o.OrderTime >= startDate && o.OrderTime < endDate && o.Status == "Completed")
                .ToListAsync();

            TotalOrders = orders.Count;
            TotalSales = orders.Sum(o => o.TotalAmount);
            AverageOrderValue = TotalOrders > 0 ? TotalSales / TotalOrders : 0;

            RecentOrders = new ObservableCollection<Order>(orders.OrderByDescending(o => o.OrderTime).Take(10));

            // Calculate Top Products
            var topProducts = orders.SelectMany(o => o.OrderItems)
                .GroupBy(oi => oi.Product.Name)
                .Select(g => new TopProductInfo 
                { 
                    Name = g.Key, 
                    Quantity = g.Sum(oi => oi.Quantity), 
                    Revenue = g.Sum(oi => oi.SubTotal) 
                })
                .OrderByDescending(p => p.Revenue)
                .ToList();

            TopProductsList = new ObservableCollection<TopProductInfo>(topProducts.Take(5));
            TopProduct = topProducts.FirstOrDefault()?.Name ?? "N/A";
        }
    }

    public class TopProductInfo
    {
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Revenue { get; set; }
    }

    public class ReportTileItem
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public ReportTileItem() { }
        public ReportTileItem(string title, string description) { Title = title; Description = description; }
    }
}
