using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HudiSoftPOS.Data;
using HudiSoftPOS.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.ObjectModel;
using System.Linq;

namespace HudiSoftPOS.ViewModels
{
    public partial class KitchenViewModel : ObservableObject
    {
        [ObservableProperty]
        private ObservableCollection<Order> newOrders = new();

        [ObservableProperty]
        private ObservableCollection<Order> cookingOrders = new();

        [ObservableProperty]
        private ObservableCollection<Order> readyOrders = new();

        [ObservableProperty]
        private int pendingCount;

        [ObservableProperty]
        private int cookingCount;

        [ObservableProperty]
        private int readyCount;

        [ObservableProperty]
        private int totalCount;

        public KitchenViewModel()
        {
            _ = LoadOrders();
        }

        [RelayCommand]
        public async Task LoadOrders()
        {
            using (var context = new AppDbContext())
            {
                var allPendingOrActive = await context.Orders
                    .Where(o => o.Status == "Pending" || o.Status == "Cooking" || o.Status == "Ready")
                    .OrderBy(o => o.OrderTime)
                    .ToListAsync();

                NewOrders = new ObservableCollection<Order>(allPendingOrActive.Where(o => o.Status == "Pending"));
                CookingOrders = new ObservableCollection<Order>(allPendingOrActive.Where(o => o.Status == "Cooking"));
                ReadyOrders = new ObservableCollection<Order>(allPendingOrActive.Where(o => o.Status == "Ready"));

                PendingCount = NewOrders.Count;
                CookingCount = CookingOrders.Count;
                ReadyCount = ReadyOrders.Count;
                TotalCount = PendingCount + CookingCount + ReadyCount;
            }
        }

        [RelayCommand]
        public async Task MarkAsCooking(Order order) => await UpdateStatus(order, "Cooking");

        [RelayCommand]
        public async Task MarkAsReady(Order order) => await UpdateStatus(order, "Ready");

        [RelayCommand]
        public async Task MarkAsCompleted(Order order) => await UpdateStatus(order, "Completed");

        private async Task UpdateStatus(Order order, string newStatus)
        {
            using (var context = new AppDbContext())
            {
                var dbOrder = await context.Orders.FindAsync(order.Id);
                if (dbOrder != null)
                {
                    dbOrder.Status = newStatus;
                    await context.SaveChangesAsync();
                }
            }
            await LoadOrders(); // Refresh lanes
        }
    }
}
