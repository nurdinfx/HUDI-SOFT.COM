export class EscPosBuilder {
  private width: number;

  constructor(paperSize: '58mm' | '80mm' = '58mm') {
    this.width = paperSize === '58mm' ? 32 : 48;
  }

  // Format line centered
  center(text: string): string {
    if (text.length >= this.width) return text.substring(0, this.width);
    const padding = Math.floor((this.width - text.length) / 2);
    return ' '.repeat(padding) + text;
  }

  // Format double columns: name aligned left, price/qty aligned right
  row(left: string, right: string): string {
    const spaceNeeded = this.width - left.length - right.length;
    if (spaceNeeded <= 0) {
      // If no space, split name onto two lines
      const truncatedLeft = left.substring(0, this.width - right.length - 2) + '..';
      const actualSpace = this.width - truncatedLeft.length - right.length;
      return truncatedLeft + ' '.repeat(actualSpace) + right;
    }
    return left + ' '.repeat(spaceNeeded) + right;
  }

  // Draw separation line
  divider(char = '-'): string {
    return char.repeat(this.width);
  }

  // Build a complete print payload as strings
  formatReceipt(order: any, cashierName: string): string[] {
    const lines: string[] = [];

    // Header
    lines.push(this.center('*** HUDI POS ***'));
    lines.push(this.center('HUDI SOFTWARE SOLUTION'));
    lines.push(this.center('www.hudi-soft.com'));
    lines.push(this.divider());

    // Order Info
    lines.push(this.row(`Order #: ${order.id.slice(-8).toUpperCase()}`, ''));
    lines.push(this.row(`Date: ${new Date(order.created_at).toLocaleDateString()}`, new Date(order.created_at).toLocaleTimeString()));
    lines.push(this.row(`Cashier: ${cashierName}`, ''));
    lines.push(this.row(`Payment: ${order.payment_method.toUpperCase()}`, ''));
    lines.push(this.divider());

    // Items Header
    lines.push(this.row('ITEM', 'TOTAL'));
    lines.push(this.divider('.'));

    // Items
    for (const item of order.items) {
      const itemSub = `${item.qty}x $${item.price.toFixed(2)}`;
      const itemTotal = `$${(item.qty * item.price).toFixed(2)}`;
      lines.push(this.row(item.name, ''));
      lines.push(this.row(`  ${itemSub}`, itemTotal));
    }

    lines.push(this.divider());

    // Totals
    lines.push(this.row('Subtotal:', `$${order.subtotal.toFixed(2)}`));
    lines.push(this.row('Tax:', `$${order.tax.toFixed(2)}`));
    if (order.discount > 0) {
      lines.push(this.row('Discount:', `-$${order.discount.toFixed(2)}`));
    }
    lines.push(this.row('TOTAL:', `$${order.total.toFixed(2)}`));
    lines.push(this.divider());

    // Footer
    lines.push(this.center('Thank you for shopping with us!'));
    lines.push(this.center('Please keep this receipt.'));
    lines.push('\n\n\n'); // Spacing to allow paper tear

    return lines;
  }
}
