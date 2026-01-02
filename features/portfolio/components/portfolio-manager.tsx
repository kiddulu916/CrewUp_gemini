'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/providers/toast-provider';
import { Profile, PortfolioImage } from '@/lib/types/profile.types';
import { hasProAccess } from '@/lib/utils/subscription';
import { usePortfolioImages } from '../hooks/use-portfolio-images';
import {
  uploadPortfolioPhoto,
  deletePortfolioPhoto,
  reorderPortfolioPhotos,
} from '../actions/portfolio-actions';

type PortfolioManagerProps = {
  profile: Profile;
};

/**
 * Sortable portfolio image item for drag-and-drop
 */
function SortablePortfolioItem({
  image,
  onDelete,
  isDeleting,
}: {
  image: PortfolioImage;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-white rounded-lg border-2 border-gray-200 overflow-hidden hover:border-krewup-blue transition-colors"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 bg-white/90 rounded-md p-2 cursor-grab active:cursor-grabbing hover:bg-white shadow-md"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5 text-gray-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(image.id)}
        disabled={isDeleting}
        className="absolute top-2 right-2 z-10 bg-red-600 text-white rounded-md p-2 hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
        aria-label="Delete image"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
      </button>

      {/* Image */}
      <div className="relative w-full aspect-square">
        <Image
          src={image.image_url}
          alt={`Portfolio image ${image.display_order + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    </div>
  );
}

/**
 * PortfolioManager Component
 *
 * Manages portfolio photos with upload, delete, and reorder functionality.
 * Free users: max 5 photos
 * Pro users: unlimited photos
 *
 * Features:
 * - Image upload with client-side compression
 * - Drag-and-drop reordering
 * - Delete with confirmation
 * - Pro limit enforcement
 */
export function PortfolioManager({ profile }: PortfolioManagerProps) {
  const { data: images = [], isLoading, error } = usePortfolioImages();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const isPro = hasProAccess(profile);
  const canUpload = isPro || images.length < 5;

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * Handle file upload with compression
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload JPEG, PNG, or WebP images only');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be under 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Compress image
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      // Upload to server
      const formData = new FormData();
      formData.append('file', compressedFile);

      const result = await uploadPortfolioPhoto(formData);

      if (result.success) {
        toast.success('Photo uploaded successfully');
        // Refetch portfolio images
        queryClient.invalidateQueries({ queryKey: ['portfolio-images'] });
      } else {
        toast.error(result.error || 'Failed to upload photo');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to compress or upload image');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Handle delete confirmation
   */
  const handleDeleteClick = (imageId: string) => {
    setDeleteConfirmId(imageId);
  };

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;

    setIsDeletingId(deleteConfirmId);

    try {
      const result = await deletePortfolioPhoto(deleteConfirmId);

      if (result.success) {
        toast.success('Photo deleted successfully');
        // Refetch portfolio images
        queryClient.invalidateQueries({ queryKey: ['portfolio-images'] });
      } else {
        toast.error(result.error || 'Failed to delete photo');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete photo');
    } finally {
      setIsDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  /**
   * Handle drag end - reorder images
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);

    // Store previous state for rollback on error
    const previousImages = queryClient.getQueryData<PortfolioImage[]>(['portfolio-images']);

    // Optimistically update UI
    const newImages = arrayMove(images, oldIndex, newIndex);
    queryClient.setQueryData(['portfolio-images'], newImages);

    setIsReordering(true);

    try {
      const imageIds = newImages.map((img) => img.id);
      const result = await reorderPortfolioPhotos(imageIds);

      if (result.success) {
        toast.success('Photos reordered successfully');
      } else {
        // Restore previous state directly on error
        toast.error(result.error || 'Failed to reorder photos');
        if (previousImages) {
          queryClient.setQueryData(['portfolio-images'], previousImages);
        }
      }
    } catch (err) {
      console.error('Reorder error:', err);
      toast.error('Failed to reorder photos');
      // Restore previous state directly on error
      if (previousImages) {
        queryClient.setQueryData(['portfolio-images'], previousImages);
      }
    } finally {
      setIsReordering(false);
    }
  };

  /**
   * Trigger file input click
   */
  const handleUploadClick = () => {
    if (!canUpload) {
      toast.warning('Free users can upload maximum 5 photos. Upgrade to Pro for unlimited photos.');
      return;
    }
    fileInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-krewup-blue"></div>
          <p className="mt-4 text-gray-600">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <p className="text-red-800">Failed to load portfolio images. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with upload button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Portfolio Photos</h3>
          <p className="text-sm text-gray-600 mt-1">
            {isPro ? (
              'Showcase your work with unlimited photos'
            ) : (
              <>
                {images.length} of 5 photos used.{' '}
                <a href="/pricing" className="text-krewup-blue hover:underline font-medium">
                  Upgrade to Pro
                </a>{' '}
                for unlimited photos.
              </>
            )}
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload portfolio photo"
          />
          <Button
            onClick={handleUploadClick}
            variant="primary"
            isLoading={isUploading}
            disabled={isUploading || (!isPro && images.length >= 5)}
          >
            {isUploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
        </div>
      </div>

      {/* Portfolio grid */}
      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No portfolio photos yet</h4>
          <p className="text-gray-600 mb-4">
            Upload photos to showcase your work and attract more clients
          </p>
          <Button onClick={handleUploadClick} variant="primary">
            Upload Your First Photo
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Drag and drop to reorder. First photo will be your featured portfolio image.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={images.map((img) => img.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image) => (
                  <SortablePortfolioItem
                    key={image.id}
                    image={image}
                    onDelete={handleDeleteClick}
                    isDeleting={isDeletingId === image.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {isReordering && (
            <div className="text-center text-sm text-gray-600">
              <span className="inline-flex items-center gap-2">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-krewup-blue"></div>
                Saving new order...
              </span>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Portfolio Photo"
        message="Are you sure you want to delete this photo? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeletingId !== null}
      />
    </div>
  );
}
