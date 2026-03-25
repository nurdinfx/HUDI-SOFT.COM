using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HudiSoftPOS.Data;
using HudiSoftPOS.Models;
using Microsoft.EntityFrameworkCore;
using System.Windows;

namespace HudiSoftPOS.ViewModels
{
    public partial class LoginViewModel : ObservableObject
    {
        [ObservableProperty]
        private string username = string.Empty;

        [ObservableProperty]
        private string password = string.Empty;

        [ObservableProperty]
        private string pin = string.Empty;

        [ObservableProperty]
        private bool isBusy;

        [ObservableProperty]
        [NotifyPropertyChangedFor(nameof(HasErrorMessage))]
        private string errorMessage = string.Empty;

        public bool HasErrorMessage => !string.IsNullOrWhiteSpace(ErrorMessage);

        [ObservableProperty]
        private bool isStaffLoginVisible = true;

        [ObservableProperty]
        private bool isPinLoginVisible = false;

        partial void OnIsStaffLoginVisibleChanged(bool value)
        {
            if (value) IsPinLoginVisible = false;
        }

        partial void OnIsPinLoginVisibleChanged(bool value)
        {
            if (value) IsStaffLoginVisible = false;
        }

        public LoginViewModel()
        {
        }

        [RelayCommand]
        private void Login()
        {
            if (IsBusy) return;
            IsBusy = true;
            ErrorMessage = string.Empty;

            try
            {
                using (var context = new AppDbContext())
                {
                    User? user = null;

                    if (IsStaffLoginVisible)
                    {
                        if (string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(Password))
                        {
                            ErrorMessage = "Please enter username and password.";
                            return;
                        }

                        user = context.Users.FirstOrDefault(u => u.Username == Username && u.PasswordHash == Password);
                    }
                    else
                    {
                        if (string.IsNullOrWhiteSpace(Pin))
                        {
                            ErrorMessage = "Please enter PIN.";
                            return;
                        }

                        user = context.Users.FirstOrDefault(u => u.Pin == Pin);
                    }

                    if (user != null)
                    {
                        // Set current user
                        Services.SecurityService.CurrentUser = user;

                        // Navigate to Main Window - simple synchronous navigation on UI thread
                        var mainView = new Views.MainView();
                        var oldWindow = Application.Current.MainWindow;
                        Application.Current.MainWindow = mainView;
                        mainView.Show();
                        oldWindow?.Close();
                    }
                    else
                    {
                        ErrorMessage = "Invalid credentials. Please try again.";
                    }
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Error: {ex.Message}";
            }
            finally
            {
                IsBusy = false;
            }
        }

        [RelayCommand]
        public void Exit()
        {
            Application.Current.Shutdown();
        }
    }
}
