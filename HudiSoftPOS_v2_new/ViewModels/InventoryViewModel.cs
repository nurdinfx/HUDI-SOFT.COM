using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HudiSoftPOS.Data;
using HudiSoftPOS.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;

namespace HudiSoftPOS.ViewModels
{
    public partial class InventoryViewModel : ObservableObject
    {
        [ObservableProperty]
        private ObservableCollection<Product> products = new();

        [ObservableProperty]
        private string searchQuery = string.Empty;

        [ObservableProperty]
        private string selectedCategory = "All";

        [ObservableProperty]
        private bool isLowStockOnly;

        [ObservableProperty]
        private int totalProductCount;

        [ObservableProperty]
        private bool isAddProductOpen;

        [ObservableProperty] private Product? selectedProduct;
        [ObservableProperty] private bool isEditing;
        [ObservableProperty] private string currentImagePath = string.Empty;

        // New Product Fields (Bound to Dialog)
        [ObservableProperty] private string newProductName = string.Empty;
        [ObservableProperty] private string newProductCategory = "General";
        [ObservableProperty] private decimal newProductPrice;
        [ObservableProperty] private decimal newProductCost;
        [ObservableProperty] private int newProductStock;
        [ObservableProperty] private string newProductStatus = "Available";
        [ObservableProperty] private string newProductDescription = string.Empty;

        public ObservableCollection<string> Categories { get; } = new() { "All", "Main Course", "Sides", "Beverages", "Dessert" };
        public ObservableCollection<string> Statuses { get; } = new() { "Available", "OutOfStock", "LowStock" };

        public InventoryViewModel()
        {
            _ = LoadProductsAsync();
        }

        [RelayCommand]
        private async Task LoadProductsAsync()
        {
            using var context = new AppDbContext();
            var query = context.Products.AsQueryable();

            if (!string.IsNullOrEmpty(SearchQuery))
                query = query.Where(p => p.Name.ToLower().Contains(SearchQuery.ToLower()));

            if (SelectedCategory != "All")
                query = query.Where(p => p.Category == SelectedCategory);

            if (IsLowStockOnly)
                query = query.Where(p => p.StockQuantity < 10);

            var list = await query.ToListAsync();
            Products = new ObservableCollection<Product>(list);
            TotalProductCount = list.Count;
        }

        [RelayCommand]
        private void OpenAddProduct()
        {
            ClearNewProductFields();
            IsEditing = false;
            IsAddProductOpen = true;
        }

        [RelayCommand]
        private void OpenEditProduct(Product product)
        {
            if (product == null) return;
            
            SelectedProduct = product;
            IsEditing = true;
            
            NewProductName = product.Name;
            NewProductCategory = product.Category;
            NewProductPrice = product.Price;
            NewProductCost = product.Cost;
            NewProductStock = product.StockQuantity;
            NewProductStatus = product.Status;
            NewProductDescription = product.Description;
            CurrentImagePath = product.ImagePath;

            IsAddProductOpen = true;
        }

        [RelayCommand]
        private void CloseAddProduct()
        {
            IsAddProductOpen = false;
        }

        [RelayCommand]
        private void UploadImage()
        {
            var openFileDialog = new Microsoft.Win32.OpenFileDialog
            {
                Filter = "Image files (*.png;*.jpeg;*.jpg)|*.png;*.jpeg;*.jpg|All files (*.*)|*.*"
            };

            if (openFileDialog.ShowDialog() == true)
            {
                CurrentImagePath = openFileDialog.FileName;
            }
        }

        [RelayCommand]
        private async Task SaveProductAsync()
        {
            if (string.IsNullOrWhiteSpace(NewProductName))
            {
                MessageBox.Show("Product name is required.");
                return;
            }

            try
            {
                using var context = new AppDbContext();
                
                // Handle Image Storage
                string finalImagePath = CurrentImagePath;
                if (!string.IsNullOrEmpty(CurrentImagePath) && File.Exists(CurrentImagePath))
                {
                    // Copy to local appdata folder for persistence
                    var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                    var imgFolder = Path.Combine(appData, "HudiSoftPOS", "ProductImages");
                    if (!Directory.Exists(imgFolder)) Directory.CreateDirectory(imgFolder);

                    var fileName = Path.GetFileName(CurrentImagePath);
                    var destination = Path.Combine(imgFolder, fileName);
                    
                    if (CurrentImagePath != destination)
                    {
                        File.Copy(CurrentImagePath, destination, true);
                        finalImagePath = destination;
                    }
                }

                if (IsEditing && SelectedProduct != null)
                {
                    var product = await context.Products.FindAsync(SelectedProduct.Id);
                    if (product != null)
                    {
                        product.Name = NewProductName;
                        product.Category = NewProductCategory;
                        product.Price = NewProductPrice;
                        product.Cost = NewProductCost;
                        product.StockQuantity = NewProductStock;
                        product.Status = product.StockQuantity == 0 ? "OutOfStock" : (product.StockQuantity < 10 ? "LowStock" : "Available");
                        product.Description = NewProductDescription;
                        product.ImagePath = finalImagePath;
                    }
                }
                else
                {
                    var product = new Product
                    {
                        Name = NewProductName,
                        Category = NewProductCategory,
                        Price = NewProductPrice,
                        Cost = NewProductCost,
                        StockQuantity = NewProductStock,
                        Status = NewProductStock == 0 ? "OutOfStock" : (NewProductStock < 10 ? "LowStock" : "Available"),
                        Description = NewProductDescription,
                        ImagePath = finalImagePath
                    };
                    context.Products.Add(product);
                }

                await context.SaveChangesAsync();
                IsAddProductOpen = false;
                await LoadProductsAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error saving product: {ex.Message}");
            }
        }

        [RelayCommand]
        private async Task DeleteProductAsync(Product product)
        {
            if (product == null) return;

            var result = MessageBox.Show($"Are you sure you want to delete {product.Name}?", "Confirm Delete", MessageBoxButton.YesNo);
            if (result == MessageBoxResult.Yes)
            {
                using var context = new AppDbContext();
                context.Products.Remove(product);
                await context.SaveChangesAsync();
                await LoadProductsAsync();
            }
        }

        [RelayCommand]
        private void PrintInventory()
        {
            MessageBox.Show("Printing inventory report...", "Print", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void ClearNewProductFields()
        {
            NewProductName = string.Empty;
            NewProductCategory = "General";
            NewProductPrice = 0;
            NewProductCost = 0;
            NewProductStock = 0;
            NewProductStatus = "Available";
            NewProductDescription = string.Empty;
            CurrentImagePath = string.Empty;
        }

        [RelayCommand]
        private async Task AdjustStockAsync(object parameter)
        {
            if (parameter is not object[] values || values.Length < 2) return;
            var product = values[0] as Product;
            var amount = Convert.ToInt32(values[1]);

            if (product == null) return;
            
            using var context = new AppDbContext();
            var dbProduct = await context.Products.FindAsync(product.Id);
            if (dbProduct != null)
            {
                dbProduct.StockQuantity += amount;
                if (dbProduct.StockQuantity < 0) dbProduct.StockQuantity = 0;
                
                // Update local model
                product.StockQuantity = dbProduct.StockQuantity;
                dbProduct.Status = dbProduct.StockQuantity == 0 ? "OutOfStock" : (dbProduct.StockQuantity < 10 ? "LowStock" : "Available");
                product.Status = dbProduct.Status;
                
                await context.SaveChangesAsync();
                await LoadProductsAsync();
            }
        }

        partial void OnSearchQueryChanged(string value) => _ = LoadProductsAsync();
        partial void OnSelectedCategoryChanged(string value) => _ = LoadProductsAsync();
        partial void OnIsLowStockOnlyChanged(bool value) => _ = LoadProductsAsync();
    }
}
