using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Threading.Tasks;

namespace HudiSoftPOS.ViewModels
{
    public partial class ConnectPhoneViewModel : ObservableObject
    {
        [ObservableProperty] private string serverIp = "192.168.1.45";
        [ObservableProperty] private string port = "5000";
        [ObservableProperty] private string connectionStatus = "Disconnected";
        [ObservableProperty] private string deviceName = "No Device Connected";
        [ObservableProperty] private bool isGenerating = false;

        public ConnectPhoneViewModel()
        {
            _ = GenerateQrCodeAsync();
        }

        [RelayCommand]
        public async Task GenerateQrCodeAsync()
        {
            IsGenerating = true;
            ConnectionStatus = "Generating QR Code...";
            
            // Simulate network discovery or server startup
            await Task.Delay(2000);
            
            IsGenerating = false;
            ConnectionStatus = "Ready to Connect";
        }

        [RelayCommand]
        private void DisconnectDevice()
        {
            DeviceName = "No Device Connected";
            ConnectionStatus = "Disconnected";
        }
    }
}
