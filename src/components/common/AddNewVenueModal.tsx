import React, { useState, useEffect } from 'react';
import { MapPin, Plus, X, Building, Phone, User, DollarSign, Navigation } from 'lucide-react';
import { api } from '../../api/client';
import { DeliveryLocation } from '../../types';

interface AddNewVenueModalProps {
  isOpen: boolean;
  initialVenueName?: string;
  onClose: () => void;
  onSuccess: (newLoc: DeliveryLocation) => void;
}

export const AddNewVenueModal: React.FC<AddNewVenueModalProps> = ({
  isOpen,
  initialVenueName = '',
  onClose,
  onSuccess
}) => {
  const [venueName, setVenueName] = useState(initialVenueName);
  const [areaLandmark, setAreaLandmark] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [customerCharge, setCustomerCharge] = useState<number | ''>(150);
  const [driverRent, setDriverRent] = useState<number | ''>(120);
  const [googleMapLink, setGoogleMapLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setVenueName(initialVenueName);
      setAreaLandmark('');
      setAddress('');
      setContactPerson('');
      setContactMobile('');
      setCustomerCharge(150);
      setDriverRent(120);
      setGoogleMapLink('');
      setError('');
    }
  }, [isOpen, initialVenueName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueName.trim()) {
      setError('Please provide Venue / Party Plot Name');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        venue_name: venueName.trim(),
        area_landmark: areaLandmark.trim(),
        address: address.trim() || `${venueName.trim()}${areaLandmark.trim() ? ', ' + areaLandmark.trim() : ''}, Surat`,
        contact_person: contactPerson.trim(),
        contact_mobile: contactMobile.trim(),
        customer_charge: Number(customerCharge) || 0,
        driver_rent: Number(driverRent) || 0,
        google_map_link: googleMapLink.trim()
      };

      const created = await api.createDeliveryLocation(payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add new delivery venue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        border: '1.5px solid #3b82f6'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
          color: '#ffffff',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '6px' }}>
              <Building size={18} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>
                ➕ Add New Delivery Venue / Party Plot
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#93c5fd' }}>
                Auto-saves to Settings & Delivery Locations List
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Venue Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
              🏰 Venue / Party Plot Name *
            </label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', fontSize: '0.86rem', padding: '7px 10px', fontWeight: 700 }}
              placeholder="e.g. Someshwara Community Hall, Swaminarayan Party Plot..."
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Area / Landmark & Contact */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                📍 Area / Zone (Surat)
              </label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', fontSize: '0.84rem', padding: '6px 10px' }}
                placeholder="e.g. Vesu, Katargam, Sarthana, Varachha..."
                value={areaLandmark}
                onChange={(e) => setAreaLandmark(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                📞 Contact Person / Mobile
              </label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', fontSize: '0.84rem', padding: '6px 10px' }}
                placeholder="e.g. Manager 98251xxxxx"
                value={contactMobile}
                onChange={(e) => setContactMobile(e.target.value)}
              />
            </div>
          </div>

          {/* Full Address */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
              🗺️ Full Street Address
            </label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', fontSize: '0.84rem', padding: '6px 10px' }}
              placeholder="e.g. Near University Circle, VIP Road, Surat"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Rates */}
          <div style={{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#15803d', marginBottom: '3px' }}>
                💰 Customer Delivery Fee (₹)
              </label>
              <input
                type="number"
                className="form-input"
                style={{ width: '100%', fontSize: '0.86rem', padding: '6px 8px', fontWeight: 800, color: '#15803d' }}
                value={customerCharge}
                onChange={(e) => setCustomerCharge(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="150"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#b91c1c', marginBottom: '3px' }}>
                🛺 Driver Rickshaw Rent (₹)
              </label>
              <input
                type="number"
                className="form-input"
                style={{ width: '100%', fontSize: '0.86rem', padding: '6px 8px', fontWeight: 800, color: '#b91c1c' }}
                value={driverRent}
                onChange={(e) => setDriverRent(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="120"
              />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '8px 20px',
                fontSize: '0.84rem',
                fontWeight: 800,
                background: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              disabled={loading}
            >
              {loading ? 'Saving Venue...' : '💾 Save Venue & Select'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
