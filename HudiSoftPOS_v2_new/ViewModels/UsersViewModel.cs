using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HudiSoftPOS.Data;
using HudiSoftPOS.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;

namespace HudiSoftPOS.ViewModels
{
    public partial class UsersViewModel : ObservableObject
    {
        [ObservableProperty] private ObservableCollection<User> users = new();
        private List<User> _allUsers = new();

        // ── Modal state ──────────────────────────────────────────────
        [ObservableProperty] private bool isAddUserOpen;
        [ObservableProperty] private bool isEditUserOpen;

        // ── Editing ───────────────────────────────────────────────────
        private User? _editingUser;
        [ObservableProperty] private string editFullName = string.Empty;
        [ObservableProperty] private string editUsername = string.Empty;
        [ObservableProperty] private string editEmail = string.Empty;
        [ObservableProperty] private string editPhone = string.Empty;
        [ObservableProperty] private string editPin = string.Empty;
        [ObservableProperty] private string editRole = "waiter";
        [ObservableProperty] private string editAddress = string.Empty;

        // ── Filtering ─────────────────────────────────────────────────
        [ObservableProperty] private string searchText = string.Empty;
        [ObservableProperty] private string selectedRoleFilter = "All";

        // ── New User Fields ───────────────────────────────────────────
        [ObservableProperty] private string newFullName = string.Empty;
        [ObservableProperty] private string newUsername = string.Empty;
        [ObservableProperty] private string newEmail = string.Empty;
        [ObservableProperty] private string newPhone = string.Empty;
        [ObservableProperty] private string newPassword = string.Empty;
        [ObservableProperty] private string newConfirmPassword = string.Empty;
        [ObservableProperty] private string newPin = string.Empty;
        [ObservableProperty] private string newRole = "waiter";
        [ObservableProperty] private string newAddress = string.Empty;

        public ObservableCollection<string> Roles { get; } = new() { "admin", "manager", "cashier", "waiter", "chef" };
        public ObservableCollection<string> FilterRoles { get; } = new() { "All", "admin", "manager", "cashier", "waiter", "chef" };

        public UsersViewModel()
        {
            _ = LoadUsersAsync();
        }

        // ══════════════════════════════════════════════════════════════
        // LOAD & FILTER
        // ══════════════════════════════════════════════════════════════

        [RelayCommand]
        public async Task LoadUsersAsync()
        {
            using var context = new AppDbContext();
            _allUsers = await context.Users.OrderBy(u => u.FullName).ToListAsync();
            FilterUsers();
        }

        partial void OnSearchTextChanged(string value) => FilterUsers();
        partial void OnSelectedRoleFilterChanged(string value) => FilterUsers();

        private void FilterUsers()
        {
            var filtered = _allUsers.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(SearchText))
            {
                var lowerSearch = SearchText.ToLower();
                filtered = filtered.Where(u =>
                    u.FullName.ToLower().Contains(lowerSearch) ||
                    u.Username.ToLower().Contains(lowerSearch) ||
                    u.Email.ToLower().Contains(lowerSearch));
            }

            if (SelectedRoleFilter != "All")
                filtered = filtered.Where(u => u.Role.Equals(SelectedRoleFilter, StringComparison.OrdinalIgnoreCase));

            Users = new ObservableCollection<User>(filtered.ToList());
        }

        [RelayCommand]
        private void ClearFilters()
        {
            SearchText = string.Empty;
            SelectedRoleFilter = "All";
        }

        // ══════════════════════════════════════════════════════════════
        // ADD USER
        // ══════════════════════════════════════════════════════════════

        [RelayCommand]
        private void OpenAddUser()
        {
            ResetNewUserFields();
            IsAddUserOpen = true;
        }

        private void ResetNewUserFields()
        {
            NewFullName = string.Empty;
            NewUsername = string.Empty;
            NewEmail = string.Empty;
            NewPhone = string.Empty;
            NewPassword = string.Empty;
            NewConfirmPassword = string.Empty;
            NewPin = string.Empty;
            NewRole = "waiter";
            NewAddress = string.Empty;
        }

        [RelayCommand]
        private void CloseAddUser() => IsAddUserOpen = false;

        [RelayCommand]
        private async Task SaveUserAsync()
        {
            if (string.IsNullOrWhiteSpace(NewUsername) || string.IsNullOrWhiteSpace(NewFullName))
            {
                MessageBox.Show("Full Name and Username are required.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (string.IsNullOrWhiteSpace(NewPassword))
            {
                MessageBox.Show("Password is required.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (NewPassword != NewConfirmPassword)
            {
                MessageBox.Show("Passwords do not match.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (!string.IsNullOrWhiteSpace(NewPin) && NewPin.Length < 4)
            {
                MessageBox.Show("Quick PIN must be at least 4 digits.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            try
            {
                using var context = new AppDbContext();

                // Check for duplicate username
                var exists = await context.Users.AnyAsync(u => u.Username == NewUsername);
                if (exists)
                {
                    MessageBox.Show($"Username '{NewUsername}' is already taken.", "Duplicate Username", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                var user = new User
                {
                    FullName = NewFullName,
                    Username = NewUsername,
                    Email = NewEmail,
                    Phone = NewPhone,
                    PasswordHash = NewPassword,
                    Pin = NewPin,
                    Role = NewRole,
                    Address = NewAddress,
                    Status = "Active",
                    CreatedDate = DateTime.Now
                };

                context.Users.Add(user);
                await context.SaveChangesAsync();

                IsAddUserOpen = false;
                await LoadUsersAsync();
                MessageBox.Show($"User '{NewFullName}' has been created successfully.", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error saving user: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        // ══════════════════════════════════════════════════════════════
        // EDIT USER
        // ══════════════════════════════════════════════════════════════

        [RelayCommand]
        private void OpenEditUser(User user)
        {
            if (user == null) return;
            _editingUser = user;

            // Pre-populate edit fields from selected user
            EditFullName = user.FullName;
            EditUsername = user.Username;
            EditEmail = user.Email ?? string.Empty;
            EditPhone = user.Phone ?? string.Empty;
            EditPin = user.Pin ?? string.Empty;
            EditRole = user.Role;
            EditAddress = user.Address ?? string.Empty;

            IsEditUserOpen = true;
        }

        [RelayCommand]
        private void CloseEditUser() => IsEditUserOpen = false;

        [RelayCommand]
        private async Task SaveEditAsync()
        {
            if (_editingUser == null) return;

            if (string.IsNullOrWhiteSpace(EditFullName) || string.IsNullOrWhiteSpace(EditUsername))
            {
                MessageBox.Show("Full Name and Username are required.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            try
            {
                using var context = new AppDbContext();

                // Check for duplicate username (excluding current user)
                var duplicate = await context.Users
                    .AnyAsync(u => u.Username == EditUsername && u.Id != _editingUser.Id);
                if (duplicate)
                {
                    MessageBox.Show($"Username '{EditUsername}' is already taken.", "Duplicate Username", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                var dbUser = await context.Users.FindAsync(_editingUser.Id);
                if (dbUser != null)
                {
                    dbUser.FullName = EditFullName;
                    dbUser.Username = EditUsername;
                    dbUser.Email = EditEmail;
                    dbUser.Phone = EditPhone;
                    dbUser.Pin = EditPin;
                    dbUser.Role = EditRole;
                    dbUser.Address = EditAddress;

                    await context.SaveChangesAsync();
                    IsEditUserOpen = false;
                    _editingUser = null;
                    await LoadUsersAsync();
                    MessageBox.Show("User updated successfully.", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error updating user: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        // ══════════════════════════════════════════════════════════════
        // TOGGLE STATUS
        // ══════════════════════════════════════════════════════════════

        [RelayCommand]
        private async Task ToggleStatusAsync(User user)
        {
            if (user == null) return;

            using var context = new AppDbContext();
            var dbUser = await context.Users.FindAsync(user.Id);
            if (dbUser != null)
            {
                dbUser.Status = dbUser.Status == "Active" ? "Deactivated" : "Active";
                await context.SaveChangesAsync();
                await LoadUsersAsync();
            }
        }

        // ══════════════════════════════════════════════════════════════
        // DELETE USER
        // ══════════════════════════════════════════════════════════════

        [RelayCommand]
        private async Task DeleteUserAsync(User user)
        {
            if (user == null) return;

            var result = MessageBox.Show(
                $"Are you sure you want to permanently delete user '{user.FullName}'?\nThis action cannot be undone.",
                "Confirm Delete", MessageBoxButton.YesNo, MessageBoxImage.Warning);

            if (result == MessageBoxResult.Yes)
            {
                using var context = new AppDbContext();
                var dbUser = await context.Users.FindAsync(user.Id);
                if (dbUser != null)
                {
                    context.Users.Remove(dbUser);
                    await context.SaveChangesAsync();
                    await LoadUsersAsync();
                }
            }
        }
    }
}
