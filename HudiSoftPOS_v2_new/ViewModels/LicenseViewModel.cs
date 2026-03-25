using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Windows;
using HudiSoftPOS.Services;
using System.Linq;

namespace HudiSoftPOS.ViewModels
{
    public partial class LicenseViewModel : ObservableObject
    {
        private readonly LicenseService _licenseService;

        [ObservableProperty] private string licenseKey = "N/A";
        [ObservableProperty] private string registeredTo = "Unregistered";
        [ObservableProperty] private DateTime expiryDate = DateTime.MinValue;
        [ObservableProperty] private string status = "Not Activated";
        [ObservableProperty] private string machineId = "Pending...";
        [ObservableProperty] private string daysRemainingText = "0 days remaining";

        [ObservableProperty] private string newLicenseKey = string.Empty;
        [ObservableProperty] private bool isLoading;

        public LicenseViewModel()
        {
            _licenseService = new LicenseService();
            MachineId = _licenseService.GetMachineId();
            LoadLicenseData();
        }

        private async void LoadLicenseData()
        {
            var info = await _licenseService.GetLocalLicenseAsync();
            if (info != null)
            {
                LicenseKey = info.LicenseKey;
                ExpiryDate = info.ExpiryDate;
                Status = info.Status;
                
                var remaining = info.ExpiryDate - DateTime.Now;
                DaysRemainingText = $"{(int)Math.Max(0, remaining.TotalDays)} days remaining";
                
                // For "Registered To", we could fetch from API or store in LicenseInfo. 
                // Using a placeholder for now.
                RegisteredTo = info.IsTrial ? "Trial User" : "Valued Customer";
            }
        }

        [RelayCommand]
        private async Task ActivateLicense()
        {
            if (string.IsNullOrWhiteSpace(NewLicenseKey))
            {
                MessageBox.Show("Please enter a valid license key.");
                return;
            }

            IsLoading = true;
            try
            {
                var (valid, message, info) = await _licenseService.ValidateLicenseAsync(NewLicenseKey);

                if (valid && info != null)
                {
                    await _licenseService.SaveLicenseAsync(info);
                    LoadLicenseData();
                    MessageBox.Show(message, "Activation Success", MessageBoxButton.OK, MessageBoxImage.Information);
                }
                else
                {
                    MessageBox.Show(message, "Activation Failed", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            finally
            {
                IsLoading = false;
            }
        }

        [RelayCommand]
        private void DeactivateLicense()
        {
            var result = MessageBox.Show("Are you sure you want to deactivate the license on this machine?", "Confirm Deactivation", MessageBoxButton.YesNo, MessageBoxImage.Warning);
            if (result == MessageBoxResult.Yes)
            {
                // Simple local reset for now. Real deactivation would call the API.
                Status = "Not Activated";
                LicenseKey = "N/A";
                DaysRemainingText = "0 days remaining";
                
                // Clear from DB
                using (var context = new Data.AppDbContext())
                {
                    var existing = context.LicenseInfos.FirstOrDefault();
                    if (existing != null)
                    {
                        context.LicenseInfos.Remove(existing);
                        context.SaveChanges();
                    }
                }
            }
        }
    }
}
