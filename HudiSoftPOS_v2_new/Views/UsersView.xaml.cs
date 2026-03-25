using System.Windows.Controls;

namespace HudiSoftPOS.Views
{
    /// <summary>
    /// Interaction logic for UsersView.xaml
    /// </summary>
    public partial class UsersView : UserControl
    {
        public UsersView()
        {
            InitializeComponent();
        }

        private void NewPasswordBox_PasswordChanged(object sender, System.Windows.RoutedEventArgs e)
        {
            if (DataContext is ViewModels.UsersViewModel vm && sender is PasswordBox pb)
            {
                vm.NewPassword = pb.Password;
            }
        }

        private void NewConfirmPasswordBox_PasswordChanged(object sender, System.Windows.RoutedEventArgs e)
        {
            if (DataContext is ViewModels.UsersViewModel vm && sender is PasswordBox pb)
            {
                vm.NewConfirmPassword = pb.Password;
            }
        }
    }
}
