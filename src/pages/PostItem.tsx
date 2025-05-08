import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';

function PostItem() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    finder_name: '',
    finder_email: '',
    finder_phone: '',
    category: 'others' as Category,
  });
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size should be less than 5MB');
        return;
      }
      setImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('lost-found-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('lost-found-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(image);
      }

      const { error: supabaseError } = await supabase
        .from('lost_found_items')
        .insert([{
          ...formData,
          image_url: imageUrl,
          status: 'found'
        }]);

      if (supabaseError) throw supabaseError;

      setSuccess(true);
      setFormData({
        title: '',
        description: '',
        location: '',
        finder_name: '',
        finder_email: '',
        finder_phone: '',
        category: 'others',
      });
      setImage(null);
      setImagePreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8 text-center">Post Found Item</h2>
      <div className="max-w-2xl mx-auto bg-gray-900 p-8 rounded-lg">
        <p className="mb-6 text-gray-300">Please fill all the required fields</p>
        
        {success && (
          <div className="mb-6 p-4 bg-green-600 text-white rounded">
            Item posted successfully!
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-600 text-white rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2">Name</label>
            <input
              type="text"
              required
              value={formData.finder_name}
              onChange={(e) => setFormData(prev => ({ ...prev, finder_name: e.target.value }))}
              className="w-full p-3 bg-gray-800 rounded text-white"
            />
          </div>

          <div>
            <label className="block mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.finder_email}
              onChange={(e) => setFormData(prev => ({ ...prev, finder_email: e.target.value }))}
              className="w-full p-3 bg-gray-800 rounded text-white"
              pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
            />
          </div>

          <div>
            <label className="block mb-2">Phone</label>
            <input
              type="tel"
              required
              value={formData.finder_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, finder_phone: e.target.value }))}
              className="w-full p-3 bg-gray-800 rounded text-white"
              pattern="^\+?[1-9]\d{9,14}$"
            />
          </div>

          <div>
            <label className="block mb-2">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-3 bg-gray-800 rounded text-white"
            />
          </div>

          <div>
            <label className="block mb-2">Category</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Category }))}
              className="w-full p-3 bg-gray-800 rounded text-white"
            >
              <option value="electronics">Electronics</option>
              <option value="documents">Documents</option>
              <option value="accessories">Accessories</option>
              <option value="others">Others</option>
            </select>
          </div>

          <div>
            <label className="block mb-2">Description</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 bg-gray-800 rounded text-white h-32"
            />
          </div>

          <div>
            <label className="block mb-2">Location Found</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full p-3 bg-gray-800 rounded text-white"
            />
          </div>

          <div>
            <label className="block mb-2">Upload Image (Max 5MB)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-3 bg-gray-800 rounded text-white"
            />
            {imagePreview && (
              <div className="mt-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-48 object-cover rounded"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-yellow-400 text-black py-3 rounded font-semibold hover:bg-yellow-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Posting...' : 'POST'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PostItem;