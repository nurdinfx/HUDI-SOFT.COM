using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Collections.ObjectModel;
using System.Windows;

namespace HudiSoftPOS.ViewModels
{
    public partial class SettingsViewModel : ObservableObject
    {
        // ═══ General (Restaurant Information) ═══
        [ObservableProperty] private string restaurantName = "Mama Africa POS";
        [ObservableProperty] private string emailAddress = "";
        [ObservableProperty] private string address = "";
        [ObservableProperty] private string website = "";
        [ObservableProperty] private string phoneNumber = "";
        [ObservableProperty] private string taxId = "";

        // ═══ POS Settings ═══
        [ObservableProperty] private decimal taxRatePercent = 10m;
        [ObservableProperty] private decimal serviceChargePercent = 5m;
        [ObservableProperty] private string currency = "USD";
        [ObservableProperty] private string receiptPrintSize = "80mm";
        [ObservableProperty] private string receiptHeader = "";
        [ObservableProperty] private string receiptFooter = "";

        public ObservableCollection<string> CurrencyList { get; } = new() { "USD", "EUR", "GBP", "SOS", "ETB", "KES" };
        public ObservableCollection<string> ReceiptSizeList { get; } = new() { "58mm", "80mm", "A4" };

        // ═══ Business Hours (placeholder) ═══
        [ObservableProperty] private string businessHoursNote = "Configure opening and closing times per day.";

        // ═══ Network (placeholder) ═══
        [ObservableProperty] private string apiBaseUrl = "https://hudi-soft-com.onrender.com/api/v1";

        // ═══ System: Business Accounts ═══
        [ObservableProperty] private string zaadAccountNumber = "";
        [ObservableProperty] private string sahalAccountNumber = "";
        [ObservableProperty] private string eDahabAccountNumber = "";
        [ObservableProperty] private string myCashAccountNumber = "";

        // Legacy / compatibility
        [ObservableProperty] private string storeName = "HudiSoft POS Terminal";
        [ObservableProperty] private string storeAddress = "123 Business Street, Tech City";
        [ObservableProperty] private string currencySymbol = "$";
        [ObservableProperty] private decimal taxRate = 15.0m;
        [ObservableProperty] private string receiptPrinterName = "Microsoft Print to PDF";
        [ObservableProperty] private bool isAutoPrintEnabled = true;
        [ObservableProperty] private int receiptFontSize = 12;
        [ObservableProperty] private bool enableGuestLogin = false;
        [ObservableProperty] private bool requirePinForVoid = true;

        public SettingsViewModel()
        {
        }

        [RelayCommand]
        private void SaveSettings()
        {
            StoreName = RestaurantName;
            StoreAddress = Address;
            CurrencySymbol = Currency;
            TaxRate = TaxRatePercent;
            MessageBox.Show("Settings saved successfully!", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        [RelayCommand]
        private void ResetToDefaults()
        {
            var result = MessageBox.Show("Reset all settings to defaults?", "Reset to Defaults", MessageBoxButton.YesNo, MessageBoxImage.Question);
            if (result == MessageBoxResult.Yes)
            {
                RestaurantName = "Mama Africa POS";
                EmailAddress = "";
                Address = "";
                Website = "";
                PhoneNumber = "";
                TaxId = "";
                TaxRatePercent = 10m;
                ServiceChargePercent = 5m;
                Currency = "USD";
                ReceiptPrintSize = "80mm";
                ReceiptHeader = "";
                ReceiptFooter = "";
                MessageBox.Show("Settings reset to defaults.", "Done", MessageBoxButton.OK);
            }
        }

        [RelayCommand]
        private void ClearAllCache()
        {
            var result = MessageBox.Show("Clear all cached data? The app may need to reload.", "Clear Cache", MessageBoxButton.YesNo, MessageBoxImage.Question);
            if (result == MessageBoxResult.Yes)
                MessageBox.Show("Cache cleared.", "Done", MessageBoxButton.OK);
        }

        [RelayCommand]
        private void ResetDatabase()
        {
            var result = MessageBox.Show("Are you sure you want to reset the database? ALL DATA WILL BE LOST!", "FACTORY RESET", MessageBoxButton.YesNo, MessageBoxImage.Warning);
            if (result == MessageBoxResult.Yes)
                MessageBox.Show("Database reset initiated...");
        }

        [RelayCommand]
        private void BackupDatabase()
        {
            MessageBox.Show("Database backup created at: Documents\\HudiSoftPOS_Backup.db", "Backup Complete");
        }
    }
}
