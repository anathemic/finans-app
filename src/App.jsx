import { useState, useEffect } from "react";

const CATEGORIES = {
  gelir: ["Maaş", "Freelance", "Kira Geliri", "Yatırım", "Diğer Gelir"],
  gider: ["Kira", "Market", "Fatura", "Ulaşım", "Sağlık", "Eğlence", "Restoran", "Diğer Gider"],
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(amount);
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const DAY_NAMES = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

export default function App() {
  const today = new Date();
  const [view, setView] = useState("takvim"); // takvim | liste | ekle | kategoriler
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem("finans_transactions");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("finans_categories");
      return saved ? JSON.parse(saved) : { gelir: [], gider: [] };
    } catch { return { gelir: [], gider: [] }; }
  });
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({ type: "gider", amount: "", category: CATEGORIES.gider[0], note: "", date: today.toISOString().split("T")[0] });
  const [editId, setEditId] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("gider");

  useEffect(() => {
    try { localStorage.setItem("finans_transactions", JSON.stringify(transactions)); } catch {}
  }, [transactions]);

  useEffect(() => {
    try { localStorage.setItem("finans_categories", JSON.stringify(customCategories)); } catch {}
  }, [customCategories]);

  // Get merged categories (default + custom)
  const getMergedCategories = (type) => {
    return [...CATEGORIES[type], ...customCategories[type]];
  };

  // Net varlık hesapla (belirli bir tarihe kadar kümülatif)
  function getNetUntil(dateStr) {
    return transactions
      .filter(t => t.date <= dateStr)
      .reduce((sum, t) => sum + (t.type === "gelir" ? t.amount : -t.amount), 0);
  }

  function getDayTotal(dateStr) {
    const dayTx = transactions.filter(t => t.date === dateStr);
    const gelir = dayTx.filter(t => t.type === "gelir").reduce((s, t) => s + t.amount, 0);
    const gider = dayTx.filter(t => t.type === "gider").reduce((s, t) => s + t.amount, 0);
    return { gelir, gider, net: gelir - gider, count: dayTx.length };
  }

  function handleSave() {
    const amountNumber = Number(form.amount.replace(/\./g, ""));
    if (!amountNumber || isNaN(amountNumber) || amountNumber <= 0) return;
    const tx = { id: editId || Date.now(), type: form.type, amount: amountNumber, category: form.category, note: form.note, date: form.date };
    if (editId) {
      setTransactions(prev => prev.map(t => t.id === editId ? tx : t));
      setEditId(null);
    } else {
      setTransactions(prev => [...prev, tx]);
    }
    setForm({ type: "gider", amount: "", category: CATEGORIES.gider[0], note: "", date: today.toISOString().split("T")[0] });
    setView("takvim");
  }

  function handleDelete(id) {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }

  function handleEdit(tx) {
    setForm({ type: tx.type, amount: tx.amount.toLocaleString("tr-TR").replaceAll(",", "."), category: tx.category, note: tx.note, date: tx.date });
    setEditId(tx.id);
    setView("ekle");
  }

  function handleAddCategory() {
    if (!newCategory.trim()) return;
    if (getMergedCategories(newCategoryType).includes(newCategory)) {
      alert("Bu kategori zaten var");
      return;
    }
    setCustomCategories(prev => ({
      ...prev,
      [newCategoryType]: [...prev[newCategoryType], newCategory]
    }));
    setNewCategory("");
  }

  function handleDeleteCategory(type, category) {
    setCustomCategories(prev => ({
      ...prev,
      [type]: prev[type].filter(c => c !== category)
    }));
  }

  // Reset - Delete all transactions
  function handleFullReset() {
    if (window.confirm("Tüm işlemler silinecek ve sıfırlanacak. Emin misiniz?")) {
      setTransactions([]);
      localStorage.removeItem("finans_transactions");
    }
  }

  // Takvim render
  function renderCalendar() { /* ... unchanged ... */ return null }

  // İşlem listesi
  function renderListe() {
    const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    const totalGelir = transactions.filter(t => t.type === "gelir").reduce((s, t) => s + t.amount, 0);
    const totalGider = transactions.filter(t => t.type === "gider").reduce((s, t) => s + t.amount, 0);
    const net = totalGelir - totalGider;
    return (
      <div style={{ padding: "0 0 100px 0" }}>
        <div style={{ background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)", padding: "28px 20px 20px", color: "#fff" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Tüm İşlemler</div>
          <div style={{ textAlign: "right", margin: "10px 0 4px 0" }}>
            <button
              onClick={handleFullReset}
              style={{ background: "#ef4444", color: "#fff", padding: "7px 18px", fontWeight: 600, border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 2px 9px 0 rgba(239,68,68,0.09)", fontSize: 14 }}>
              Tümünü Sil / Resetle
            </button>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, background: "rgba(74,222,128,0.15)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(74,222,128,0.2)" }}>
              <div style={{ fontSize: 11, color: "#4ade80", marginBottom: 2 }}>TOPLAM GELİR</div>
              <div style={{ fontWeight: 700, color: "#4ade80" }}>{formatCurrency(totalGelir)}</div>
            </div>
            <div style={{ flex: 1, background: "rgba(248,113,113,0.15)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(248,113,113,0.2)" }}>
              <div style={{ fontSize: 11, color: "#f87171", marginBottom: 2 }}>TOPLAM GİDER</div>
              <div style={{ fontWeight: 700, color: "#f87171" }}>{formatCurrency(totalGider)}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Net Varlık: </span>
            <span style={{ fontWeight: 700, fontSize: 18, color: net >= 0 ? "#4ade80" : "#f87171" }}>{formatCurrency(net)}</span>
          </div>
        </div>

        <div style={{ padding: "12px" }}>
          {sorted.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b", padding: "40px 0", fontSize: 15 }}>Henüz işlem yok</div>
          ) : sorted.map(tx => (
            <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "14px 16px", marginBottom: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: tx.type === "gelir" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {tx.type === "gelir" ? "💰" : "💸"}
                </div>
                <div>
                  <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>{tx.category}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{tx.date.split("-").reverse().join(".")} {tx.note && `· ${tx.note}`}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: tx.type === "gelir" ? "#4ade80" : "#f87171", fontWeight: 700, fontSize: 15 }}>{tx.type === "gelir" ? "+" : "-"}{formatCurrency(tx.amount)}</span>
                <button onClick={() => handleEdit(tx)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>✏️</button>
                <button onClick={() => handleDelete(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Ekleme formu
  function renderEkle() {
    return (
      <div style={{ padding: "0 0 100px 0" }}>
        <div style={{ background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)", padding: "28px 20px 20px" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#fff" }}>{editId ? "İşlemi Düzenle" : "Yeni İşlem Ekle"}</div>
        </div>

        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Tip seçimi */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 4, gap: 4 }}>
            {["gider", "gelir"].map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t, category: getMergedCategories(t)[0] }))}
                style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 15, transition: "all 0.2s",
                  background: form.type === t ? (t === "gelir" ? "#4ade80" : "#f87171") : "transparent",
                  color: form.type === t ? "#0f2027" : "#64748b" }}>
                {t === "gelir" ? "💰 Gelir" : "💸 Gider"}
              </button>
            ))}
          </div>

          {/* Tutar */}
          <div>
            <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Tutar (₺)</label>
            <input
              type="text"
              value={form.amount}
              inputMode="numeric"
              onChange={e => {
                // Remove non-digits, format with dot grouping
                const raw = e.target.value.replace(/\D/g, "");
                setForm(f => ({
                  ...f,
                  amount: raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
                }));
              }}
              placeholder="0"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                padding: "14px 16px",
                color: "#fff",
                fontSize: 22,
                fontWeight: 700,
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Kategori */}
          <div>
            <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Kategori</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              style={{ width: "100%", background: "#1e2d3d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 16px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }}>
              {getMergedCategories(form.type).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Tarih */}
          <div>
            <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Tarih</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 16px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
            {form.date > today.toISOString().split("T")[0] && (
              <div style={{ marginTop: 6, color: "#63b3ed", fontSize: 12 }}>📅 İleri tarihli işlem</div>
            )}
          </div>

          {/* Not */}
          <div>
            <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Not (opsiyonel)</label>
            <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Açıklama ekle..."
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 16px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Kaydet */}
          <button onClick={handleSave}
            style={{ padding: "16px", borderRadius: 14, border: "none", background: form.type === "gelir" ? "linear-gradient(135deg, #4ade80, #22c55e)" : "linear-gradient(135deg, #f87171, #ef4444)", color: "#fff", fontWeight: 700, fontSize: 17, cursor: "pointer", marginTop: 8 }}>
            {editId ? "Güncelle" : "Kaydet"}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setForm({ type: "gider", amount: "", category: CATEGORIES.gider[0], note: "", date: today.toISOString().split("T")[0] }); setView("takvim"); }}
              style={{ padding: "14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
              İptal
            </button>
          )}
        </div>
      </div>
    );
  }

  // Kategoriler yönetimi ve renderCalendar() ... değişmedi
  // ... Eski kodun geri kalanı değişmeden kalabilir ...

  return (
    <div style={{ background: "#0d1b2a", minHeight: "100vh", maxWidth: 430, margin: "0 auto", fontFamily: "'DM Sans', sans-serif", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {/* Content */}
      {view === "takvim" && renderCalendar()}
      {view === "liste" && renderListe()}
      {view === "ekle" && renderEkle()}
      {view === "kategoriler" && renderKategoriler()}
      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(13,27,42,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 0 16px", display: "flex", justifyContent: "space-around" }}>
        {[
          { id: "takvim", icon: "����", label: "Takvim" },
          { id: "ekle", icon: "➕", label: "Ekle", action: () => { setEditId(null); setForm({ type: "gider", amount: "", category: CATEGORIES.gider[0], note: "", date: today.toISOString().split("T")[0] }); setView("ekle"); } },
          { id: "liste", icon: "📋", label: "İşlemler" },
          { id: "kategoriler", icon: "🏷️", label: "Kategoriler" },
        ].map(nav => (
          <button key={nav.id} onClick={nav.action || (() => setView(nav.id))}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: "4px 20px" }}>
            <span style={{ fontSize: nav.id === "ekle" ? 28 : 22, opacity: view === nav.id ? 1 : 0.4 }}>{nav.icon}</span>
            <span style={{ fontSize: 11, color: view === nav.id ? "#63b3ed" : "#64748b", fontWeight: view === nav.id ? 700 : 400 }}>{nav.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
