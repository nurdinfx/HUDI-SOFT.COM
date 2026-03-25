using Microsoft.EntityFrameworkCore;
using HudiSoftPOS.Models;
using System.IO;

namespace HudiSoftPOS.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Product> Products { get; set; } = null!;
        public DbSet<Order> Orders { get; set; } = null!;
        public DbSet<OrderItem> OrderItems { get; set; } = null!;
        public DbSet<Table> Tables { get; set; } = null!;
        public DbSet<Customer> Customers { get; set; } = null!;
        public DbSet<LedgerTransaction> LedgerTransactions { get; set; } = null!;
        public DbSet<FinanceTransaction> FinanceTransactions { get; set; } = null!;
        public DbSet<Supplier> Suppliers { get; set; } = null!;
        public DbSet<Purchase> Purchases { get; set; } = null!;
        public DbSet<PurchaseItem> PurchaseItems { get; set; } = null!;
        public DbSet<LicenseInfo> LicenseInfos { get; set; } = null!;

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            var dbPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HudiSoftPOS.db");
            optionsBuilder.UseSqlite($"Data Source={dbPath}");
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Seed Admin User
            modelBuilder.Entity<User>().HasData(
                new User { Id = 1, Username = "admin", FullName = "System Administrator", PasswordHash = "admin123", Role = "Admin", Pin = "1234", Status = "Active" },
                new User { Id = 2, Username = "damo", FullName = "Demo User", PasswordHash = "damo123", Role = "Admin", Pin = "1234", Status = "Active" }
            );

            // Seed Sample Products
            modelBuilder.Entity<Product>().HasData(
                new Product { Id = 1, Name = "Chicken Burger", Price = 12.99m, Cost = 8.00m, Category = "Main Course", StockQuantity = 5, Status = "LowStock" },
                new Product { Id = 2, Name = "French Fries", Price = 4.50m, Cost = 2.00m, Category = "Sides", StockQuantity = 50, Status = "Available" },
                new Product { Id = 3, Name = "Coca Cola", Price = 2.50m, Cost = 1.00m, Category = "Beverages", StockQuantity = 8, Status = "LowStock" }
            );

            // Seed Tables
            modelBuilder.Entity<Table>().HasData(
                new Table { Id = 1, Name = "Window Side 1", TableNumber = "Table T-01", Capacity = 4, Location = "indoor", IsOccupied = false },
                new Table { Id = 2, Name = "Window Side 2", TableNumber = "Table T-02", Capacity = 4, Location = "indoor", IsOccupied = true },
                new Table { Id = 3, Name = "Garden View 1", TableNumber = "Table T-03", Capacity = 2, Location = "outdoor", IsOccupied = false },
                new Table { Id = 4, Name = "VIP Lounge", TableNumber = "Table VIP-1", Capacity = 6, Location = "vip", IsOccupied = false }
            );

            // Seed Customers
            modelBuilder.Entity<Customer>().HasData(
                new Customer { Id = 1, Name = "Alice Johnson", Phone = "123-456-7890", Email = "alice@example.com", Address = "123 Main St" }
            );

            // Seed Ledger Transactions for Alice
            modelBuilder.Entity<LedgerTransaction>().HasData(
                new LedgerTransaction { Id = 1, CustomerId = 1, TransactionDate = DateTime.Now.AddDays(-5), Reference = "#ORD-101", Type = "Debit", Amount = 150.00m, BalanceAfter = 150.00m, Description = "Order #ORD-101" },
                new LedgerTransaction { Id = 2, CustomerId = 1, TransactionDate = DateTime.Now.AddDays(-3), Reference = "PMT-001", Type = "Credit", Amount = 50.00m, BalanceAfter = 100.00m, Description = "Partial Payment" },
                new LedgerTransaction { Id = 3, CustomerId = 1, TransactionDate = DateTime.Now.AddDays(-1), Reference = "#ORD-105", Type = "Debit", Amount = 75.50m, BalanceAfter = 175.50m, Description = "Order #ORD-105" }
            );

            // Seed Finance Transactions
            modelBuilder.Entity<FinanceTransaction>().HasData(
                new FinanceTransaction { Id = 1, Date = DateTime.Now, Type = "Expense", Amount = 120.00m, PaymentMethod = "Cash", Note = "Electricity Bill", Reference = "EB-001" },
                new FinanceTransaction { Id = 2, Date = DateTime.Now, Type = "Income", Amount = 850.50m, PaymentMethod = "Bank", Note = "Event Catering", Reference = "CAT-101" },
                new FinanceTransaction { Id = 3, Date = DateTime.Now.AddDays(-1), Type = "Expense", Amount = 450.00m, PaymentMethod = "Transfer", Note = "Purchase Order PUR-001", Reference = "PUR-001" },
                new FinanceTransaction { Id = 4, Date = DateTime.Now.AddDays(-1), Type = "Income", Amount = 1250.00m, PaymentMethod = "Multiple", Note = "Daily POS Sales", Reference = "POS-SALES-19" }
            );

            // Seed Suppliers
            modelBuilder.Entity<Supplier>().HasData(
                new Supplier { Id = 1, Name = "Global Foods Inc.", ContactPerson = "John Doe", Phone = "555-0101", Email = "orders@globalfoods.com", Address = "Food Industrial Park" },
                new Supplier { Id = 2, Name = "Fresh Veggies Ltd.", ContactPerson = "Jane Smith", Phone = "555-0202", Email = "sales@freshveggies.com", Address = "Farmers Market Block A" }
            );
        }
    }
}
