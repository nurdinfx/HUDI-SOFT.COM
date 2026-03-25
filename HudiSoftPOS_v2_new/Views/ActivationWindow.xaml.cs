using System;
using System.Windows;
using HudiSoftPOS.Services;

namespace HudiSoftPOS.Views
{
    public partial class ActivationWindow : Window
    {
        private readonly LicenseService _licenseService;

        public ActivationWindow()
        {
            InitializeComponent();
            _licenseService = new LicenseService();
        }

        private async void ActivateButton_Click(object sender, RoutedEventArgs e)
        {
            string key = LicenseKeyInput.Text.Trim();
            if (string.IsNullOrEmpty(key))
            {
                StatusMessage.Text = "Please enter a license key.";
                return;
            }

            ActivateButton.IsEnabled = false;
            StatusMessage.Text = "Validating...";
            StatusMessage.Foreground = System.Windows.Media.Brushes.Silver;

            var (valid, message, info) = await _licenseService.ValidateLicenseAsync(key);

            if (valid && info != null)
            {
                await _licenseService.SaveLicenseAsync(info);
                StatusMessage.Text = "Success! Activation complete.";
                StatusMessage.Foreground = System.Windows.Media.Brushes.LightGreen;
                
                await Task.Delay(1500);
                this.DialogResult = true;
                this.Close();
            }
            else
            {
                StatusMessage.Text = message;
                StatusMessage.Foreground = System.Windows.Media.Brushes.Salmon;
                ActivateButton.IsEnabled = true;
            }
        }

        private void TrialButton_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("To get a 3-day trial, please visit https://hudi-soft.com and request a demo. You will receive a trial key immediately.", "Get Trial Key", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            Application.Current.Shutdown();
        }
    }
}
