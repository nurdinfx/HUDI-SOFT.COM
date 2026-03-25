using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Windows;

namespace HudiSoftPOS.ViewModels
{
    public partial class AccessDeniedViewModel : ObservableObject
    {
        [ObservableProperty]
        private string message = "You do not have permission to access this page.";

        [RelayCommand]
        private void GoBack()
        {
            // Simple logic to navigate back to POS since everyone has access to POS
            if (Application.Current.MainWindow.DataContext is MainViewModel mainVM)
            {
                mainVM.NavigateToPOS();
            }
        }
    }
}
