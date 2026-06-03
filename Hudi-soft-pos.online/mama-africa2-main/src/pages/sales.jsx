import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { realApi } from '../api/realApi';
import { API_CONFIG } from '../config/api.config';
import { 
  Search, 
  Filter, 
  Printer, 
  Eye,
  Calendar as CalendarIcon,
  User as UserIcon,
  DollarSign
} from 'lucide-react';
import Header from '../components/Layout/Header';
import { printToIframe } from '../utils/print';
import { printBluetooth, connectBluetoothPrinter, isBluetoothConnected } from '../utils/bluetoothPrint';
import { toast } from 'react-hot-toast';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    servedBy: '',
    dateFrom: '',
    dateTo: ''
  });

  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sales, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, usersRes, settingsRes] = await Promise.all([
        realApi.getOrders({ limit: 1000 }),
        realApi.getUsers(),
        realApi.getSettings()
      ]);

      if (settingsRes?.success) setSettings(realApi.extractData(settingsRes));
      if (usersRes?.success) setUsers(realApi.extractData(usersRes) || []);
      
      if (ordersRes?.success) {
        const allOrders = realApi.extractData(ordersRes) || [];
        // Filter only sales (either orderType is sale, or you can adjust to include all)
        const salesOrders = allOrders.filter(o => ['sale', 'retail', 'dine-in', 'takeaway', 'delivery'].includes(o.orderType));
        
        // Sort by date descending
        salesOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setSales(salesOrders);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...sales];

    if (filters.search) {
      const lowerSearch = filters.search.toLowerCase();
      result = result.filter(sale => 
        (sale.orderNumber && sale.orderNumber.toLowerCase().includes(lowerSearch)) ||
        (sale.customer?.name && sale.customer.name.toLowerCase().includes(lowerSearch)) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(lowerSearch))
      );
    }

    if (filters.servedBy) {
      result = result.filter(sale => {
        const serverId = sale.servedBy?._id || sale.servedBy || sale.user?._id || sale.user || sale.cashier?._id || sale.cashier;
        return String(serverId) === String(filters.servedBy);
      });
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
      result = result.filter(sale => new Date(sale.createdAt).getTime() >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      result = result.filter(sale => new Date(sale.createdAt).getTime() <= toDate);
    }

    setFilteredSales(result);
  };

  const calculateTotals = () => {
    return filteredSales.reduce((sum, sale) => sum + (parseFloat(sale.finalTotal) || parseFloat(sale.totalAmount) || 0), 0);
  };

  const printReceipt = async (order) => {
    // Always fetch latest settings before printing so payment accounts are current
    let currentSettings = settings;
    try {
      const resp = await realApi.getSettings();
      if (resp && resp.success) {
        currentSettings = realApi.extractData(resp);
        setSettings(currentSettings);
      }
    } catch (e) {
      console.warn('Could not fetch latest settings for print:', e);
    }

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const originalOrderDate = (order.createdAt || order.orderDate) ? new Date(order.createdAt || order.orderDate) : now;
    const originalFormattedDate = `${String(originalOrderDate.getDate()).padStart(2, '0')}/${String(originalOrderDate.getMonth() + 1).padStart(2, '0')}/${originalOrderDate.getFullYear()} ${String(originalOrderDate.getHours()).padStart(2, '0')}:${String(originalOrderDate.getMinutes()).padStart(2, '0')}`;

    const restaurantName = currentSettings?.restaurantName || 'HUDI-SOFT';
    const receiptNumber = (order.orderNumber || '').split('-').pop() || Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    let serverName = order.cashier?.name || order.user?.name || 'System';
    const serverId = order.servedBy?._id || order.servedBy || order.user?._id || order.user || order.cashier?._id || order.cashier;
    if (serverId) {
        const servedByUser = users.find(u => String(u._id) === String(serverId));
        if (servedByUser) serverName = servedByUser.name;
    }

    const logoUrl = currentSettings?.logoUrl || currentSettings?.logo || '';
    const vatRate = parseFloat(currentSettings?.taxRate ?? 10) / 100;
    const zaad = currentSettings?.zaad || '';
    const sahal = currentSettings?.sahal || '';
    const edahab = currentSettings?.edahab || '';
    const myCash = currentSettings?.myCash || '';
    const receiptFooter = currentSettings?.receiptFooter || 'Thank you for your purchase!';

    const paymentLines = [
      zaad ? `ZAAD: ${zaad}` : '',
      sahal ? `SAHAL: ${sahal}` : '',
      edahab ? `E-DAHAB: ${edahab}` : '',
      myCash ? `MyCash: ${myCash}` : ''
    ].filter(Boolean);
    const paymentRow1 = paymentLines.slice(0, 2).join(' - ');
    const paymentRow2 = paymentLines.slice(2).join(' - ');

    const isVatDisabled = order.taxAmount === 0 || order.tax === 0;
    let subtotal = 0;
    const items = order.items || [];
    if (items && items.length > 0) {
      subtotal = items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)), 0);
    } else {
      subtotal = parseFloat(order.subtotal) || parseFloat(order.totalAmount) || 0;
    }

    const taxAmount = isVatDisabled ? 0 : subtotal * vatRate;
    const finalTotal = subtotal + taxAmount;
    const vatPercent = isVatDisabled ? 0 : Math.round(vatRate * 100);
    const receiptWidth = currentSettings?.receiptSize === 'A4' ? '210mm' : (currentSettings?.receiptSize || '80mm');
    
    let absoluteLogoUrl = logoUrl;
    if (absoluteLogoUrl && !absoluteLogoUrl.startsWith('http')) {
      absoluteLogoUrl = `${API_CONFIG.BACKEND_URL}${absoluteLogoUrl.startsWith('/') ? '' : '/'}${absoluteLogoUrl}`;
    }
    const logoHtml = absoluteLogoUrl ? `<div class="logo-container"><img src="${absoluteLogoUrl}" alt="Logo" class="logo-img" onerror="this.style.display='none'" /></div>` : '';

    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: ${receiptWidth} auto; margin: 0mm; }
            body { 
              font-family: 'Inter', -apple-system, sans-serif;
              margin: 0 auto;
              padding: 2mm;
              color: #000;
              font-size: 13px;
              width: ${receiptWidth};
              line-height: 1.4;
              -webkit-font-smoothing: antialiased;
            }
            .header { text-align: center; margin-bottom: 10px; }
            .restaurant-name { font-size: 18px; font-weight: 700; text-transform: uppercase; margin: 5px 0; }
            .phones { font-size: 11px; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
            .logo-container { display: flex; justify-content: center; margin-bottom: 8px; }
            .logo-img { max-width: 150px; max-height: 80px; object-fit: contain; }
            .info-section { margin-bottom: 10px; font-size: 12px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .info-label { font-weight: 600; }
            .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .items-table th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; font-size: 11px; text-transform: uppercase; }
            .items-table td { padding: 5px 0; vertical-align: top; font-size: 12px; border-bottom: 0.5px solid #eee; }
            .col-item { width: 50%; }
            .col-no { width: 10%; text-align: center; }
            .col-price { width: 20%; text-align: right; }
            .col-total { width: 20%; text-align: right; font-weight: 600; }
            .totals { margin-top: 10px; padding-top: 5px; border-top: 1px dashed #000; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 13px; }
            .grand-total { font-weight: 700; font-size: 18px; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
            .qr-container { display: flex; flex-direction: column; align-items: center; margin: 15px 0; }
            .footer { text-align: center; font-size: 11px; margin-top: 10px; }
            .cut-spacer { height: 120px; }
            .powered-by { font-size: 9px; color: #666; margin-top: 5px; }
            @media print {
              .cut-spacer { height: 120px; } /* Extra space for manual cutting */
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoHtml}
            <div class="restaurant-name">${restaurantName}</div>
            <div style="font-size: 11px;">${settings?.receiptHeader || ''}</div>
            ${(paymentRow1 || paymentRow2) ? `<div class="phones">${paymentRow1}${paymentRow1 && paymentRow2 ? '<br>' : ''}${paymentRow2}</div>` : ''}
          </div>
          <div style="text-align: center; font-weight: 700; margin: 5px 0;">*** SALES RECEIPT ***</div>
          <div class="info-section">
            <div class="info-row"><span class="info-label">Receipt No:</span><span>#${receiptNumber}</span></div>
            <div class="info-row"><span class="info-label">Served By:</span><span>${serverName}</span></div>
            <div class="info-row"><span class="info-label">Customer:</span><span>${order.customer?.name || order.customerName || 'Walking Customer'}</span></div>
            <div class="info-row"><span class="info-label">Date:</span><span>${originalFormattedDate}</span></div>
            ${order.tableNumber ? `<div class="info-row"><span class="info-label">Table:</span><span>${order.tableNumber}</span></div>` : ''}
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th class="col-item">PRODUCT NAME</th>
                <th class="col-no">QTY</th>
                <th class="col-price">PRICE</th>
                <th class="col-total">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const itemName = item.product_name || item.productName || item.name || item.itemName || (item.product && typeof item.product === 'object' ? item.product.name : '') || 'Item';
                const itemPrice = item.price || 0;
                const itemQuantity = item.quantity || 1;
                return `
                  <tr>
                    <td class="col-item">${itemName}</td>
                    <td class="col-no">${itemQuantity}</td>
                    <td class="col-price">${(itemPrice).toFixed(2)}</td>
                    <td class="col-total">${(itemPrice * itemQuantity).toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row"><span class="info-label">Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
            <div class="total-row"><span class="info-label">VAT @ ${vatPercent}%</span><span>$${taxAmount.toFixed(2)}</span></div>
            <div class="total-row grand-total"><span>TOTAL</span><span>$${finalTotal.toFixed(2)}</span></div>
          </div>
          <div class="qr-container"><div id="qrcode"></div></div>
          <div class="footer">
            <div>${receiptFooter}</div>
            <div class="powered-by">POWERED BY HUDI-SOFT</div>
          </div>
          <div class="cut-spacer"></div>
          <script>
            window.onload = function() {
              if (typeof QRCode !== 'undefined') {
                new QRCode(document.getElementById("qrcode"), {
                  text: "ORDER-${receiptNumber}",
                  width: 100, height: 100, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H
                });
              }
            };
          </script>
        </body>
      </html>
    `;

    // Direct Bluetooth Priority (Bypasses Chrome Preview)
    if (isBluetoothConnected()) {
      try {
        const btText = `${sale.restaurantName || 'MAMA AFRICA'}\n` +
                     `Sale: #${sale.orderNumber || sale._id}\n` +
                     `Total: $${finalTotal.toFixed(2)}\n\n\n\n`;
        printBluetooth(btText);
        return;
      } catch (e) {}
    }

    printToIframe(receiptContent);
  };

  const getUserName = (sale) => {
    const serverId = sale.servedBy?._id || sale.servedBy || sale.user?._id || sale.user || sale.cashier?._id || sale.cashier;
    if (serverId) {
        const servedByUser = users.find(u => String(u._id) === String(serverId));
        if (servedByUser) return servedByUser.name;
    }
    return sale.cashier?.name || sale.user?.name || 'System';
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="p-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Sales History</h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">Track and manage all direct sales transactions</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-white px-4 md:px-6 py-2 md:py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 w-full">
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] md:text-sm text-slate-500 font-medium uppercase tracking-tight">Total Sales</p>
                <p className="text-lg md:text-xl font-bold text-slate-900">${calculateTotals().toFixed(2)}</p>
              </div>
            </div>

            <button 
              onClick={async () => {
                try {
                  const device = await connectBluetoothPrinter();
                  toast.success(`Paired with ${device.name}`);
                } catch (e) {
                  toast.error('Bluetooth Pairing Failed');
                }
              }} 
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-sm transition-all flex items-center gap-2 font-bold text-xs"
              title="Pair Bluetooth Printer"
            >
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse"></span>
                BT
              </div>
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold">
            <Filter className="w-4 h-4" />
            <h2>Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all h-[40px]"
              />
            </div>

            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <select
                value={filters.servedBy}
                onChange={(e) => setFilters({...filters, servedBy: e.target.value})}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm appearance-none bg-white transition-all h-[40px]"
              >
                <option value="">All Staff</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="relative flex flex-col">
              <CalendarIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400 z-10" />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all h-[40px]"
              />
            </div>

            <div className="relative flex flex-col">
              <CalendarIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400 z-10" />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all h-[40px]"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => setFilters({search: '', servedBy: '', dateFrom: '', dateTo: ''})}
              className="text-sm text-slate-500 hover:text-slate-800 font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] md:text-xs uppercase tracking-wider font-semibold">
                  <th className="px-3 md:px-6 py-4">Receipt</th>
                  <th className="px-3 md:px-6 py-4 hidden sm:table-cell">Date</th>
                  <th className="px-3 md:px-6 py-4">Customer</th>
                  <th className="px-3 md:px-6 py-4 hidden md:table-cell">Staff</th>
                  <th className="px-3 md:px-6 py-4 hidden lg:table-cell">Status</th>
                  <th className="px-3 md:px-6 py-4 text-right">Amount</th>
                  <th className="px-3 md:px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full"></div>
                      <p className="mt-2 text-slate-500 text-sm">Loading sales...</p>
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="text-slate-400 mb-2">
                        <DollarSign className="w-8 h-8 mx-auto opacity-50" />
                      </div>
                      <p className="text-slate-600 font-medium">No sales found</p>
                      <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-3 md:px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-blue-600 text-xs md:text-sm">
                            #{((sale.orderNumber) || '').split('-').pop()}
                          </span>
                          <span className="text-[10px] text-slate-400 sm:hidden">
                            {new Date(sale.createdAt || sale.orderDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-slate-600 hidden sm:table-cell">
                        {new Date(sale.createdAt || sale.orderDate).toLocaleString([], {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-slate-800 font-medium">
                        <div className="max-w-[100px] md:max-w-none truncate">
                          {sale.customer?.name || sale.customerName || 'Walking'}
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-slate-600 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                            {getUserName(sale).charAt(0).toUpperCase()}
                          </div>
                          {getUserName(sale)}
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 hidden lg:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          sale.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          sale.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sale.status ? sale.status.charAt(0).toUpperCase() + sale.status.slice(1) : 'Completed'}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-right">
                        <span className="font-bold text-slate-900 text-xs md:text-sm">
                          ${(parseFloat(sale.finalTotal) || parseFloat(sale.totalAmount) || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-center">
                        <button
                          onClick={() => printReceipt(sale)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Print Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;
