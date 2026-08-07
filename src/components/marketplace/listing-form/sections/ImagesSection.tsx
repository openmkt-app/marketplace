'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useListingForm } from '../context';

/**
 * Photos: the picker, the previews, and removing one.
 *
 * Previews are object URLs for files chosen in this session and CDN URLs for
 * images already on an edited listing, which is why removal revokes only the
 * blob: ones — revoking a CDN URL does nothing, and forgetting to revoke a
 * blob leaks it for the life of the page.
 */
export default function ImagesSection() {
  const tCreate = useTranslations('createListing');
  const { images, setImages, previewUrls, setPreviewUrls, fileInputRef, error, setError } = useListingForm();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages = Array.from(files);

    // Check if adding these images would exceed the 10 image limit
    if (images.length + newImages.length > 10) {
      setError(tCreate('errors.maxImages'));
      return;
    }

    // Clear any existing error message since we're under the limit now
    if (error && error.includes("maximum of 10 images")) {
      setError(null);
    }

    setImages(prev => [...prev, ...newImages]);

    // Create preview URLs
    const newPreviewUrls = newImages.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeImage = (index: number) => {
    // Revoke the URL to prevent memory leaks ONLY if it was created by createObjectURL (starts with blob:)
    const url = previewUrls[index];
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }

    // Remove the image and preview
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));

    // Clear any "too many images" error message since we're reducing the count
    if (error && error.includes("maximum of 10 images")) {
      setError(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
      <h2 className="text-xl font-semibold mb-4 text-text-primary">{tCreate('imagesHeader')}</h2>

      <div className="flex flex-wrap gap-2 mb-3">
        {previewUrls.map((url, index) => (
          <div key={index} className="relative w-24 h-24 rounded overflow-hidden border">
            <Image
              src={url}
              alt={`Preview ${index + 1}`}
              width={96}
              height={96}
              className="object-cover w-full h-full"
              unoptimized
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md opacity-70 hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        <div className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-neutral-light rounded">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-text-secondary hover:text-primary-color"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />
      <p className="text-xs text-text-secondary">
        {tCreate('imagesDesc')}
      </p>
    </div>
  );
}
