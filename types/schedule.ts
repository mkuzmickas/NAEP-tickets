export type SchedulePackage = {
  id: string;
  ewp: string;
  tag: string;
  length_ft: number | null;
  width_ft: number | null;
  height_ft: number | null;
  weight_lbs: string | null;
  shipping_cost: number | null;
  permits_cost: number | null;
  total_cost: number | null;
  actuals: number | null;
  rts_date: string | null;
  planned_ship_date: string | null;
  is_rack: boolean;
  is_over_height: boolean;
  convoy_group: string | null;
  sort_order: number;
};

export type ScheduleWalkdown = {
  id: string;
  event_date: string;
  level: 30 | 60 | 90;
  name: string;
};
