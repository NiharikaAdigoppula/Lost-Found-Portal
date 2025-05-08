import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LostFoundItem, Category } from '../types';
import { Search } from 'lucide-react';

function FindItem() {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [claimFormData, setClaimFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [submittingClaim, setSubmittingClaim] = useState(false);

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel('items_status_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'lost_found_items' 
        }, 
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('lost_found_items')
        .select('*')
        .eq('status', 'found')
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;
      setItems(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimClick = async (itemId: string) => {
    const { data: item } = await supabase
      .from('lost_found_items')
      .select('status')
      .eq('id', itemId)
      .single();

    if (!item || item.status !== 'found') {
      alert('This item is no longer available for claiming.');
      await fetchItems();
      return;
    }

    setSelectedItemId(itemId);
    setShowClaimModal(true);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || submittingClaim) return;

    setSubmittingClaim(true);
    try {
      const { data: item, error: checkError } = await supabase
        .from('lost_found_items')
        .select('status')
        .eq('id', selectedItemId)
        .single();

      if (checkError) throw checkError;
      if (!item || item.status !== 'found') {
        throw new Error('This item is no longer available for claiming');
      }

      const { error: updateError } = await supabase
        .from('lost_found_items')
        .update({
          status: 'pending',
          claimed_by: claimFormData.email,
          claimed_at: new Date().toISOString()
        })
        .eq('id', selectedItemId)
        .eq('status', 'found');

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('item_status_history')
        .insert({
          item_id: selectedItemId,
          old_status: 'found',
          new_status: 'pending',
          changed_by: claimFormData.email,
          notes: `Claim requested by ${claimFormData.name} (${claimFormData.email}): ${claimFormData.message}`
        });

      if (historyError) throw historyError;

      setShowClaimModal(false);
      setClaimFormData({ name: '', email: '', message: '' });
      setSelectedItemId(null);
      alert('Claim request submitted successfully! The finder will review your claim.');
      await fetchItems();
    } catch (err) {
      console.error('Claim submission error:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit claim. Please try again.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500 text-white p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8 text-center">Found Items</h2>

      <div className="mb-8 space-y-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 rounded text-white"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as Category | 'all')}
            className="px-4 py-2 bg-gray-800 rounded text-white"
          >
            <option value="all">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="documents">Documents</option>
            <option value="accessories">Accessories</option>
            <option value="others">Others</option>
          </select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 rounded-lg">
          <p className="text-gray-400 text-lg">No items found</p>
          <p className="text-gray-500 mt-2">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-gray-900 rounded-lg overflow-hidden shadow-lg transform transition-transform duration-200 hover:scale-[1.02]">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-300 mb-4">{item.description}</p>
                <p className="text-gray-400 mb-2">Found at: {item.location}</p>
                <p className="text-gray-400 mb-2">Category: {item.category}</p>
                <p className="text-gray-400 mb-4">Found by: {item.finder_name}</p>
                
                <div className="space-y-2">
                  <div className="flex gap-4">
                    <a
                      href={`tel:${item.finder_phone}`}
                      className="flex-1 bg-yellow-400 text-black py-2 rounded text-center font-semibold hover:bg-yellow-500 transition-colors"
                    >
                      Call
                    </a>
                    <a
                      href={`mailto:${item.finder_email}`}
                      className="flex-1 bg-yellow-400 text-black py-2 rounded text-center font-semibold hover:bg-yellow-500 transition-colors"
                    >
                      Email
                    </a>
                  </div>
                  <button
                    onClick={() => handleClaimClick(item.id)}
                    className="w-full bg-green-500 text-white py-2 rounded font-semibold hover:bg-green-600 transition-colors"
                  >
                    Claim Item
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Claim Item</h3>
            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block mb-2">Your Name</label>
                <input
                  type="text"
                  required
                  value={claimFormData.name}
                  onChange={(e) => setClaimFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 bg-gray-800 rounded text-white"
                  disabled={submittingClaim}
                />
              </div>
              <div>
                <label className="block mb-2">Your Email</label>
                <input
                  type="email"
                  required
                  value={claimFormData.email}
                  onChange={(e) => setClaimFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-2 bg-gray-800 rounded text-white"
                  disabled={submittingClaim}
                />
              </div>
              <div>
                <label className="block mb-2">Message to Finder</label>
                <textarea
                  required
                  value={claimFormData.message}
                  onChange={(e) => setClaimFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full p-2 bg-gray-800 rounded text-white h-24"
                  placeholder="Please provide any additional information that might help identify you as the owner..."
                  disabled={submittingClaim}
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowClaimModal(false);
                    setSelectedItemId(null);
                    setClaimFormData({ name: '', email: '', message: '' });
                  }}
                  className="flex-1 bg-gray-700 text-white py-2 rounded hover:bg-gray-600 transition-colors"
                  disabled={submittingClaim}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                  disabled={submittingClaim}
                >
                  {submittingClaim ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FindItem;