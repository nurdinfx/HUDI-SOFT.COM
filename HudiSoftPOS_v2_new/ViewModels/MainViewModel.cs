using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HudiSoftPOS.Models;
using System.Windows;
using System.Windows.Input;
using System.Windows.Threading;

namespace HudiSoftPOS.ViewModels
{
    public partial class MainViewModel : ObservableObject
    {
        [ObservableProperty]
        private object currentView;

        [ObservableProperty]
        private string currentPageTitle;

        [ObservableProperty]
        private bool isSidebarOpen = false; // Hidden by default - user opens with hamburger menu

        /// <summary>When true, the header subtitle/banner is visible. User can dismiss it with the X button.</summary>
        [ObservableProperty]
        private bool isHeaderSubtitleVisible = true;

        [ObservableProperty]
        private string currentTime = DateTime.Now.ToString("hh:mm tt").ToUpper();

        [ObservableProperty]
        private string currentDate = DateTime.Now.ToString("dd/MM/yyyy");

        private readonly DispatcherTimer _clock;

        [ObservableProperty]
        private string currentUserFullName = Services.SecurityService.CurrentUser?.FullName ?? "System Admin";

        [ObservableProperty]
        private string currentUserRole = Services.SecurityService.CurrentUser?.Role?.ToUpper() ?? "ADMIN";

        // RBAC Visibility Properties
        public bool ShowDashboard => Services.SecurityService.CanViewDashboard;
        public bool ShowPOS => Services.SecurityService.CanViewPOS;
        public bool ShowKitchen => Services.SecurityService.CanViewKitchen;
        public bool ShowOrders => Services.SecurityService.CanViewOrders;
        public bool ShowTables => Services.SecurityService.CanViewTables;
        public bool ShowInventory => Services.SecurityService.CanViewInventory;
        public bool ShowLedger => Services.SecurityService.CanViewLedger;
        public bool ShowFinance => Services.SecurityService.CanViewFinance;
        public bool ShowPurchase => Services.SecurityService.CanViewPurchases;
        public bool ShowUsers => Services.SecurityService.CanViewUsers;
        public bool ShowReports => Services.SecurityService.CanViewReports;
        public bool ShowSettings => Services.SecurityService.CanViewSettings;
        public bool ShowConnectPhone => Services.SecurityService.CanViewConnectPhone;

        public MainViewModel()
        {
            // Update user info from SecurityService
            if (Services.SecurityService.CurrentUser != null)
            {
                CurrentUserFullName = Services.SecurityService.CurrentUser.FullName;
                CurrentUserRole = Services.SecurityService.CurrentUser.Role.ToUpper();
            }

            // Live clock
            _clock = new DispatcherTimer { Interval = TimeSpan.FromSeconds(30) };
            _clock.Tick += (_, _) =>
            {
                CurrentTime = DateTime.Now.ToString("hh:mm tt").ToUpper();
                CurrentDate = DateTime.Now.ToString("dd/MM/yyyy");
            };
            _clock.Start();

            // Default to POS
            CurrentView = new POSViewModel();
            CurrentPageTitle = "POS - Point of Sale";
        }

        [RelayCommand]
        public void ToggleSidebar()
        {
            IsSidebarOpen = !IsSidebarOpen;
        }

        /// <summary>Closes sidebar when user clicks overlay (blank area) or close button.</summary>
        [RelayCommand]
        public void CloseSidebar()
        {
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void DismissHeaderSubtitle()
        {
            IsHeaderSubtitleVisible = false;
        }

        [RelayCommand]
        public void NavigateToDashboard()
        {
            if (!Services.SecurityService.CanViewDashboard)
            {
                CurrentView = new AccessDeniedViewModel();
                CurrentPageTitle = "Access Denied";
            }
            else
            {
                CurrentView = new DashboardViewModel();
                CurrentPageTitle = "Restaurant Dashboard";
            }
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToPOS(Order? order = null)
        {
            if (!Services.SecurityService.CanViewPOS)
            {
                CurrentView = new AccessDeniedViewModel();
                CurrentPageTitle = "Access Denied";
                IsSidebarOpen = false;
                return;
            }
            var posVM = new POSViewModel();
            if (order != null) 
            {
                posVM.LoadOrder(order);
                CurrentPageTitle = "Edit Order & Business Suite";
            }
            else
            {
                CurrentPageTitle = "POS & Business Suite";
            }
            CurrentView = posVM;
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToKitchen()
        {
            if (!Services.SecurityService.CanViewKitchen)
            {
                CurrentView = new AccessDeniedViewModel();
                CurrentPageTitle = "Access Denied";
            }
            else
            {
                CurrentView = new KitchenViewModel();
                CurrentPageTitle = "Kitchen Display System";
            }
            IsSidebarOpen = false;
        }
        
        [RelayCommand]
        public void NavigateToOrders()
        {
            CurrentView = new OrdersViewModel();
            CurrentPageTitle = "Orders Management";
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToTables()
        {
            CurrentView = new TableManagementViewModel();
            CurrentPageTitle = "Table Management";
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToInventory()
        {
            if (!Services.SecurityService.CanViewInventory)
            {
                CurrentView = new AccessDeniedViewModel();
                CurrentPageTitle = "Access Denied";
            }
            else
            {
                CurrentView = new InventoryViewModel();
                CurrentPageTitle = "Inventory Management";
            }
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToCustomerLedger()
        {
            if (!Services.SecurityService.CanViewLedger)
            {
                CurrentView = new AccessDeniedViewModel();
                CurrentPageTitle = "Access Denied";
            }
            else
            {
                CurrentView = new CustomerLedgerViewModel();
                CurrentPageTitle = "Customer Ledger";
            }
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToFinance()
        {
            if (!Services.SecurityService.CanViewFinance)
            {
                CurrentView = new AccessDeniedViewModel();
                CurrentPageTitle = "Access Denied";
            }
            else
            {
                CurrentView = new FinanceViewModel();
                CurrentPageTitle = "Finance Management";
            }
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToPurchase()
        {
            if (!Services.SecurityService.CanViewPurchases)
            {
                CurrentView = new AccessDeniedViewModel();
                CurrentPageTitle = "Access Denied";
            }
            else
            {
                CurrentView = new PurchaseDashboardViewModel();
                CurrentPageTitle = "Purchase Management";
            }
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToPurchaseProducts()
        {
            if (!Services.SecurityService.CanViewPurchases)
            {
                CurrentView = new AccessDeniedViewModel();
                CurrentPageTitle = "Access Denied";
            }
            else
            {
                CurrentView = new PurchaseViewModel();
                CurrentPageTitle = "Purchase Products";
            }
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToUsers() 
        {
            if (!Services.SecurityService.CanViewUsers)
            {
                CurrentView = new AccessDeniedViewModel();
                CurrentPageTitle = "Access Denied";
            }
            else
            {
                CurrentView = new UsersViewModel();
                CurrentPageTitle = "User Management";
            }
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToReports() 
        {
            if (!Services.SecurityService.CanViewReports)
            {
                CurrentView = new AccessDeniedViewModel();
                CurrentPageTitle = "Access Denied";
            }
            else
            {
                CurrentView = new ReportsViewModel();
                CurrentPageTitle = "Reports & Analytics";
            }
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToSettings() 
        {
            if (!Services.SecurityService.CanViewSettings)
            {
                CurrentView = new AccessDeniedViewModel();
                CurrentPageTitle = "Access Denied";
            }
            else
            {
                CurrentView = new SettingsViewModel();
                CurrentPageTitle = "System Settings";
            }
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToConnectPhone() 
        {
            CurrentView = new ConnectPhoneViewModel();
            CurrentPageTitle = "Phone Connection";
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void NavigateToLicense() 
        {
            if (!Services.SecurityService.CanViewSettings)
            {
                CurrentView = new AccessDeniedViewModel();
                CurrentPageTitle = "Access Denied";
            }
            else
            {
                CurrentView = new LicenseViewModel();
                CurrentPageTitle = "License Management";
            }
            IsSidebarOpen = false;
        }

        [RelayCommand]
        public void Logout()
        {
            Services.SecurityService.CurrentUser = null;
            var loginView = new Views.LoginView();
            loginView.Show();
            Application.Current.MainWindow.Close();
            Application.Current.MainWindow = loginView;
        }
    }
}
