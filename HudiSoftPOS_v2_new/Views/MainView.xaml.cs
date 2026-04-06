using System;
using System.Windows;
using System.Windows.Media.Imaging;
using HudiSoftPOS.ViewModels;

namespace HudiSoftPOS.Views
{
    public partial class MainView : Window
    {
        public MainView()
        {
            InitializeComponent();
            DataContext = new MainViewModel();
            // Ensure icon at runtime using explicit pack URI (ICO-safe loader)
            try
            {
                this.Icon = BitmapFrame.Create(new Uri("pack://application:,,,/Assets/icom1.ico", UriKind.Absolute));
            }
            catch { /* keep app running even if icon fails */ }
        }


        private void BtnMinimize_Click(object sender, RoutedEventArgs e)
        {
            WindowState = WindowState.Minimized;
        }

        private void BtnMaximize_Click(object sender, RoutedEventArgs e)
        {
            WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
        }

        private void BtnClose_Click(object sender, RoutedEventArgs e)
        {
            Application.Current.Shutdown();
        }
    }
}
