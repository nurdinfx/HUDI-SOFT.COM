// components/POS/POSInterface.js
import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { orderAPI } from '../../api/orders';
import { realApi } from '../../api/realApi';
import ProductGrid from './ProductGrid';
import OrderCart from './OrderCart';
import CustomerSearch from './CustomerSearch';

const POSInterface = () => {
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [orderType, setOrderType] = useState('dine-in');
  const [tableNumber, setTableNumber] = useState('');
  const [vatEnabled, setVatEnabled] = useState(false);
  const [settings, setSettings] = useState(null);
  const { socket } = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, customersData, settingsData] = await Promise.all([
          realApi.getUsers(),
          realApi.getCustomers(),
          realApi.getSettings()
        ]);
        setUsers(realApi.extractData(usersData) || []);
        setCustomers(realApi.extractData(customersData) || []);
        setSettings(realApi.extractData(settingsData) || null);
      } catch (error) {
        console.error("Failed to fetch POS data:", error);
      }
    };
    fetchData();
  }, []);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product._id === product._id);
      if (existing) {
        return prev.map(item =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, price: product.price }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product._id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product._id === productId ? { ...item, quantity } : item
      )
    );
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = vatEnabled ? subtotal * 0.05 : 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const placeOrder = async () => {
    try {
      const orderData = {
        items: cart,
        orderType,
        tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
        customer: customer?._id,
        ...calculateTotals()
      };

      const order = await orderAPI.createOrder(orderData);

      // Emit real-time update to kitchen
      socket.emit('new-order', order);

      // Clear cart and show success
      setCart([]);
      setCustomer(null);
      setTableNumber('');

      // Print receipt
      printReceipt(order);

    } catch (error) {
      console.error('Failed to place order:', error);
    }
  };

  const printReceipt = (order) => {
    // Create a hidden iframe for printing if it doesn't exist
    let iframe = document.getElementById('receipt-frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'receipt-frame';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;

    // Calculate totals if missing
    const subtotal = order.subtotal || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = order.tax || 0;
    const total = order.finalTotal || order.total || (subtotal + tax);

    // Get logo from settings or branch
    const logoUrl = settings?.logoUrl || order.branch?.logo;
    const businessName = settings?.restaurantName || order.branch?.name || 'HUDI SOFT POS';
    const address = settings?.address || order.branch?.address || '';
    const phone = settings?.phone || order.branch?.phone || '';

    // Mobile Payment Accounts
    const paymentInfo = [];
    if (settings?.zaad) paymentInfo.push(`Zaad: ${settings.zaad}`);
    if (settings?.sahal) paymentInfo.push(`Sahal: ${settings.sahal}`);
    if (settings?.edahab) paymentInfo.push(`eDahab: ${settings.edahab}`);
    if (settings?.myCash) paymentInfo.push(`MyCash: ${settings.myCash}`);

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              font-size: 11px; 
              width: 72mm; 
              margin: 0; 
              padding: 5mm; 
              color: #1a1a1a;
            }
            .header { text-align: center; margin-bottom: 12px; }
            .logo { max-width: 50mm; max-height: 20mm; margin-bottom: 8px; object-fit: contain; }
            .business-name { font-size: 16px; font-weight: 700; margin-bottom: 2px; text-transform: uppercase; }
            .contact-info { font-size: 10px; color: #666; margin-bottom: 4px; }
            
            .order-meta { 
              display: flex; 
              justify-content: space-between; 
              font-size: 9px; 
              color: #444; 
              margin: 8px 0;
              padding: 4px 0;
              border-top: 1px solid #eee;
              border-bottom: 1px solid #eee;
            }
            
            .divider { border-top: 1px dashed #ccc; margin: 8px 0; }
            
            .items-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            .items-table th { text-align: left; font-size: 9px; text-transform: uppercase; color: #888; border-bottom: 1px solid #eee; padding-bottom: 4px; }
            .items-table td { padding: 4px 0; vertical-align: top; }
            .item-name { font-weight: 600; }
            .item-details { font-size: 9px; color: #666; }
            .item-price { text-align: right; font-family: monospace; }
            
            .totals-section { margin-top: 8px; border-top: 2px solid #333; padding-top: 6px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .grand-total { font-size: 14px; font-weight: 700; margin-top: 6px; border-top: 1px solid #eee; padding-top: 6px; }
            
            .payment-methods { 
              margin-top: 15px; 
              padding: 8px; 
              background: #f9f9f9; 
              border-radius: 4px;
              text-align: center;
            }
            .payment-title { font-size: 9px; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; color: #555; }
            .payment-item { font-size: 10px; font-weight: 600; margin-bottom: 2px; color: #222; }
            
            .footer { text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
            .footer-text { font-size: 9px; color: #888; font-style: italic; }
            
            @media print {
              @page { margin: 0; size: auto; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
            <div class="business-name">${businessName}</div>
            <div class="contact-info">${address}</div>
            <div class="contact-info">Tel: ${phone}</div>
          </div>

          ${paymentInfo.length > 0 ? `
          <div class="payment-methods" style="margin-top: 5px; margin-bottom: 10px; border: 1px solid #eee; background: #fff; padding: 5px; border-radius: 4px;">
            <div class="payment-title" style="font-size: 8px; font-weight: bold; text-align: center; margin-bottom: 3px;">PAYMENT ACCOUNTS</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px;">
              ${paymentInfo.map(info => `<div class="payment-item" style="font-size: 9px; margin: 0; font-weight: 600;">${info}</div>`).join('')}
            </div>
          </div>
          ` : ''}
          
          <div class="order-meta">
            <span>Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>Ref: #${order.orderNumber}</span>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th width="70%">Description</th>
                <th width="30%" style="text-align: right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>
                    <div class="item-name">${item.product_name || item.productName || item.product?.name || item.itemName || 'Item'}</div>
                    <div class="item-details">${item.quantity} x $${item.price.toFixed(2)}</div>
                  </td>
                  <td class="item-price">$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            ${tax > 0 ? `
            <div class="total-row">
              <span>Tax:</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <div class="footer-text">${settings?.receiptFooter || 'Thank you for your business!'}</div>
            <div style="font-size: 8px; color: #bbb; margin-top: 8px;">Powered by HUDI-SOFT</div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Print after content is loaded
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 500);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Product Grid */}
      <div className="flex-1 p-4">
        <ProductGrid onAddToCart={addToCart} />
      </div>

      {/* Order Cart */}
      <div className="w-96 bg-white shadow-lg">
        <OrderCart
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          totals={calculateTotals()}
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          tableNumber={tableNumber}
          onTableNumberChange={setTableNumber}
          customer={customer}
          onPlaceOrder={placeOrder}
          vatEnabled={vatEnabled}
          setVatEnabled={setVatEnabled}
          onClearCart={() => setCart([])}
          users={users}
          customers={customers}
          onCustomerChange={setCustomer}
          settings={settings}
        />
        <CustomerSearch onCustomerSelect={setCustomer} />
      </div>
    </div>
  );
};

export default POSInterface;