using HudiSoftPOS.Models;

namespace HudiSoftPOS.Services
{
    public static class SecurityService
    {
        public static User? CurrentUser { get; set; }

        public static bool IsAdmin => CurrentUser?.Role?.Equals("Admin", StringComparison.OrdinalIgnoreCase) ?? false;
        public static bool IsManager => CurrentUser?.Role?.Equals("Manager", StringComparison.OrdinalIgnoreCase) ?? false || IsAdmin;
        public static bool IsCashier => CurrentUser?.Role?.Equals("Cashier", StringComparison.OrdinalIgnoreCase) ?? false;
        public static bool IsWaiter => CurrentUser?.Role?.Equals("Waiter", StringComparison.OrdinalIgnoreCase) ?? false;
        public static bool IsChef => CurrentUser?.Role?.Equals("Chef", StringComparison.OrdinalIgnoreCase) ?? false;
        
        // Navigation Permissions
        public static bool CanViewDashboard => IsAdmin || IsManager;
        public static bool CanViewPOS => IsAdmin || IsManager || IsCashier || IsWaiter;
        public static bool CanViewKitchen => IsAdmin || IsManager || IsChef;
        public static bool CanViewOrders => IsAdmin || IsManager || IsCashier || IsWaiter;
        public static bool CanViewTables => IsAdmin || IsManager || IsCashier || IsWaiter;
        public static bool CanViewInventory => IsAdmin || IsManager;
        public static bool CanViewLedger => IsAdmin || IsManager || IsCashier;
        public static bool CanViewFinance => IsAdmin || IsManager;
        public static bool CanViewPurchases => IsAdmin || IsManager;
        public static bool CanViewUsers => IsAdmin;
        public static bool CanViewReports => IsAdmin || IsManager;
        public static bool CanViewSettings => IsAdmin;
        public static bool CanViewConnectPhone => IsAdmin || IsManager;
    }
}
