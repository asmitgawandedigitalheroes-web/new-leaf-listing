import { Lead } from './lead.types';

export interface RoutingContext {
  lead: Partial<Lead>;
  territory_id: string;
  listing_id?: string | null;
}

export interface RoutingResult {
  assigned_realtor_id: string | null;
  assigned_director_id: string | null;
  routing_reason: string;
  priority_score: number;
  timestamp: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  condition: string; // serialized condition
  action: string;    // serialized action
  active: boolean;
}

export interface PriorityCandidate {
  realtor_id: string;
  realtor_name: string;
  priority_score: number;
  subscription_tier: string;
  listing_upgrade: string | null;
  is_territory_sponsor: boolean;
}
