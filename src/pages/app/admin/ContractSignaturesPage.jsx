import { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import Skeleton from '../../../components/ui/Skeleton';
import { supabase } from '../../../lib/supabase';
import {
  HiDocumentText,
  HiCheckCircle,
  HiExclamationTriangle,
  HiArrowPath,
  HiMagnifyingGlass,
  HiFunnel,
} from 'react-icons/hi2';

const P      = '#D4AF37';
const BORDER = '#E5E7EB';
const SURF   = '#F9FAFB';

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export default function ContractSignaturesPage() {
  const [directors, setDirectors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all'); // 'all' | 'signed' | 'unsigned'
  const [selected, setSelected]   = useState(null);

  const load = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, status, territory_contract_signed_at, territory_contract_entity_name, territory:territories(name)')
      .eq('role', 'director')
      .order('full_name');
    setDirectors(data || []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return directors.filter(d => {
      const matchSearch = !search ||
        d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.email?.toLowerCase().includes(search.toLowerCase()) ||
        d.territory_contract_entity_name?.toLowerCase().includes(search.toLowerCase());
      const isSigned = !!d.territory_contract_signed_at;
      const matchFilter =
        filter === 'all' ? true :
        filter === 'signed' ? isSigned :
        !isSigned;
      return matchSearch && matchFilter;
    });
  }, [directors, search, filter]);

  const signedCount   = directors.filter(d => !!d.territory_contract_signed_at).length;
  const unsignedCount = directors.length - signedCount;

  return (
    <AppLayout role="admin">
      <div style={{ padding: 'clamp(16px, 4vw, 32px)', minHeight: '100vh', background: SURF }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract Signatures</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track which directors have signed the Territory Partner Agreement.</p>
          </div>
          <button onClick={load} title="Refresh"
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
            <HiArrowPath size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Directors', value: directors.length, color: '#6B7280', bg: '#F3F4F6' },
            { label: 'Signed',          value: signedCount,       color: '#059669', bg: '#D1FAE5' },
            { label: 'Not Signed',      value: unsignedCount,     color: '#D97706', bg: '#FEF3C7' },
          ].map(card => (
            <div key={card.label} style={{
              background: '#fff', border: `1px solid ${BORDER}`,
              borderRadius: 12, padding: '16px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                {card.label}
              </p>
              <p style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{isLoading ? '…' : card.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <HiMagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or entity…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {[
              { key: 'all',      label: 'All' },
              { key: 'signed',   label: 'Signed' },
              { key: 'unsigned', label: 'Not Signed' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                style={{
                  background: filter === opt.key ? P : 'transparent',
                  color: filter === opt.key ? '#111' : '#6B7280',
                }}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{
          background: '#fff', border: `1px solid ${BORDER}`,
          borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
        }}>
          {isLoading ? (
            <div className="p-6 flex flex-col gap-3">
              {[1,2,3,4].map(k => <Skeleton key={k} width="100%" height="52px" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <HiDocumentText size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No directors match your filter.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}`, background: SURF }}>
                      {['Director', 'Email', 'Territory', 'Status', 'Entity Name', 'Signed Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d, i) => {
                      const signed = !!d.territory_contract_signed_at;
                      return (
                        <tr
                          key={d.id}
                          onClick={() => setSelected(selected?.id === d.id ? null : d)}
                          style={{
                            borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
                            cursor: 'pointer',
                            background: selected?.id === d.id ? '#FFFBEB' : 'transparent',
                          }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900">{d.full_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{d.email || '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{d.territory?.name || '—'}</td>
                          <td className="px-4 py-3">
                            {signed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                                style={{ background: '#D1FAE5', color: '#065F46' }}>
                                <HiCheckCircle size={12} /> Signed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                                style={{ background: '#FEF3C7', color: '#92400E' }}>
                                <HiExclamationTriangle size={12} /> Not Signed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{d.territory_contract_entity_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(d.territory_contract_signed_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map(d => {
                  const signed = !!d.territory_contract_signed_at;
                  return (
                    <div key={d.id} className="p-4"
                      onClick={() => setSelected(selected?.id === d.id ? null : d)}>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className="font-semibold text-gray-900 text-sm">{d.full_name || '—'}</p>
                        {signed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0"
                            style={{ background: '#D1FAE5', color: '#065F46' }}>
                            <HiCheckCircle size={11} /> Signed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0"
                            style={{ background: '#FEF3C7', color: '#92400E' }}>
                            <HiExclamationTriangle size={11} /> Not Signed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{d.email}</p>
                      {signed && (
                        <p className="text-xs text-gray-400 mt-1">
                          Signed as <strong className="text-gray-600">{d.territory_contract_entity_name}</strong> · {fmtDate(d.territory_contract_signed_at)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{
            marginTop: 16, background: '#fff',
            border: `1px solid ${BORDER}`, borderRadius: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '20px 24px',
          }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <HiDocumentText size={16} color={P} />
                {selected.full_name}
              </h3>
              <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600">
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Email',        value: selected.email },
                { label: 'Territory',    value: selected.territory?.name || '—' },
                { label: 'Account Status', value: selected.status },
                { label: 'Contract Status', value: selected.territory_contract_signed_at ? 'Signed' : 'Not Signed' },
                { label: 'Entity Name',  value: selected.territory_contract_entity_name || '—' },
                { label: 'Signed At',    value: fmtDateTime(selected.territory_contract_signed_at) },
              ].map(item => (
                <div key={item.label}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{item.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
