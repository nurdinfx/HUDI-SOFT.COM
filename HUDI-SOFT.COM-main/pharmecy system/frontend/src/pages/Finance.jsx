import { useEffect } from 'react';
import useFinanceStore from '../store/financeStore';
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const Finance = () => {
  const { summary, fetchSummary, isLoading } = useFinanceStore();

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (isLoading || !summary) {
    return <div className="p-8">Loading financial data...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-bold">Financial Overview</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales */}
        <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-500">Total Sales</h3>
            <div className="p-2 text-blue-600 bg-blue-100 rounded-full">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-bold text-gray-800">
            ${summary.totalSales.toFixed(2)}
          </div>
          <p className="mt-1 text-sm text-gray-500">{summary.salesCount} transactions</p>
        </div>

        {/* Total Expenses */}
        <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-500">Total Expenses</h3>
            <div className="p-2 text-red-600 bg-red-100 rounded-full">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-bold text-gray-800">
            ${summary.totalExpenses.toFixed(2)}
          </div>
          <p className="mt-1 text-sm text-gray-500">{summary.expensesCount} records</p>
        </div>

        {/* Net Profit */}
        <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-500">Net Profit</h3>
            <div className="p-2 text-green-600 bg-green-100 rounded-full">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className={`mt-4 text-3xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${summary.netProfit.toFixed(2)}
          </div>
        </div>

        {/* Activity */}
        <div className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-500">Activity</h3>
            <div className="p-2 text-purple-600 bg-purple-100 rounded-full">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-lg font-medium text-gray-800">
            System Healthy
          </div>
          <p className="mt-1 text-sm text-gray-500">All services running</p>
        </div>
      </div>
    </div>
  );
};

export default Finance;
