import React, { useEffect, useState } from 'react';
import API, { ASSET_URL } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ExternalLink, Eye } from 'lucide-react';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [selectedImg, setSelectedImg] = useState(null);

    const fetchOrders = async () => {
        try {
            const { data } = await API.get('/admin/orders');
            setOrders(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleVerify = async (id) => {
        if (!window.confirm('Are you sure you want to verify this payment and generate a license?')) return;
        try {
            await API.put(`/admin/orders/${id}/verify`, {});
            fetchOrders();
        } catch (err) {
            alert(err.response?.data?.message || 'Verification failed');
        }
    };

    return (
        <div className="p-8 space-y-8 font-normal">
            <div>
                <h1 className="text-3xl font-black text-white">Payment Verification</h1>
                <p className="text-slate-400 mt-1">Review and approve manual Somali payment transactions</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-widest font-bold border-b border-slate-700">
                                <th className="px-6 py-4">Company / Email</th>
                                <th className="px-6 py-4">Product / Plan</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4 text-center">Receipt</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {orders.map((order) => (
                                <tr key={order._id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-white font-bold">{order.companyName}</p>
                                        <p className="text-slate-500 text-sm italic">{order.userId?.email || 'N/A'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-white bg-blue-500/10 px-2 py-1 rounded-md text-xs font-bold mr-2">{order.productType}</span>
                                        <span className="text-slate-400 text-sm">{order.subscriptionType === 'FiveYear' ? '5-Year' : 'Monthly'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300 font-medium">{order.paymentMethod}</td>
                                    <td className="px-6 py-4 text-green-400 font-black">${order.price}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => setSelectedImg(`${ASSET_URL}${order.paymentScreenshotUrl}`)}
                                            className="text-blue-400 hover:text-blue-300 transition p-2 bg-blue-400/10 rounded-xl"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${order.status === 'Verified' ? 'bg-green-500/20 text-green-500' :
                                                order.status === 'Pending' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {order.status === 'Pending' && (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleVerify(order._id)}
                                                    className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-xl transition shadow-lg shadow-green-600/20"
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button className="bg-red-600/10 hover:bg-red-600/20 text-red-500 p-2 rounded-xl transition">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {orders.length === 0 && <div className="p-10 text-center text-slate-500">No orders found.</div>}
                </div>
            </div>

            {/* Image Modal */}
            <AnimatePresence>
                {selectedImg && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedImg(null)}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
                    >
                        <motion.img
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            src={selectedImg}
                            className="max-w-full max-h-full rounded-2xl shadow-2xl border border-white/10"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminOrders;
