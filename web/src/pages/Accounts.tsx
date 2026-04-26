import React, { useState, useEffect } from 'react';
import './Accounts.css';

interface Account {
  _id: string;
  type: string;
  accountName: string;
  balance: number;
  currency: string;
}

interface AccountTypeInfo {
  type: string;
  description: string;
}

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountTypeInfo[]>([]);
  const [selectedType, setSelectedType] = useState<string>('RRSP');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    accountName: '',
    businessName: '',
    beneficiaryName: '',
    exchange: '',
    provinceOfIssuance: 'ON',
  });
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/account-types/all', {
        credentials: 'include',
      });
      const data = await response.json();
      setAccounts(data.accounts || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setLoading(false);
    }
  };

  const fetchAccountTypes = async () => {
    try {
      const response = await fetch('/api/account-types/info/account-types', {
        credentials: 'include',
      });
      const data = await response.json();
      setAccountTypes(data);
    } catch (err) {
      console.error('Error fetching account types:', err);
    }
  };

  useEffect(() => {
    // Fetching data on mount - this is the recommended pattern for effects
    // The setState calls happen inside async callbacks, so they don't trigger cascading renders
    void fetchAccounts();
    void fetchAccountTypes();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = '/api/account-types';
      const payload: Record<string, unknown> = { accountName: formData.accountName };

      switch (selectedType) {
        case 'RRSP':
          endpoint += '/rrsp/create';
          break;
        case 'TFSA':
          endpoint += '/tfsa/create';
          break;
        case 'FHSA':
          endpoint += '/fhsa/create';
          break;
        case 'RESP':
          endpoint += '/resp/create';
          payload.beneficiaryName = formData.beneficiaryName;
          payload.beneficiaryBirthDate = new Date().toISOString();
          payload.beneficiarySIN = '000-000-000';
          break;
        case 'LIF':
          endpoint += '/lif/create';
          payload.ownerAge = 55;
          payload.provinceOfIssuance = formData.provinceOfIssuance;
          break;
        case 'RRIF':
          endpoint += '/rrif/create';
          payload.ownerAge = 55;
          break;
        case 'LIRA':
          endpoint += '/lira/create';
          payload.provinceOfIssuance = formData.provinceOfIssuance;
          break;
        case 'RDSP':
          endpoint += '/rdsp/create';
          payload.beneficiaryName = formData.beneficiaryName;
          payload.beneficiaryBirthDate = new Date().toISOString();
          payload.beneficiarySIN = '000-000-000';
          payload.designatedResponsible = formData.beneficiaryName;
          break;
        case 'NON_REGISTERED':
          endpoint += '/non-registered/create';
          break;
        case 'CRYPTO':
          endpoint += '/crypto/create';
          payload.exchange = formData.exchange;
          break;
        case 'CORPORATE':
          endpoint += '/corporate/create';
          payload.businessName = formData.businessName;
          payload.businessType = 'sole-proprietor';
          payload.fiscalYearEnd = '12-31';
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setFormData({
          accountName: '',
          businessName: '',
          beneficiaryName: '',
          exchange: '',
          provinceOfIssuance: 'ON',
        });
        setShowCreateForm(false);
        fetchAccounts();
      }
    } catch (err) {
      console.error('Error creating account:', err);
    }
  };

  const filteredAccounts = accounts.filter(a => a.type === selectedType);
  const selectedTypeInfo = accountTypes.find(t => t.type === selectedType);

  if (loading) {
    return <div className="accounts-container">Loading accounts...</div>;
  }

  return (
    <div className="accounts-container">
      <h1>Canadian Account Types</h1>
      
      <div className="accounts-layout">
        <aside className="accounts-sidebar">
          <h3>Account Types</h3>
          <nav className="account-type-nav">
            {accountTypes.map(type => (
              <button
                key={type.type}
                className={`account-type-btn ${selectedType === type.type ? 'active' : ''}`}
                onClick={() => setSelectedType(type.type)}
              >
                <span className="type-name">{type.type.replace(/_/g, ' ')}</span>
                <span className="type-count">
                  {accounts.filter(a => a.type === type.type).length}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="accounts-main">
          <div className="account-header">
            <div>
              <h2>{selectedType.replace(/_/g, ' ')}</h2>
              {selectedTypeInfo && <p className="description">{selectedTypeInfo.description}</p>}
            </div>
            <button
              className="btn-primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : '+ New Account'}
            </button>
          </div>

          {showCreateForm && (
            <form className="create-form" onSubmit={handleCreateAccount}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Account Name</label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) =>
                      setFormData({ ...formData, accountName: e.target.value })
                    }
                    required
                  />
                </div>

                {selectedType === 'RESP' && (
                  <div className="form-group">
                    <label>Beneficiary Name</label>
                    <input
                      type="text"
                      value={formData.beneficiaryName}
                      onChange={(e) =>
                        setFormData({ ...formData, beneficiaryName: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                {selectedType === 'RDSP' && (
                  <div className="form-group">
                    <label>Beneficiary Name (Disabled Person)</label>
                    <input
                      type="text"
                      value={formData.beneficiaryName}
                      onChange={(e) =>
                        setFormData({ ...formData, beneficiaryName: e.target.value })
                      }
                      required
                      placeholder="Name of person with disability"
                    />
                  </div>
                )}

                {selectedType === 'CORPORATE' && (
                  <div className="form-group">
                    <label>Business Name</label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) =>
                        setFormData({ ...formData, businessName: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                {selectedType === 'CRYPTO' && (
                  <div className="form-group">
                    <label>Exchange</label>
                    <input
                      type="text"
                      placeholder="e.g., Kraken, Binance, Newton"
                      value={formData.exchange}
                      onChange={(e) =>
                        setFormData({ ...formData, exchange: e.target.value })
                      }
                    />
                  </div>
                )}

                {(selectedType === 'LIF' || selectedType === 'LIRA') && (
                  <div className="form-group">
                    <label>Province of Issuance</label>
                    <select
                      value={formData.provinceOfIssuance}
                      onChange={(e) =>
                        setFormData({ ...formData, provinceOfIssuance: e.target.value })
                      }
                    >
                      <option value="BC">British Columbia</option>
                      <option value="AB">Alberta</option>
                      <option value="SK">Saskatchewan</option>
                      <option value="MB">Manitoba</option>
                      <option value="ON">Ontario</option>
                      <option value="QC">Quebec</option>
                      <option value="NB">New Brunswick</option>
                      <option value="NS">Nova Scotia</option>
                      <option value="PE">Prince Edward Island</option>
                      <option value="NL">Newfoundland and Labrador</option>
                    </select>
                  </div>
                )}
              </div>
              <button type="submit" className="btn-primary">Create Account</button>
            </form>
          )}

          <div className="accounts-list">
            <h3>Your {selectedType.replace(/_/g, ' ')} Accounts</h3>
            {filteredAccounts.length === 0 ? (
              <p className="empty-state">
                No {selectedType.replace(/_/g, ' ')} accounts yet. Create one to get started.
              </p>
            ) : (
              <div className="account-cards">
                {filteredAccounts.map(account => (
                  <div key={account._id} className="account-card">
                    <h4>{account.accountName}</h4>
                    <p className="balance">
                      ${account.balance.toFixed(2)} {account.currency}
                    </p>
                    <p className="type-badge">{account.type}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="account-stats">
            <div className="stat-box">
              <h4>Total Accounts</h4>
              <p className="stat-value">{accounts.length}</p>
            </div>
            <div className="stat-box">
              <h4>Total Balance</h4>
              <p className="stat-value">
                ${accounts.reduce((sum, a) => sum + a.balance, 0).toFixed(2)}
              </p>
            </div>
            <div className="stat-box">
              <h4>This Type</h4>
              <p className="stat-value">{filteredAccounts.length}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Accounts;
