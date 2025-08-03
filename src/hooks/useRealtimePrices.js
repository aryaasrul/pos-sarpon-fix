// src/hooks/useRealtimePrices.js
import { useEffect, useCallback, useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export const useRealtimePrices = (onPriceUpdate) => {
  const [isListening, setIsListening] = useState(false);

  const startRealtimeListener = useCallback(() => {
    if (isListening) return;

    setIsListening(true);

    // Channel untuk mendengarkan notifikasi PostgreSQL
    const channel = supabase.channel('price-updates');

    // Listen untuk perubahan menu_items
    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'menu_items',
      filter: 'profit_margin=neq.null'
    }, (payload) => {
      console.log('📈 Menu item updated:', payload);
      toast.success(`Menu "${payload.new.name}" diperbarui! Refresh harga...`, { duration: 2000 });
      if (onPriceUpdate) onPriceUpdate('menu_items', payload);
    });

    // Listen untuk perubahan ingredients
    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'ingredients'
    }, (payload) => {
      console.log('🌱 Ingredient updated:', payload);
      toast.success(`Bahan "${payload.new.name}" diperbarui! Refresh harga...`, { duration: 2000 });
      if (onPriceUpdate) onPriceUpdate('ingredients', payload);
    });

    // Subscribe ke channel
    channel.subscribe((status) => {
      console.log('🔔 Realtime subscription status:', status);
      if (status === 'SUBSCRIBED') {
        toast.success('📡 Terhubung ke sistem real-time!', { duration: 3000 });
      }
    });

    // Cleanup function
    return () => {
      channel.unsubscribe();
      setIsListening(false);
    };
  }, [isListening, onPriceUpdate]);

  useEffect(() => {
    const cleanup = startRealtimeListener();
    return cleanup;
  }, [startRealtimeListener]);

  return { isListening };
};