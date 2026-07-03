import { createClient } from '@/lib/supabase/server';
import type { SchedulePackage, ScheduleWalkdown } from '@/types/schedule';

type RawPkg = Omit<
  SchedulePackage,
  'length_ft' | 'width_ft' | 'height_ft' | 'shipping_cost' | 'permits_cost' | 'total_cost' | 'actuals'
> & {
  length_ft: string | number | null;
  width_ft: string | number | null;
  height_ft: string | number | null;
  shipping_cost: string | number | null;
  permits_cost: string | number | null;
  total_cost: string | number | null;
  actuals: string | number | null;
};

function nn(v: string | number | null): number | null {
  if (v === null || v === '') return null;
  return typeof v === 'number' ? v : Number(v);
}

export async function getAllPackages(): Promise<SchedulePackage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_packages')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getAllPackages failed:', error);
    throw new Error(`Failed to fetch schedule packages: ${error.message}`);
  }
  return (data as RawPkg[]).map((r) => ({
    id: r.id,
    ewp: r.ewp,
    tag: r.tag,
    length_ft: nn(r.length_ft),
    width_ft: nn(r.width_ft),
    height_ft: nn(r.height_ft),
    weight_lbs: r.weight_lbs,
    shipping_cost: nn(r.shipping_cost),
    permits_cost: nn(r.permits_cost),
    total_cost: nn(r.total_cost),
    actuals: nn(r.actuals),
    rts_date: r.rts_date,
    planned_ship_date: r.planned_ship_date,
    is_rack: r.is_rack,
    is_over_height: r.is_over_height,
    convoy_group: r.convoy_group,
    sort_order: r.sort_order,
  }));
}

type RawWalkdown = {
  id: string;
  event_date: string;
  level: number;
  name: string;
};

export async function getAllWalkdowns(): Promise<ScheduleWalkdown[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_walkdowns')
    .select('id, event_date, level, name')
    .order('event_date', { ascending: true });
  if (error) {
    console.error('getAllWalkdowns failed:', error);
    throw new Error(`Failed to fetch walkdowns: ${error.message}`);
  }
  return (data as RawWalkdown[]).map((r) => ({
    id: r.id,
    event_date: r.event_date,
    level: r.level as 30 | 60 | 90,
    name: r.name,
  }));
}
