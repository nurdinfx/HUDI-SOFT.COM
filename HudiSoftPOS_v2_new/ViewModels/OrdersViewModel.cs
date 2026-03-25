using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HudiSoftPOS.Data;
using HudiSoftPOS.Models;
using HudiSoftPOS.Services;
using Microsoft.EntityFrameworkCore;
using System.Collections.ObjectModel;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using System.Windows;

namespace HudiSoftPOS.ViewModels
{
    public partial class OrdersViewModel : ObservableObject
    {
        /// <summary>Only Admin or Manager can use Pay Now and Update order buttons.</summary>
        public bool CanEditOrPayOrders => SecurityService.IsAdmin || SecurityService.IsManager;
        private List<Order> _allOrders = new();

        [ObservableProperty] private ObservableCollection<Order> orders = new();
        [ObservableProperty] private decimal totalSales;
        [ObservableProperty] private decimal totalVat;
        [ObservableProperty] private decimal totalPending;

        // Filter properties
        [ObservableProperty] private DateTime fromDate = DateTime.Now.AddMonths(-1);
        [ObservableProperty] private DateTime toDate = DateTime.Now;
        [ObservableProperty] private string selectedServedBy = "All";
        [ObservableProperty] private string selectedCustomer = "All";
        [ObservableProperty] private string selectedRoom = "All";
        [ObservableProperty] private string selectedTable = "All";
        [ObservableProperty] private string selectedStatusFilter = "All";
        [ObservableProperty] private string orderNumberQuery = string.Empty;
        [ObservableProperty] private bool isOverlayVisible;

        // Filter Lists
        [ObservableProperty] private ObservableCollection<string> servedByList = new() { "All" };
        [ObservableProperty] private ObservableCollection<string> customersList = new() { "All" };
        [ObservableProperty] private ObservableCollection<string> roomsList = new() { "All" };
        [ObservableProperty] private ObservableCollection<string> tablesList = new() { "All" };
        public ObservableCollection<string> StatusList { get; } = new() 
        { "All", "Pending", "Cooking", "Ready", "Completed", "Cancelled" };

        public OrdersViewModel()
        {
            _ = LoadOrders();
        }

        [RelayCommand]
        public async Task LoadOrders()
        {
            try
            {
                using (var context = new AppDbContext())
                {
                    _allOrders = await context.Orders
                        .Include(o => o.User)
                        .Include(o => o.OrderItems)
                            .ThenInclude(oi => oi.Product)
                        .OrderByDescending(o => o.OrderTime)
                        .ToListAsync();

                    // Served by: fetch all active users from Users table (dynamic, from users page data)
                    var dbUsers = await context.Users
                        .Where(u => u.Status == "Active")
                        .OrderBy(u => u.FullName)
                        .Select(u => string.IsNullOrWhiteSpace(u.FullName) ? u.Username : u.FullName)
                        .Distinct()
                        .ToListAsync();

                    var customerNames = _allOrders.Select(o => string.IsNullOrEmpty(o.CustomerName) ? "Walking Customer" : o.CustomerName).Distinct().OrderBy(x => x).ToList();
                    var roomNames = _allOrders.Select(o => string.IsNullOrEmpty(o.Room) ? "Main Hall" : o.Room).Distinct().OrderBy(x => x).ToList();
                    var tableNames = _allOrders.Select(o => o.TableName).Where(s => !string.IsNullOrEmpty(s)).Distinct().OrderBy(x => x).ToList();
                    var dbTables = await context.Tables.Select(t => t.Name).ToListAsync();
                    foreach (var t in dbTables) if (!tableNames.Contains(t)) tableNames.Add(t);
                    tableNames.Sort();

                    Application.Current.Dispatcher.Invoke(() => {
                        ServedByList = new ObservableCollection<string> { "All" };
                        foreach (var u in dbUsers) ServedByList.Add(u);

                        CustomersList = new ObservableCollection<string> { "All", "Walking Customer" };
                        foreach (var c in customerNames) if (!CustomersList.Contains(c)) CustomersList.Add(c);

                        RoomsList = new ObservableCollection<string> { "All", "Booked Room", "Main Hall", "Private Room", "VIP Lounge", "Outdoor" };
                        foreach (var r in roomNames) if (!RoomsList.Contains(r)) RoomsList.Add(r);

                        TablesList = new ObservableCollection<string> { "All", "Table: None" };
                        foreach (var t in tableNames) if (!TablesList.Contains(t)) TablesList.Add(t);
                    });

                    ApplyFilters();
                    UpdateStats();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading orders: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        partial void OnFromDateChanged(DateTime value) => ApplyFilters();
        partial void OnToDateChanged(DateTime value) => ApplyFilters();
        partial void OnSelectedServedByChanged(string value) => ApplyFilters();
        partial void OnSelectedCustomerChanged(string value) => ApplyFilters();
        partial void OnSelectedRoomChanged(string value) => ApplyFilters();
        partial void OnSelectedTableChanged(string value) => ApplyFilters();
        partial void OnSelectedStatusFilterChanged(string value) => ApplyFilters();
        partial void OnOrderNumberQueryChanged(string value) => ApplyFilters();

        private void ApplyFilters()
        {
            var filtered = _allOrders.AsEnumerable();

            // Date Range
            filtered = filtered.Where(o => o.OrderTime.Date >= FromDate.Date && o.OrderTime.Date <= ToDate.Date);

            // Text Query
            if (!string.IsNullOrEmpty(OrderNumberQuery))
            {
                filtered = filtered.Where(o => o.Id.ToString().Contains(OrderNumberQuery));
            }

            // Status
            if (SelectedStatusFilter != "All")
            {
                filtered = filtered.Where(o => o.Status == SelectedStatusFilter);
            }

            if (SelectedServedBy != "All")
            {
                filtered = filtered.Where(o =>
                {
                    var u = o.User;
                    if (u == null) return false;
                    var displayName = string.IsNullOrWhiteSpace(u.FullName) ? u.Username : u.FullName;
                    return displayName == SelectedServedBy;
                });
            }

            if (SelectedCustomer != "All")
                filtered = filtered.Where(o => (string.IsNullOrEmpty(o.CustomerName) ? "Walking Customer" : o.CustomerName) == SelectedCustomer);

            if (SelectedRoom != "All")
                filtered = filtered.Where(o => (string.IsNullOrEmpty(o.Room) ? "Main Hall" : o.Room) == SelectedRoom);

            if (SelectedTable != "All" && !string.IsNullOrEmpty(SelectedTable))
                filtered = filtered.Where(o => (o.TableName ?? string.Empty) == SelectedTable);

            Orders = new ObservableCollection<Order>(filtered);
        }

        // Popup State Properties
        [ObservableProperty] private Order? selectedOrder;
        [ObservableProperty] private bool isDetailsPopupOpen;
        [ObservableProperty] private bool isPaymentPopupOpen;
        [ObservableProperty] private bool isCancelPopupOpen;

        [ObservableProperty] private bool isPrintAllPopupOpen;

        [RelayCommand]
        public void ResetFilters()
        {
            FromDate = DateTime.Now.AddMonths(-1);
            ToDate = DateTime.Now;
            SelectedServedBy = "All";
            SelectedCustomer = "All";
            SelectedRoom = "All";
            SelectedTable = "All";
            SelectedStatusFilter = "All";
            OrderNumberQuery = string.Empty;
            ApplyFilters();
        }

        // ══════════════════ HEADER ACTIONS ══════════════════

        [RelayCommand]
        public void TablePaymentInv()
        {
            if (SelectedTable == "All" || string.IsNullOrEmpty(SelectedTable))
            {
                MessageBox.Show("Please select a specific table to print an invoice.", "Table Selection Required", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }
            MessageBox.Show($"Processing Table Payment (Inventory Mode) for {SelectedTable}...", "Table Payment (Inv)", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        [RelayCommand]
        public void TablePayment()
        {
            if (SelectedTable == "All" || string.IsNullOrEmpty(SelectedTable))
            {
                MessageBox.Show("Please select a specific table to process payment.", "Table Selection Required", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }
            MessageBox.Show($"Processing Direct Table Payment for {SelectedTable}...", "Table Payment", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        [RelayCommand]
        public void ShowPrintAllConfirm()
        {
            if (Orders.Count == 0)
            {
                MessageBox.Show("No orders to print.", "Print All", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }
            IsPrintAllPopupOpen = true;
            IsOverlayVisible = true;
        }

        [RelayCommand]
        public void ConfirmPrintAll()
        {
            MessageBox.Show($"Sending {Orders.Count} receipts to printer...", "Print All", MessageBoxButton.OK, MessageBoxImage.Information);
            ClosePopups();
        }

        [RelayCommand]
        public void PrintAll() => ShowPrintAllConfirm();

        // ══════════════════ ROW ACTIONS ══════════════════

        [RelayCommand]
        public void ShowCancelConfirm(Order order)
        {
            SelectedOrder = order;
            IsCancelPopupOpen = true;
            IsOverlayVisible = true;
        }

        [RelayCommand]
        public async Task ConfirmCancel()
        {
            if (SelectedOrder == null) return;
            try
            {
                using (var context = new AppDbContext())
                {
                    var dbOrder = await context.Orders.Include(o => o.OrderItems).FirstOrDefaultAsync(o => o.Id == SelectedOrder.Id);
                    if (dbOrder != null)
                    {
                        // Remove items first (cascade delete logic if not set in DB)
                        context.OrderItems.RemoveRange(dbOrder.OrderItems);
                        context.Orders.Remove(dbOrder);
                        await context.SaveChangesAsync();
                        
                        // Remove from internal tracking lists
                        var listOrder = _allOrders.FirstOrDefault(o => o.Id == SelectedOrder.Id);
                        if (listOrder != null) _allOrders.Remove(listOrder);
                        
                        ApplyFilters();
                        UpdateStats();
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error deleting order: {ex.Message}", "Status", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            ClosePopups();
        }

        [RelayCommand]
        public async Task PrintOrder(Order order)
        {
            if (order == null) return;
            try
            {
                string itemsHtml = string.Join("", (order.OrderItems ?? new List<OrderItem>()).Select(item =>
                {
                    decimal unitPrice = item.Quantity > 0 ? item.SubTotal / item.Quantity : 0;
                    return $"<tr><td>{item.Product?.Name ?? "Item"}</td><td style='text-align:center'>{item.Quantity}</td><td style='text-align:center'>{unitPrice:N1}</td><td style='text-align:right'>{item.SubTotal:N1}</td></tr>";
                }));

                string servedBy = order.User != null 
                    ? (string.IsNullOrWhiteSpace(order.User.FullName) ? order.User.Username : order.User.FullName)
                    : (SecurityService.CurrentUser?.FullName ?? "Staff");
                string customer = string.IsNullOrEmpty(order.CustomerName) ? "Walking Customer" : order.CustomerName;
                string qrData = Uri.EscapeDataString($"Order:{order.Id}|Date:{order.OrderTime:yyyyMMdd}|Total:{order.TotalAmount}");
                string qrUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={qrData}";
                
                decimal vatAmount = order.TotalAmount * 0.04m;

                                string html = $@"<html><head><style>
body {{ font-family: Arial, sans-serif; width: 190px; margin: 0; color: #000; padding: 2px; font-size: 10px; }}
.rn {{ font-size: 14px; font-weight: bold; text-align: center; margin: 0; padding: 0; line-height: 1.1; }}
.info {{ font-size: 9px; font-weight: bold; text-align: center; margin-bottom: 2px; }}
.field {{ font-size: 10px; font-weight: bold; margin-bottom: 2px; }}
.divider {{ border-top: 1px dashed #000; margin: 5px 0; }}
table {{ width: 100%; border-collapse: collapse; font-size: 9px; font-weight: bold; }}
th {{ border-bottom: 1px dashed #000; padding: 2px 0; text-align: left; }}
td {{ padding: 2px 0; vertical-align: top; }}
.tr {{ display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; margin-bottom: 2px; }}
.gt {{ font-size: 12px; font-weight: bold; }}
.qr {{ text-align: center; margin: 8px 0; }}
.footer {{ text-align: center; font-size: 11px; font-weight: bold; margin-top: 5px; }}
.pb {{ font-size: 9px; font-weight: bold; margin-top: 2px; }}
@media print {{ body {{ width: 190px; padding: 0; margin: 0; }} @page {{ margin: 0; }} }}
</style></head>
<body>
<div class='rn'>Mamma Africa</div>
<div class='rn' style='margin-bottom:4px;'>Restaurant</div>
<div class='info'>ZAAD: 515735 - SAHAL: 523080-</div>
<div class='info'>E-DAHAB:742298 - MyCash:931539</div>
<div class='divider'></div>
<div class='field'>Receipt Number : {order.Id}</div>
<div class='field'>Served By : {System.Net.WebUtility.HtmlEncode(servedBy)}</div>
<div class='field'>Customer : {System.Net.WebUtility.HtmlEncode(customer)}</div>
<div class='field'>Date : {order.OrderTime:dd/MM/yyyy HH:mm}</div>
<div class='divider'></div>
<table><thead><tr>
<th style='width:45%'>Item.</th>
<th style='width:10%;text-align:center'>No.</th>
<th style='width:20%;text-align:center'>Price.</th>
<th style='width:25%;text-align:right'>Total</th>
</tr></thead><tbody>{itemsHtml}</tbody></table>
<div class='divider'></div>
<div class='tr'><span>Vat @ 4 %</span><span>{vatAmount:N1}</span></div>
<div class='tr'><span>Paid Amount</span><span>0</span></div>
<div class='divider'></div>
<div class='tr gt'><span>Total :</span><span>{order.TotalAmount:N1}</span></div>
<div class='tr'><span>Total L/Currency :</span><span>0</span></div>
<div class='divider'></div>
<div class='qr'><img src='{qrUrl}' width='150' height='150'/></div>
<div class='divider'></div>
<div class='footer'>Thank you for visiting us<div class='pb'>Powered by HUDI_SOFT</div></div>
</body></html>";

                bool ok = await ReceiptPrintService.PrintHtmlAsync(html);
                if (!ok)
                    MessageBox.Show("Could not print receipt. Check that a printer is connected and set as default.", "Print Error", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Could not print receipt: {ex.Message}", "Print Error", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        [RelayCommand]
        public void ViewOrder(Order order)
        {
            if (order == null) return;
            SelectedOrder = order;
            IsDetailsPopupOpen = true;
            IsOverlayVisible = true;
        }

        [RelayCommand]
        public void UpdateOrder(Order order)
        {
            if (order == null) return;
            
            // Link to POS via MainViewModel
            if (Application.Current.MainWindow.DataContext is MainViewModel mainVM)
            {
                mainVM.NavigateToPOS(order);
            }
        }

        [RelayCommand]
        public void ShowPaymentConfirm(Order order)
        {
            if (order == null || order.Status == "Completed") return;
            SelectedOrder = order;
            IsPaymentPopupOpen = true;
            IsOverlayVisible = true;
        }

        [RelayCommand]
        public async Task ConfirmPayment()
        {
            if (SelectedOrder == null) return;
            using (var context = new AppDbContext())
            {
                var dbOrder = await context.Orders.FindAsync(SelectedOrder.Id);
                if (dbOrder != null)
                {
                    dbOrder.Status = "Completed";
                    await context.SaveChangesAsync();
                    
                    var listOrder = _allOrders.FirstOrDefault(o => o.Id == SelectedOrder.Id);
                    if (listOrder != null) listOrder.Status = "Completed";
                    
                    ApplyFilters();
                    UpdateStats();
                }
            }
            ClosePopups();
        }

        [RelayCommand]
        public void ClosePopups()
        {
            IsDetailsPopupOpen = false;
            IsPaymentPopupOpen = false;
            IsCancelPopupOpen = false;
            IsPrintAllPopupOpen = false;
            SelectedOrder = null;
            IsOverlayVisible = false;
        }

        private void UpdateStats()
        {
            var activeOrders = _allOrders.Where(o => o.Status != "Cancelled").ToList();
            TotalSales = activeOrders.Sum(o => o.TotalAmount);
            TotalVat = activeOrders.Sum(o => o.Vat);
            TotalPending = activeOrders.Where(o => o.Status == "Pending").Sum(o => o.TotalAmount);
        }
    }
}
