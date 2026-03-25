using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using HudiSoftPOS.ViewModels;

namespace HudiSoftPOS.Views
{
    public partial class LoginView : Window
    {
        public LoginView()
        {
            InitializeComponent();
            // Ensure icon at runtime using explicit pack URI (ICO-safe loader)
            try
            {
                this.Icon = BitmapFrame.Create(new Uri("pack://application:,,,/Assets/icom1.ico", UriKind.Absolute));
            }
            catch { /* keep app running even if icon fails */ }
        }
         
        // Helper to bind PasswordBox, as it cannot be bound directly in MVVM securely without behaviors
        private void PasswordBox_PasswordChanged(object sender, RoutedEventArgs e)
        {
            if (this.DataContext is LoginViewModel vm && sender is PasswordBox pb)
            {
                vm.Password = pb.Password;
            }
        }

        private void PinBox_PasswordChanged(object sender, RoutedEventArgs e)
        {
            if (this.DataContext is LoginViewModel vm && sender is PasswordBox pb)
            {
                vm.Pin = pb.Password;
            }
        }

        private void Window_MouseLeftButtonDown(object sender, System.Windows.Input.MouseButtonEventArgs e)
        {
            if (e.ChangedButton == System.Windows.Input.MouseButton.Left)
                this.DragMove();
        }
    }
}
