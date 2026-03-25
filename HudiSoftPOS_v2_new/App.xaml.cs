using System.Windows;
using Microsoft.EntityFrameworkCore;
using HudiSoftPOS.Data;
using System.Windows.Input;
using HudiSoftPOS.Services;
using HudiSoftPOS.Views;
using System.Threading.Tasks;
using System.Linq;
using System;

namespace HudiSoftPOS
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // Disable Right Click Globally
            EventManager.RegisterClassHandler(typeof(Window), Window.PreviewMouseRightButtonDownEvent, new MouseButtonEventHandler((s, args) => args.Handled = true));

            try
            {
                using (var context = new AppDbContext())
                {
                    // EnsureCreated only works if the DB doesn't exist.
                    // If it exists but models changed, it won't add columns.
                    context.Database.EnsureCreated();

                    // Update Users table schema - ensuring new columns exist
                    string[] userColumns = { 
                        "ALTER TABLE Users ADD COLUMN FullName TEXT DEFAULT '';",
                        "ALTER TABLE Users ADD COLUMN Email TEXT DEFAULT '';",
                        "ALTER TABLE Users ADD COLUMN Phone TEXT DEFAULT '';",
                        "ALTER TABLE Users ADD COLUMN Status TEXT DEFAULT 'Active';",
                        "ALTER TABLE Users ADD COLUMN Address TEXT DEFAULT '';",
                        "ALTER TABLE Users ADD COLUMN CreatedDate TEXT DEFAULT '2026-02-21 00:00:00';",
                        "ALTER TABLE Users ADD COLUMN LastLogin TEXT NULL;"
                    };

                    foreach (var sql in userColumns)
                    {
                        try { context.Database.ExecuteSqlRaw(sql); } catch { }
                    }

                    // Fix any existing empty CreatedDate strings to avoid parse errors
                    try { context.Database.ExecuteSqlRaw("UPDATE Users SET CreatedDate = '2026-02-21 00:00:00' WHERE CreatedDate = '' OR CreatedDate IS NULL;"); } catch { }

                    // Check if TableNumber column exists in Tables
                    try { context.Database.ExecuteSqlRaw("ALTER TABLE Tables ADD COLUMN TableNumber TEXT DEFAULT '';"); } catch { }

                    // Orders: Customer, Table, Room (dynamic from POS)
                    try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders ADD COLUMN CustomerName TEXT DEFAULT 'Walking Customer';"); } catch { }
                    try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders ADD COLUMN TableName TEXT DEFAULT '';"); } catch { }
                    try { context.Database.ExecuteSqlRaw("ALTER TABLE Orders ADD COLUMN Room TEXT DEFAULT 'Main Hall';"); } catch { }

                    // Ensure admin user always exists
                    try 
                    {
                        if (!context.Users.Any(u => u.Username == "admin"))
                        {
                            context.Users.Add(new HudiSoftPOS.Models.User
                            {
                                Username = "admin",
                                FullName = "System Administrator",
                                PasswordHash = "admin123",
                                Role = "Admin",
                                Pin = "1234",
                                Status = "Active",
                                CreatedDate = DateTime.Now
                            });
                        }

                        // Ensure 'damo' user exists as requested
                        if (!context.Users.Any(u => u.Username == "damo"))
                        {
                            context.Users.Add(new HudiSoftPOS.Models.User
                            {
                                Username = "damo",
                                FullName = "Demo User",
                                PasswordHash = "damo123",
                                Role = "Admin",
                                Pin = "1234",
                                Status = "Active",
                                CreatedDate = DateTime.Now
                            });
                        }
                        context.SaveChanges();
                    }
                    catch { /* Handle potential schema sync issues gracefully on first run */ }

                    // Ensure LicenseInfos table exists
                    try { context.Database.ExecuteSqlRaw("CREATE TABLE IF NOT EXISTS LicenseInfos (Id INTEGER PRIMARY KEY AUTOINCREMENT, LicenseKey TEXT, MachineId TEXT, ExpiryDate TEXT, IsTrial INTEGER, Status TEXT, LastValidated TEXT);"); } catch { }

                    context.SaveChanges();
                }

                // --- LICENSE CHECK ---
                var licenseService = new LicenseService();
                var localLicense = Task.Run(async () => await licenseService.GetLocalLicenseAsync()).Result;
                bool isAuthorized = false;

                if (localLicense != null)
                {
                    // Validate existing license (handles grace period internally)
                    var validation = Task.Run(async () => await licenseService.ValidateLicenseAsync(localLicense.LicenseKey)).Result;
                    if (validation.Valid)
                    {
                        isAuthorized = true;
                    }
                }

                if (!isAuthorized)
                {
                    var activationWindow = new ActivationWindow();
                    bool? result = activationWindow.ShowDialog();
                    if (result != true)
                    {
                        Shutdown();
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error during startup: {ex.Message}", "Startup Error", MessageBoxButton.OK, MessageBoxImage.Error);
                Shutdown();
            }
        }
    }
}
