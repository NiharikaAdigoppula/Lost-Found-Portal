import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LostFoundItem, StatusHistory } from '../types';
import { Check, History, Handshake, X, MessageSquare } from 'lucide-react';

function MyPosts() {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<Record<string, StatusHistory[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finderEmail, setFinderEmail] = useState('');
  const [isEmailSubmitted, setIsEmailSubmitted] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [showFounderClaimModal, setShowFounderClaimModal] = useState(false);
  const [selectedItemForClaim, setSelectedItemForClaim] = useState<string | null>(null);
  const [claimerDetails, setClaimerDetails] = useState({
    name: '',
    email: '',
    notes: ''
  });

  const fetchItems = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: supabaseError } = await supabase
        .from('lost_found_items')
        .select('*')
        .eq('finder_email', email)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;
      setItems(data || []);

      if (data && data.length > 0) {
        const { data: historyData, error: historyError } = await supabase
          .from('item_status_history')
          .select('*')
          .in('item_id', data.map(item => item.id))
          .order('changed_at', { ascending: false });

        if (historyError) throw historyError;

        const historyByItem = (historyData || []).reduce((acc, history) => {
          if (!acc[history.item_id]) {
            acc[history.item_id] = [];
          }
          acc[history.item_id].push(history);
          return acc;
        }, {} as Record<string, StatusHistory[]>);

        setStatusHistory(historyByItem);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEmailSubmitted && finderEmail) {
      const channel = supabase
        .channel('my_posts_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'lost_found_items',
            filter: `finder_email=eq.${finderEmail}`
          }, 
          () => {
            fetchItems(finderEmail);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isEmailSubmitted, finderEmail]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finderEmail) return;

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(finderEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsEmailSubmitted(true);
    fetchItems(finderEmail);
  };

  const handleStatusUpdate = async (itemId: string, newStatus: 'claimed' | 'found', claimerId?: string) => {
    if (submittingStatus) return;
    
    if (newStatus === 'claimed' && !confirm('Are you sure you want to mark this item as claimed? This action cannot be undone.')) {
      return;
    }

    setSubmittingStatus(true);
    try {
      const { data: item } = await supabase
        .from('lost_found_items')
        .select('status')
        .eq('id', itemId)
        .single();

      if (!item) throw new Error('Item not found');

      const { error: updateError } = await supabase
        .from('lost_found_items')
        .update({
          status: newStatus,
          ...(newStatus === 'claimed' ? {
            claimed_at: new Date().toISOString()
          } : {
            claimed_by: null,
            claimed_at: null
          })
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('item_status_history')
        .insert({
          item_id: itemId,
          old_status: item.status,
          new_status: newStatus,
          changed_by: finderEmail,
          notes: newStatus === 'claimed' 
            ? `Claim confirmed by finder for ${claimerId}`
            : 'Claim rejected by finder'
        });

      if (historyError) throw historyError;
      
      await fetchItems(finderEmail);
      alert(newStatus === 'claimed' ? 'Item has been marked as claimed successfully!' : 'Claim has been rejected.');
    } catch (err) {
      alert('Failed to update item status. Please try again.');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleFounderClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForClaim || submittingStatus) return;

    setSubmittingStatus(true);
    try {
      const { error: updateError } = await supabase
        .from('lost_found_items')
        .update({
          status: 'claimed',
          claimed_at: new Date().toISOString(),
          claimed_by: claimerDetails.email
        })
        .eq('id', selectedItemForClaim)
        .eq('status', 'found');

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('item_status_history')
        .insert({
          item_id: selectedItemForClaim,
          old_status: 'found',
          new_status: 'claimed',
          changed_by: finderEmail,
          notes: `Item claimed by original owner: ${claimerDetails.name} (${claimerDetails.email}). Notes: ${claimerDetails.notes}`
        });

      if (historyError) throw historyError;

      await fetchItems(finderEmail);
      setShowFounderClaimModal(false);
      setClaimerDetails({ name: '', email: '', notes: '' });
      alert('Item has been marked as claimed by the founder successfully!');
    } catch (err) {
      alert('Failed to update item status. Please try again.');
    } finally {
      setSubmittingStatus(false);
      setSelectedItemForClaim(null);
    }
  };

  if (!isEmailSubmitted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-gray-900 p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Access Your Posts</h2>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <p className="text-gray-300 mb-4">Enter your email to view and manage your posted items.</p>
              <input
                type="email"
                placeholder="Enter your email"
                value={finderEmail}
                onChange={(e) => {
                  setFinderEmail(e.target.value);
                  setError(null);
                }}
                className="w-full p-3 bg-gray-800 rounded text-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
              {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-yellow-400 text-black py-3 rounded font-semibold hover:bg-yellow-500 transition-colors"
            >
              View My Posts
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
        <p className="mt-4 text-gray-300">Loading your posts...</p>
      </div>
    );
  }

  const pendingClaims = items.filter(item => item.status === 'pending');
  const otherItems = items.filter(item => item.status !== 'pending');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">My Posted Items</h2>
        <button
          onClick={() => {
            setIsEmailSubmitted(false);
            setFinderEmail('');
            setItems([]);
            setError(null);
          }}
          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
        >
          Change Email
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-600 text-white rounded">
          {error}
        </div>
      )}

      {/* Claim Requests Section */}
      {pendingClaims.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="text-yellow-400" />
            <h3 className="text-2xl font-semibold text-yellow-400">
              Claim Requests ({pendingClaims.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingClaims.map((item) => (
              <div key={item.id} className="bg-gray-900 rounded-lg overflow-hidden shadow-lg border-2 border-yellow-400">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                  <p className="text-gray-300 mb-4">{item.description}</p>
                  <div className="bg-gray-800 p-4 rounded mb-4">
                    <h4 className="font-semibold mb-2 text-yellow-400">Claim Request Details</h4>
                    <p className="text-sm text-gray-300">From: {item.claimed_by}</p>
                    <p className="text-sm text-gray-300">
                      Requested: {new Date(item.claimed_at!).toLocaleDateString()}
                    </p>
                    {statusHistory[item.id]?.[0]?.notes && (
                      <p className="text-sm text-gray-300 mt-2">
                        Message: {statusHistory[item.id][0].notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusUpdate(item.id, 'claimed', item.claimed_by)}
                      disabled={submittingStatus}
                      className="flex-1 bg-green-500 text-white py-2 px-4 rounded font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Check size={18} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(item.id, 'found')}
                      disabled={submittingStatus}
                      className="flex-1 bg-red-500 text-white py-2 px-4 rounded font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <X size={18} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Items Section */}
      <div>
        <h3 className="text-2xl font-semibold mb-6">Other Items ({otherItems.length})</h3>
        {otherItems.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 rounded-lg shadow-lg">
            <p className="text-gray-400 text-lg">No items found</p>
            <p className="text-gray-500 mt-2">Items you post will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherItems.map((item) => (
              <div key={item.id} className="bg-gray-900 rounded-lg overflow-hidden shadow-lg transform transition-transform duration-200 hover:scale-[1.02]">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                  <p className="text-gray-300 mb-4">{item.description}</p>
                  <p className="text-gray-400 mb-2">Location: {item.location}</p>
                  <p className="text-gray-400 mb-4">Category: {item.category}</p>

                  {item.status === 'found' && (
                    <button
                      onClick={() => {
                        setSelectedItemForClaim(item.id);
                        setShowFounderClaimModal(true);
                      }}
                      className="w-full bg-blue-500 text-white py-2 rounded font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Handshake size={18} />
                      Mark as Claimed
                    </button>
                  )}

                  {item.status === 'claimed' && (
                    <div className="bg-gray-800 p-4 rounded mt-4">
                      <h4 className="font-semibold mb-2">Claim Details</h4>
                      <p className="text-sm text-gray-300">Claimed by: {item.claimed_by}</p>
                      <p className="text-sm text-gray-300">
                        Claimed on: {new Date(item.claimed_at!).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowHistory(showHistory === item.id ? null : item.id)}
                    className="w-full mt-4 bg-gray-700 text-white py-2 rounded font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <History size={18} />
                    {showHistory === item.id ? 'Hide History' : 'Show History'}
                  </button>

                  {showHistory === item.id && statusHistory[item.id] && (
                    <div className="mt-4 bg-gray-800 p-4 rounded">
                      <h4 className="font-semibold mb-2">Status History</h4>
                      <div className="space-y-2">
                        {statusHistory[item.id].map((history) => (
                          <div key={history.id} className="text-sm text-gray-300 border-l-2 border-gray-600 pl-3">
                            <p className="font-medium">
                              {history.old_status} → {history.new_status}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(history.changed_at).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">{history.notes}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showFounderClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Mark Item as Claimed</h3>
            <form onSubmit={handleFounderClaim} className="space-y-4">
              <div>
                <label className="block mb-2">Claimer's Name</label>
                <input
                  type="text"
                  required
                  value={claimerDetails.name}
                  onChange={(e) => setClaimerDetails(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 bg-gray-800 rounded text-white"
                  disabled={submittingStatus}
                />
              </div>
              <div>
                <label className="block mb-2">Claimer's Email</label>
                <input
                  type="email"
                  required
                  value={claimerDetails.email}
                  onChange={(e) => setClaimerDetails(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-2 bg-gray-800 rounded text-white"
                  disabled={submittingStatus}
                />
              </div>
              <div>
                <label className="block mb-2">Notes</label>
                <textarea
                  value={claimerDetails.notes}
                  onChange={(e) => setClaimerDetails(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 bg-gray-800 rounded text-white h-24"
                  placeholder="Add any additional notes about the handover..."
                  disabled={submittingStatus}
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowFounderClaimModal(false);
                    setSelectedItemForClaim(null);
                    setClaimerDetails({ name: '', email: '', notes: '' });
                  }}
                  className="flex-1 bg-gray-700 text-white py-2 rounded hover:bg-gray-600 transition-colors"
                  disabled={submittingStatus}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                  disabled={submittingStatus}
                >
                  {submittingStatus ? 'Updating...' : 'Confirm Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyPosts;