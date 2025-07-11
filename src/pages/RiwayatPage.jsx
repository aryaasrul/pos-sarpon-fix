import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast'; // Impor library notifikasi
import { supabase } from '../supabaseClient'; // Impor Supabase client
import ExpenseFormModal from '../components/ExpenseFormModal';
import '../Riwayat.css';

// Komponen DateAccordion tidak perlu diubah
function DateAccordion({ date, items, type, balance }) {
  const [isOpen, setIsOpen] = useState(true);

  const dailyTotal = items.reduce((sum, item) => sum + (type === 'income' ? item.price * item.quantity : item.amount), 0);
  const dailyProfit = type === 'income' 
    ? items.reduce((sum, item) => sum + ((item.price - (item.hpp || 0)) * item.quantity), 0)
    : 0;

  const renderSummary = () => {
    if (type === 'income') {
      return (
        <>
          <div className="summary-row">
            <span>Total Transaksi</span>
            <span className="amount income">+ Rp {dailyTotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="summary-row">
            <span>Total Laba</span>
            <span className="amount income">+ Rp {dailyProfit.toLocaleString('id-ID')}</span>
          </div>
        </>
      );
    }
    return (
      <>
        <div className="summary-row">
          <span>Total Pengeluaran</span>
          <span className="amount expense">- Rp {dailyTotal.toLocaleString('id-ID')}</span>
        </div>
        <div className="summary-row">
          <span>Sisa Saldo</span>
          <span>Rp {balance.toLocaleString('id-ID')}</span>
        </div>
      </>
    );
  };
  
  const renderItems = () => {
    if (type === 'income') {
      const groupedItems = items.reduce((acc, item) => {
        if (!acc[item.name]) {
          acc[item.name] = { ...item, quantity: 0, total: 0 };
        }
        acc[item.name].quantity += item.quantity;
        acc[item.name].total += item.price * item.quantity;
        return acc;
      }, {});
      
      return Object.values(groupedItems).map(item => (
        <div key={`${item.id}-${item.name}`} className="transaction-item">
          <span>{item.quantity}x {item.name}</span>
          <span className="amount income">+ Rp {item.total.toLocaleString('id-ID')}</span>
        </div>
      ));
    }
    return items.map(item => (
      <div key={item.id} className="transaction-item">
        <span>{item.name}</span>
        <span className="amount expense">- Rp {item.amount.toLocaleString('id-ID')}</span>
      </div>
    ));
  };

  return (
    <div className="date-group-accordion">
      <button className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
        <h3>{date}</h3>
        <img src={isOpen ? "/icons/Arrow-Up-2.svg" : "/icons/Arrow-Down-2.svg"} alt="toggle" />
      </button>
      {isOpen && (
        <div className="accordion-body">
          <div className="summary-section">{renderSummary()}</div>
          <div className="item-details-section">{renderItems()}</div>
        </div>
      )}
    </div>
  );
}


function RiwayatPage() {
  const [activeTab, setActiveTab] = useState('pemasukan');
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalIncome = orders.reduce((sum, order) => sum + (order.price * order.quantity), 0);
  const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const currentBalance = totalIncome - totalExpense;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, expensesRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').order('created_at', { ascending: false })
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (expensesRes.error) throw expensesRes.error;

      setOrders(ordersRes.data);
      setExpenses(expensesRes.data);

    } catch (error) {
      console.error("Gagal mengambil data riwayat:", error);
      toast.error("Gagal mengambil data riwayat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveExpense = async (formData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sesi tidak valid, silakan login ulang.");
        return;
      }

      const dataToSave = {
          ...formData,
          group_id: 'exp_' + Date.now(),
          user_id: user.id
      }
  
      const { error } = await supabase.from('expenses').insert([dataToSave]);
  
      if (error) throw error;

      toast.success('Pengeluaran berhasil disimpan.');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Gagal menyimpan pengeluaran:", error);
      toast.error("Gagal menyimpan pengeluaran: " + error.message);
    }
  };

  const groupDataByDate = (data) => {
    return data.reduce((acc, item) => {
      const date = new Date(item.created_at).toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});
  };

  const groupedOrders = groupDataByDate(orders);
  const groupedExpenses = groupDataByDate(expenses);

  if (loading) return <div>Memuat data riwayat...</div>;

  return (
    <div className="riwayat-page">
      <div className="riwayat-header">
        <div className="tab-container">
          <button className={`tab-btn ${activeTab === 'pemasukan' ? 'active' : ''}`} onClick={() => setActiveTab('pemasukan')}>
            Pemasukan
          </button>
          <button className={`tab-btn ${activeTab === 'pengeluaran' ? 'active' : ''}`} onClick={() => setActiveTab('pengeluaran')}>
            Pengeluaran
          </button>
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'pemasukan' 
          ? Object.entries(groupedOrders).map(([date, items]) => <DateAccordion key={date} date={date} items={items} type="income" />)
          : Object.entries(groupedExpenses).map(([date, items]) => <DateAccordion key={date} date={date} items={items} type="expense" balance={currentBalance} />)
        }
      </div>

      {activeTab === 'pengeluaran' && (
        <button className="btn-add-expense-fab" onClick={() => setIsModalOpen(true)}>
          <img src="/icons/Plus-square.svg" alt="Tambah Pengeluaran"/>
        </button>
      )}

      <ExpenseFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveExpense}
      />
    </div>
  );
}

export default RiwayatPage;