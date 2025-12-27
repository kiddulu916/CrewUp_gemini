'use client';

import { useState, useRef, useEffect } from 'react';
import { InitialsAvatar } from '@/lib/utils/initials-avatar';
import { resizeProfileImage } from '@/lib/utils/image-compression';

type Props = {
  currentImageUrl?: string | null;
  userName: string;
  userId: string;
  onImageSelected: (file: File) => void;
  disabled?: boolean;
};

export function ProfileAvatarUpload({
  currentImageUrl,
  userName,
  userId,
  onImageSelected,
  disabled = false,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when currentImageUrl changes
  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 2MB before compression)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image must be under 2MB. Please choose a smaller file');
      return;
    }

    setIsProcessing(true);

    try {
      // Resize and compress image
      const compressedFile = await resizeProfileImage(file);

      // Create preview URL (revoke old one first)
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      const newPreviewUrl = URL.createObjectURL(compressedFile);
      setPreviewUrl(newPreviewUrl);

      // Notify parent component
      onImageSelected(compressedFile);
    } catch (err) {
      console.error('Image processing error:', err);
      setError('Failed to process image. Please try a different file');
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {/* Avatar Preview */}
      <div
        className="relative cursor-pointer group"
        onClick={handleClick}
        role="button"
        tabIndex={disabled || isProcessing ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Image or Initials Avatar */}
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={userName}
            className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
          />
        ) : (
          <InitialsAvatar name={userName} userId={userId} size="lg" />
        )}

        {/* Hover Overlay */}
        {!disabled && !isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-medium px-2">Change</span>
          </div>
        )}

        {/* Processing Spinner */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-600 text-center max-w-[96px]">{error}</p>
      )}

      {/* Helper Text */}
      {!error && (
        <p className="text-xs text-gray-500 text-center max-w-[96px]">
          Click to change picture
        </p>
      )}
    </div>
  );
}
