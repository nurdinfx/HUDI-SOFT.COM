using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HudiSoftPOS.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Username { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;
        
        [Required]
        public string PasswordHash { get; set; } = string.Empty;
        
        public string Role { get; set; } = "Staff"; // Admin, Manager, Cashier, Waiter, Chef
        
        public string Pin { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;

        public string Status { get; set; } = "Active"; // Active, Deactivated

        public string Address { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public DateTime? LastLogin { get; set; }
    }

    public class Product
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;
        
        public decimal Price { get; set; }
        
        public decimal Cost { get; set; }

        public string Status { get; set; } = "Available"; // Available, OutOfStock, LowStock

        public int StockQuantity { get; set; }
        
        public string Category { get; set; } = "General";
        
        public string ImagePath { get; set; } = string.Empty;
    }

    public class Order
    {
        [Key]
        public int Id { get; set; }
        
        public DateTime OrderTime { get; set; } = DateTime.Now;
        
        public decimal TotalAmount { get; set; }
        
        public string Status { get; set; } = "Pending"; // Pending, Completed, Cancelled
        
        public int UserId { get; set; }
        
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        public decimal Vat => TotalAmount * 0.04m;

        [NotMapped]
        public string ServedByDisplayName => User != null
            ? (string.IsNullOrWhiteSpace(User.FullName) ? User.Username : User.FullName)
            : "—";

        /// <summary>Customer selected on POS (e.g. "Walking Customer", "Alice Johnson").</summary>
        public string CustomerName { get; set; } = "Walking Customer";

        /// <summary>Table selected on POS (e.g. "T-1", "Table: None").</summary>
        public string TableName { get; set; } = string.Empty;

        /// <summary>Room selected on POS (e.g. "Main Hall", "Booked Room").</summary>
        public string Room { get; set; } = "Main Hall";

        public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }

    public class Table
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Name { get; set; } = string.Empty;

        public string TableNumber { get; set; } = string.Empty;
        
        public int Capacity { get; set; }
        
        public string Location { get; set; } = "Main Hall"; // Indoor, Outdoor, Window, etc.
        
        public bool IsOccupied { get; set; }
    }

    public class OrderItem
    {
        [Key]
        public int Id { get; set; }
        
        public int OrderId { get; set; }
        
        [ForeignKey("OrderId")]
        public virtual Order Order { get; set; } = null!;
        
        public int ProductId { get; set; }
        
        [ForeignKey("ProductId")]
        public virtual Product Product { get; set; } = null!;
        
        public int Quantity { get; set; }
        
        public decimal SubTotal { get; set; }
    }

    public class Customer
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Name { get; set; } = string.Empty;
        
        public string Phone { get; set; } = string.Empty;
        
        public string Email { get; set; } = string.Empty;
        
        public string Address { get; set; } = string.Empty;

        public virtual ICollection<LedgerTransaction> Transactions { get; set; } = new List<LedgerTransaction>();
    }

    public class LedgerTransaction
    {
        [Key]
        public int Id { get; set; }
        
        public int CustomerId { get; set; }
        
        [ForeignKey("CustomerId")]
        public virtual Customer Customer { get; set; } = null!;
        
        public DateTime TransactionDate { get; set; } = DateTime.Now;
        
        public string Reference { get; set; } = string.Empty;
        
        public string Type { get; set; } = "Debit"; // Debit (Customer Owes), Credit (Customer Paid)
        
        public decimal Amount { get; set; }
        
        public decimal BalanceAfter { get; set; }
        
        public string Description { get; set; } = string.Empty;
    }

    public class FinanceTransaction
    {
        [Key]
        public int Id { get; set; }
        
        public DateTime Date { get; set; } = DateTime.Now;
        
        public string Type { get; set; } = "Income"; // Income, Expense
        
        public decimal Amount { get; set; }
        
        public string Category { get; set; } = "General";
        
        public string PaymentMethod { get; set; } = "Cash";
        
        public string Note { get; set; } = string.Empty;
        
        public string Reference { get; set; } = string.Empty;
    }

    public class Supplier
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Name { get; set; } = string.Empty;
        
        public string ContactPerson { get; set; } = string.Empty;
        
        public string Phone { get; set; } = string.Empty;
        
        public string Email { get; set; } = string.Empty;
        
        public string Address { get; set; } = string.Empty;
    }

    public class Purchase
    {
        [Key]
        public int Id { get; set; }
        
        public DateTime PurchaseDate { get; set; } = DateTime.Now;
        
        public decimal TotalAmount { get; set; }
        
        public int SupplierId { get; set; }
        
        [ForeignKey("SupplierId")]
        public virtual Supplier Supplier { get; set; } = null!;
        
        public string ReferenceNumber { get; set; } = string.Empty;
        
        public string Status { get; set; } = "Completed";
        
        public virtual ICollection<PurchaseItem> PurchaseItems { get; set; } = new List<PurchaseItem>();
    }

    public class PurchaseItem
    {
        [Key]
        public int Id { get; set; }
        
        public int PurchaseId { get; set; }
        
        [ForeignKey("PurchaseId")]
        public virtual Purchase Purchase { get; set; } = null!;
        
        public int ProductId { get; set; }
        
        [ForeignKey("ProductId")]
        public virtual Product Product { get; set; } = null!;
        
        public int Quantity { get; set; }
        
        public decimal UnitCost { get; set; }
        
        public decimal SubTotal { get; set; }
    }

    public class LicenseInfo
    {
        [Key]
        public int Id { get; set; }
        
        public string LicenseKey { get; set; } = string.Empty;
        
        public string MachineId { get; set; } = string.Empty;
        
        public DateTime ExpiryDate { get; set; }
        
        public bool IsTrial { get; set; }
        
        public string Status { get; set; } = "Pending"; // Active, Expired, Invalid
        
        public DateTime LastValidated { get; set; } = DateTime.MinValue;
    }
}
