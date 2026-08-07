'use client';

import { useTranslations } from 'next-intl';
import { Wand2, Loader2, Sparkles } from 'lucide-react';
import { useListingForm } from '../context';
import { formatPrice } from '../format';
import { getPlatformDisplayName } from '@/lib/external-link-utils';

/**
 * Magic import: fill the form from a product URL, or from an Etsy CSV.
 *
 * Everything it writes is a suggestion the seller can edit before saving —
 * nothing here reaches a record without passing through the rest of the form
 * first.
 */
export default function MagicImportSection() {
  const tCreate = useTranslations('createListing');
  const {
    magicLinkUrl, setMagicLinkUrl,
    isMagicLoading, setIsMagicLoading,
    magicError, setMagicError,
    magicNote, setMagicNote,
    etsyListingId, setEtsyListingId,
    isCsvLoading, setIsCsvLoading,
    csvError, setCsvError,
    etsyCsvInputRef,
    setTitle, setDescription, setPriceInput,
    setExternalUrl, setDetectedPlatform,
    images, setImages, setPreviewUrls,
  } = useListingForm();

  const handleMagicFill = async () => {
    if (!magicLinkUrl.trim()) return;

    setIsMagicLoading(true);
    setMagicError(null);
    setMagicNote(null);
    setEtsyListingId(null);
    setCsvError(null);

    try {
      // 1. Fetch Metadata
      const res = await fetch(`/api/magic-link?url=${encodeURIComponent(magicLinkUrl)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch link data');
      }

      // 2. Populate Fields
      if (data.title) setTitle(data.title.substring(0, 300)); // Limit title length
      if (data.description) setDescription(data.description.substring(0, 3000)); // Limit desc length

      // Handle Price if found
      if (data.price) {
        // Convert to string in case the API returns a number
        const priceStr = typeof data.price === 'string' ? data.price : String(data.price);
        setPriceInput(formatPrice(priceStr));
      }

      // Set External URL
      setExternalUrl(magicLinkUrl);

      // Try to detect platform - first from URL pattern, then via async detection
      let platform = getPlatformDisplayName(magicLinkUrl);
      if (!platform) {
        try {
          const platformRes = await fetch(`/api/detect-platform?url=${encodeURIComponent(magicLinkUrl)}`);
          const platformData = await platformRes.json();
          if (platformData.platformName) {
            platform = platformData.platformName;
          }
        } catch (e) {
          // Non-blocking - just won't show platform badge
          console.warn('Platform detection failed:', e);
        }
      }
      setDetectedPlatform(platform);

      // 3. Handle Images (Fetch via proxy -> Blob -> File)
      const imagesToFetch = data.images && data.images.length > 0 ? data.images : (data.image ? [data.image] : []);

      if (imagesToFetch.length > 0) {
        try {
          const newFiles: File[] = [];
          const newUrls: string[] = [];

          // Create a snapshot of current images length to enforce the 10 image limit
          const currentCount = images.length;
          const limit = Math.min(10 - currentCount, imagesToFetch.length, 10);

          for (let i = 0; i < limit; i++) {
            const imgUrl = imagesToFetch[i];
            try {
              const imageRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(imgUrl)}`);
              if (imageRes.ok) {
                const blob = await imageRes.blob();
                const mimeType = blob.type;
                const ext = mimeType.split('/')[1] || 'jpg';
                const filename = `imported-image-${Date.now()}-${i + 1}.${ext}`;
                const file = new File([blob], filename, { type: mimeType });

                newFiles.push(file);
                newUrls.push(URL.createObjectURL(file));
              }
            } catch (imgErr) {
              console.warn(`Failed to auto-import image ${i}:`, imgErr);
            }
          }

          if (newFiles.length > 0) {
            setImages(prev => [...prev, ...newFiles]);
            setPreviewUrls(prev => [...prev, ...newUrls]);
          }
        } catch (imgErr) {
          console.warn('Failed to auto-import images:', imgErr);
        }
      }

      // Success feedback
      setMagicError(null);
      if (data.note) setMagicNote(data.note);

      // If Etsy, capture listing ID so we can enhance via CSV later
      const etsyIdMatch = magicLinkUrl.match(/etsy\.com\/listing\/(\d+)/);
      setEtsyListingId(etsyIdMatch ? etsyIdMatch[1] : null);
      setCsvError(null);

    } catch (err: any) {
      console.error('Magic Link Error:', err);
      setMagicNote(null);
      setEtsyListingId(null);
      setMagicError(err.message || 'Could not auto-fill details. Please try manually.');
    } finally {
      setIsMagicLoading(false);
    }
  };

  const handleEtsyCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !etsyListingId) return;

    setIsCsvLoading(true);
    setCsvError(null);

    try {
      const text = await file.text();

      // Minimal but correct CSV parser (handles quoted fields with embedded commas/newlines)
      const parseCSV = (csv: string): Record<string, string>[] => {
        const rows: Record<string, string>[] = [];
        let i = 0;
        const fields: string[] = [];

        const parseField = () => {
          if (csv[i] === '"') {
            i++; // skip opening quote
            let val = '';
            while (i < csv.length) {
              if (csv[i] === '"' && csv[i + 1] === '"') { val += '"'; i += 2; }
              else if (csv[i] === '"') { i++; break; }
              else { val += csv[i++]; }
            }
            return val;
          } else {
            let val = '';
            while (i < csv.length && csv[i] !== ',' && csv[i] !== '\n' && csv[i] !== '\r') val += csv[i++];
            return val;
          }
        };

        // Parse header row
        const headers: string[] = [];
        while (i < csv.length && csv[i] !== '\n' && csv[i] !== '\r') {
          headers.push(parseField().trim().toUpperCase());
          if (csv[i] === ',') i++;
        }
        while (csv[i] === '\n' || csv[i] === '\r') i++;

        // Parse data rows
        while (i < csv.length) {
          const row: Record<string, string> = {};
          let col = 0;
          while (i < csv.length && csv[i] !== '\n' && csv[i] !== '\r') {
            if (headers[col]) row[headers[col]] = parseField();
            else parseField();
            col++;
            if (csv[i] === ',') i++;
          }
          while (csv[i] === '\n' || csv[i] === '\r') i++;
          if (Object.keys(row).length > 0) rows.push(row);
        }

        return rows;
      };

      const rows = parseCSV(text);
      const match = rows.find(r => r['LISTING_ID'] === etsyListingId);

      if (!match) {
        setCsvError(`Listing ID ${etsyListingId} not found in this CSV. Make sure you're uploading the correct export file.`);
        return;
      }

      // Fill description
      if (match['DESCRIPTION']) {
        setDescription(match['DESCRIPTION'].substring(0, 3000));
      }

      // Fill price
      if (match['PRICE']) {
        const parsed = parseFloat(match['PRICE']);
        if (!isNaN(parsed)) setPriceInput(formatPrice(parsed.toFixed(2)));
      }

      // Collect IMAGE1–IMAGE10 columns
      const csvImages: string[] = [];
      for (let n = 1; n <= 10; n++) {
        const url = match[`IMAGE${n}`];
        if (url && url.startsWith('http')) csvImages.push(url);
      }

      if (csvImages.length > 0) {
        const newFiles: File[] = [];
        const newUrls: string[] = [];
        const currentCount = images.length;
        const limit = Math.min(10 - currentCount, csvImages.length);

        for (let n = 0; n < limit; n++) {
          try {
            const imgRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(csvImages[n])}`);
            if (imgRes.ok) {
              const blob = await imgRes.blob();
              const ext = blob.type.split('/')[1] || 'jpg';
              const file = new File([blob], `etsy-image-${Date.now()}-${n + 1}.${ext}`, { type: blob.type });
              newFiles.push(file);
              newUrls.push(URL.createObjectURL(file));
            }
          } catch (imgErr) {
            console.warn(`Failed to import CSV image ${n}:`, imgErr);
          }
        }

        if (newFiles.length > 0) {
          setImages(prev => [...prev, ...newFiles]);
          setPreviewUrls(prev => [...prev, ...newUrls]);
        }
      }

      setMagicNote(null);
      setEtsyListingId(null); // hide the enhance section — we're done
    } catch (err: any) {
      setCsvError(err.message || 'Failed to parse CSV file.');
    } finally {
      setIsCsvLoading(false);
      if (etsyCsvInputRef.current) etsyCsvInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-300 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-amber-200 rounded-lg text-amber-700">
          <Wand2 size={18} />
        </div>
        <h3 className="font-bold text-gray-900">{tCreate('magicImport')}</h3>
        <span className="bg-amber-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide">{tCreate('magicImportBeta')}</span>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        {tCreate('magicImportDesc')}
      </p>

      <div className="flex gap-2">
        <input
          type="url"
          placeholder={tCreate('magicImportPlaceholder')}
          value={magicLinkUrl}
          onChange={(e) => setMagicLinkUrl(e.target.value)}
          className="flex-1 rounded-xl border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white text-gray-900 placeholder-gray-400"
        />
        <button
          type="button"
          onClick={handleMagicFill}
          disabled={isMagicLoading || !magicLinkUrl}
          className="bg-gray-900 hover:bg-gray-800 text-amber-300 px-5 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap shadow-sm"
        >
          {isMagicLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {tCreate('magicImportLoading')}
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {tCreate('magicImportButton')}
            </>
          )}
        </button>
      </div>

      {magicError && (
        <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
          ⚠️ {magicError}
        </p>
      )}
      {magicNote && (
        <p className="text-amber-700 text-xs mt-2 flex items-center gap-1">
          ℹ️ {magicNote}
        </p>
      )}

      {/* Etsy CSV Enhance Card */}
      {etsyListingId && (
        <div className="mt-4 border border-orange-200 bg-orange-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-800 mb-1">Want more details?</p>
          <p className="text-xs text-orange-700 mb-3">
            Etsy limits what we can fetch automatically. Upload your Etsy export CSV to fill in description, price, and all images for this listing — or import your entire store at once.
          </p>
          <ol className="text-xs text-orange-700 list-decimal list-inside space-y-0.5 mb-3">
            <li>Go to <strong>Etsy Shop Manager → Listings</strong></li>
            <li>Click <strong>Download Data</strong> (top right)</li>
            <li>Upload the downloaded CSV file below</li>
          </ol>
          <input
            ref={etsyCsvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleEtsyCsvUpload}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => etsyCsvInputRef.current?.click()}
              disabled={isCsvLoading}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCsvLoading ? (
                <><Loader2 size={13} className="animate-spin" /> Importing...</>
              ) : (
                'Upload Etsy Export CSV'
              )}
            </button>
            <a
              href="/mall/import"
              className="text-orange-700 border border-orange-300 hover:bg-orange-100 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Import Your Whole Store
            </a>
          </div>
          {csvError && (
            <p className="text-red-600 text-xs mt-2">⚠️ {csvError}</p>
          )}
        </div>
      )}
    </div>
  );
}
