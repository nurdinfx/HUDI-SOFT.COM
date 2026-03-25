using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Net.NetworkInformation;
using HudiSoftPOS.Data;
using HudiSoftPOS.Models;
using Microsoft.EntityFrameworkCore;

namespace HudiSoftPOS.Services
{
    public class LicenseService
    {
        private static readonly string BaseUrl = "https://hudi-soft-com.onrender.com/api/licenses";
        private readonly HttpClient _httpClient;

        public LicenseService()
        {
            _httpClient = new HttpClient();
        }

        public string GetMachineId()
        {
            try
            {
                var ni = NetworkInterface.GetAllNetworkInterfaces()
                    .OrderByDescending(i => i.Speed)
                    .FirstOrDefault(i => i.OperationalStatus == OperationalStatus.Up && i.NetworkInterfaceType != NetworkInterfaceType.Loopback);
                
                if (ni != null)
                {
                    return ni.GetPhysicalAddress().ToString();
                }
                return Environment.MachineName;
            }
            catch
            {
                return Environment.MachineName;
            }
        }

        public async Task<(bool Valid, string Message, LicenseInfo Info)> ValidateLicenseAsync(string licenseKey)
        {
            string machineId = GetMachineId();
            string url = $"{BaseUrl}/validate?key={licenseKey}&machineID={machineId}";

            try
            {
                var response = await _httpClient.GetAsync(url);
                var result = await response.Content.ReadFromJsonAsync<LicenseResponse>();

                if (response.IsSuccessStatusCode && result != null && result.Valid)
                {
                    var info = new LicenseInfo
                    {
                        LicenseKey = licenseKey,
                        MachineId = machineId,
                        ExpiryDate = result.ExpiryDate,
                        IsTrial = result.IsTrial,
                        Status = "Active",
                        LastValidated = DateTime.Now
                    };
                    return (true, "License validated successfully.", info);
                }
                else
                {
                    return (false, result?.Message ?? "Invalid license request.", null);
                }
            }
            catch (Exception ex)
            {
                // check local database for offline grace period
                using (var context = new AppDbContext())
                {
                    var localInfo = await context.LicenseInfos
                        .FirstOrDefaultAsync(l => l.LicenseKey == licenseKey && l.MachineId == machineId);

                    if (localInfo != null)
                    {
                        // Grace period: Allow 24 hours offline since last success
                        if (DateTime.Now < localInfo.LastValidated.AddHours(24) && DateTime.Now < localInfo.ExpiryDate)
                        {
                            return (true, "Offline validation (Grace Period active).", localInfo);
                        }
                    }
                }
                return (false, "Could not connect to validation server. " + ex.Message, null);
            }
        }

        public async Task SaveLicenseAsync(LicenseInfo info)
        {
            using (var context = new AppDbContext())
            {
                var existing = await context.LicenseInfos.FirstOrDefaultAsync();
                if (existing != null)
                {
                    context.LicenseInfos.Remove(existing);
                }
                context.LicenseInfos.Add(info);
                await context.SaveChangesAsync();
            }
        }

        public async Task<LicenseInfo?> GetLocalLicenseAsync()
        {
            using (var context = new AppDbContext())
            {
                return await context.LicenseInfos.OrderByDescending(l => l.LastValidated).FirstOrDefaultAsync();
            }
        }

        // Helper class for API response
        private class LicenseResponse
        {
            public bool Valid { get; set; }
            public string Message { get; set; } = "";
            public DateTime ExpiryDate { get; set; }
            public bool IsTrial { get; set; }
            public int DaysRemaining { get; set; }
        }
    }
}
