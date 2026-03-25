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
    public partial class PurchaseViewModel : ObservableObject
    {
        [ObservableProperty] private ObservableCollection<Supplier> suppliers = new();
        [ObservableProperty] private Supplier? selectedSupplier;
        [ObservableProperty] private ObservableCollection<Product> availableProducts = new();
        [ObservableProperty] private ObservableCollection<PurchaseItemViewModel> cartItems = new();
        [ObservableProperty] private decimal totalPurchaseAmount;
        [ObservableProperty] private string referenceNumber = string.Empty;

        public PurchaseViewModel()
        {
            _ = LoadDataAsync();
        }

        private async Task LoadDataAsync()
        {
            using var context = new AppDbContext();
            var supplierList = await context.Suppliers.OrderBy(s => s.Name).ToListAsync();
            Suppliers = new ObservableCollection<Supplier>(supplierList);
            
            var productList = await context.Products.OrderBy(p => p.Name).ToListAsync();
            AvailableProducts = new ObservableCollection<Product>(productList);
            
            if (Suppliers.Count > 0) SelectedSupplier = Suppliers[0];
            ReferenceNumber = $"PUR-{DateTime.Now:yyyyMMdd-HHmm}";
        }

        [RelayCommand]
        private void AddToCart(Product product)
        {
            if (product == null) return;
            
            var existing = CartItems.FirstOrDefault(i => i.ProductId == product.Id);
            if (existing != null)
            {
                existing.Quantity++;
            }
            else
            {
                CartItems.Add(new PurchaseItemViewModel(this)
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Quantity = 1,
                    UnitCost = product.Cost
                });
            }
            CalculateTotal();
        }

        [RelayCommand]
        private void RemoveFromCart(PurchaseItemViewModel item)
        {
            CartItems.Remove(item);
            CalculateTotal();
        }

        public void CalculateTotal()
        {
            TotalPurchaseAmount = CartItems.Sum(i => i.SubTotal);
        }

        [RelayCommand]
        private async Task ConfirmPurchaseAsync()
        {
            if (SelectedSupplier == null)
            {
                MessageBox.Show("Please select a supplier.");
                return;
            }
            if (!CartItems.Any())
            {
                MessageBox.Show("Cart is empty.");
                return;
            }

            try
            {
                using var context = new AppDbContext();
                var purchase = new Purchase
                {
                    SupplierId = SelectedSupplier.Id,
                    PurchaseDate = DateTime.Now,
                    ReferenceNumber = ReferenceNumber,
                    TotalAmount = TotalPurchaseAmount,
                    Status = "Completed"
                };

                foreach (var item in CartItems)
                {
                    purchase.PurchaseItems.Add(new PurchaseItem
                    {
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitCost = item.UnitCost,
                        SubTotal = item.SubTotal
                    });

                    // Update product quantity and cost
                    var dbProduct = await context.Products.FindAsync(item.ProductId);
                    if (dbProduct != null)
                    {
                        dbProduct.StockQuantity += item.Quantity;
                        dbProduct.Cost = item.UnitCost; // Update cost based on latest purchase
                        if (dbProduct.StockQuantity > 0 && dbProduct.Status == "OutOfStock")
                            dbProduct.Status = "Available";
                    }
                }

                context.Purchases.Add(purchase);

                // Also record as a finance expense
                context.FinanceTransactions.Add(new FinanceTransaction
                {
                    Date = DateTime.Now,
                    Type = "Expense",
                    Amount = TotalPurchaseAmount,
                    Category = "Stock Purchase",
                    Note = $"Purchase from {SelectedSupplier.Name} (Ref: {ReferenceNumber})",
                    Reference = ReferenceNumber,
                    PaymentMethod = "Cash"
                });

                await context.SaveChangesAsync();
                
                MessageBox.Show("Purchase completed successfully!");
                CartItems.Clear();
                TotalPurchaseAmount = 0;
                ReferenceNumber = $"PUR-{DateTime.Now:yyyyMMdd-HHmm}";
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error: {ex.Message}");
            }
        }
    }

    public partial class PurchaseItemViewModel : ObservableObject
    {
        private readonly PurchaseViewModel _parent;
        public PurchaseItemViewModel(PurchaseViewModel parent) => _parent = parent;

        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;

        [ObservableProperty] private int quantity;
        [ObservableProperty] private decimal unitCost;

        public decimal SubTotal => Quantity * UnitCost;

        partial void OnQuantityChanged(int value) => _parent.CalculateTotal();
        partial void OnUnitCostChanged(decimal value) => _parent.CalculateTotal();
    }
}
