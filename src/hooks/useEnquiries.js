import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useEnquiries() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEnquiries = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setEnquiries(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchEnquiries();
    else setIsLoading(false);
  }, [fetchEnquiries, user]);

  /** Save a new contact form submission. Called from ContactPage. */
  const submitContactForm = async ({ name, email, phone, subject, message }) => {
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert({ name, email, phone, subject, message, status: 'new' })
      .select()
      .single();
    return { data, error };
  };

  /** Convert an enquiry into a lead. */
  const convertToLead = async (enquiryId, enquiry, realtorId = null) => {
    try {
      // Insert into leads
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          contact_name: enquiry.name,
          contact_email: enquiry.email,
          contact_phone: enquiry.phone,
          interest_type: enquiry.subject || 'General',
          notes: enquiry.message,
          assigned_realtor_id: realtorId || null,
          status: realtorId ? 'assigned' : 'new',
          source: 'website',
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Mark submission as converted
      const { error: updateError } = await supabase
        .from('contact_submissions')
        .update({ status: 'converted', converted_lead_id: lead.id })
        .eq('id', enquiryId);

      if (updateError) throw updateError;

      setEnquiries(prev =>
        prev.map(e => e.id === enquiryId ? { ...e, status: 'converted', converted_lead_id: lead.id } : e)
      );

      return { data: lead, error: null };
    } catch (err) {
      console.error('[useEnquiries] convertToLead error:', err);
      return { data: null, error: err };
    }
  };

  /** Dismiss an enquiry without converting. */
  const dismissEnquiry = async (enquiryId) => {
    const { error } = await supabase
      .from('contact_submissions')
      .update({ status: 'dismissed' })
      .eq('id', enquiryId);

    if (!error) {
      setEnquiries(prev =>
        prev.map(e => e.id === enquiryId ? { ...e, status: 'dismissed' } : e)
      );
    }
    return { error };
  };

  return { enquiries, isLoading, refresh: fetchEnquiries, submitContactForm, convertToLead, dismissEnquiry };
}
