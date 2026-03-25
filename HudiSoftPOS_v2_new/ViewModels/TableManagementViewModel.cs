using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HudiSoftPOS.Data;
using HudiSoftPOS.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;

namespace HudiSoftPOS.ViewModels
{
    public partial class TableManagementViewModel : ObservableObject
    {
        private List<Table> _allTables = new();

        [ObservableProperty] private ObservableCollection<Table> tables = new();
        [ObservableProperty] private Table currentTable = new();
        [ObservableProperty] private bool isDialogOpen;

        // Stats
        [ObservableProperty] private int totalTables;
        [ObservableProperty] private int availableTables;
        [ObservableProperty] private int occupiedTables;

        // Filters
        [ObservableProperty] private string selectedStatusFilter = "All";
        [ObservableProperty] private string selectedLocationFilter = "All";
        [ObservableProperty] private string searchText = string.Empty;

        public ObservableCollection<string> StatusFilters { get; } = new() { "All", "Available", "Occupied", "Reserved" };
        public ObservableCollection<string> LocationFilters { get; } = new() { "All", "indoor", "outdoor", "vip" };

        public TableManagementViewModel()
        {
            _ = LoadTables();
        }

        [RelayCommand]
        public async Task LoadTables()
        {
            using (var context = new AppDbContext())
            {
                _allTables = await context.Tables.ToListAsync();
                UpdateStats();
                ApplyFilters();
            }
        }

        [RelayCommand]
        public void Refresh() => _ = LoadTables();

        partial void OnSelectedStatusFilterChanged(string value) => ApplyFilters();
        partial void OnSelectedLocationFilterChanged(string value) => ApplyFilters();
        partial void OnSearchTextChanged(string value) => ApplyFilters();

        private void ApplyFilters()
        {
            var filtered = _allTables.AsEnumerable();

            if (SelectedStatusFilter != "All")
            {
                bool wantOccupied = SelectedStatusFilter == "Occupied";
                filtered = filtered.Where(t => t.IsOccupied == wantOccupied);
            }

            if (SelectedLocationFilter != "All")
            {
                filtered = filtered.Where(t => t.Location.Equals(SelectedLocationFilter, System.StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrEmpty(SearchText))
            {
                filtered = filtered.Where(t => t.Name.Contains(SearchText, System.StringComparison.OrdinalIgnoreCase) || 
                                              t.TableNumber.Contains(SearchText, System.StringComparison.OrdinalIgnoreCase));
            }

            Tables = new ObservableCollection<Table>(filtered);
        }

        private void UpdateStats()
        {
            TotalTables = _allTables.Count;
            AvailableTables = _allTables.Count(t => !t.IsOccupied);
            OccupiedTables = _allTables.Count(t => t.IsOccupied);
        }

        [RelayCommand]
        public void OpenAddDialog()
        {
            CurrentTable = new Table { Location = "indoor" };
            IsDialogOpen = true;
        }

        [RelayCommand]
        public void OpenEditDialog(Table table)
        {
            CurrentTable = new Table 
            { 
                Id = table.Id,
                Name = table.Name,
                TableNumber = table.TableNumber,
                Capacity = table.Capacity,
                Location = table.Location,
                IsOccupied = table.IsOccupied
            };
            IsDialogOpen = true;
        }

        [RelayCommand]
        public async Task SaveTable()
        {
            if (string.IsNullOrEmpty(CurrentTable.Name)) return;

            using (var context = new AppDbContext())
            {
                if (CurrentTable.Id == 0)
                {
                    context.Tables.Add(CurrentTable);
                }
                else
                {
                    context.Tables.Update(CurrentTable);
                }
                await context.SaveChangesAsync();
            }
            IsDialogOpen = false;
            await LoadTables();
        }

        [RelayCommand]
        public async Task ToggleStatus(Table table)
        {
            if (table == null) return;
            using (var context = new AppDbContext())
            {
                var dbTable = await context.Tables.FindAsync(table.Id);
                if (dbTable != null)
                {
                    dbTable.IsOccupied = !dbTable.IsOccupied;
                    await context.SaveChangesAsync();
                }
            }
            await LoadTables();
        }

        [RelayCommand]
        public void ClearFilters()
        {
            SelectedStatusFilter = "All";
            SelectedLocationFilter = "All";
            SearchText = string.Empty;
        }

        [RelayCommand]
        public void CloseDialog() => IsDialogOpen = false;

        [RelayCommand]
        public async Task DeleteTable(Table table)
        {
            var result = MessageBox.Show($"Are you sure you want to delete {table.Name}?", "Delete Table", MessageBoxButton.YesNo, MessageBoxImage.Warning);
            if (result == MessageBoxResult.Yes)
            {
                using (var context = new AppDbContext())
                {
                    var dbTable = await context.Tables.FindAsync(table.Id);
                    if (dbTable != null)
                    {
                        context.Tables.Remove(dbTable);
                        await context.SaveChangesAsync();
                    }
                }
                await LoadTables();
            }
        }
    }
}
