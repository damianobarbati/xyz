-- superadmin => 'd625886c-6ba5-4062-bea0-2370d39a142e', 'c03faff8-95e6-4a37-8647-ef61a75ab2da'
-- office => '4fb3c1af-13f6-49d6-935b-5dbbd8eb6e61', 'a27a3be6-3e34-4728-a187-87fcb70eb90a'

explain analyze with visible_shipments as materialized (
  select s.* from shipments as s
  where s.deleted_at is null
  and (
    exists (select 1 from users_permissions as p where p.subject in ('d625886c-6ba5-4062-bea0-2370d39a142e', 'c03faff8-95e6-4a37-8647-ef61a75ab2da') and p.operation in ('*', 'ShipmentGet') and (p.resource = '*'))
    or exists (select 1 from users_permissions as p where p.subject in ('d625886c-6ba5-4062-bea0-2370d39a142e', 'c03faff8-95e6-4a37-8647-ef61a75ab2da') and p.operation in ('*', 'ShipmentGet') and (p.resource_is_owner and p.resource = s.owner_id::text))
    or exists (select 1 from users_permissions as p where p.subject in ('d625886c-6ba5-4062-bea0-2370d39a142e', 'c03faff8-95e6-4a37-8647-ef61a75ab2da') and p.operation in ('*', 'ShipmentGet') and (not p.resource_is_owner and p.resource = s.id::text))
  )
),
visible_legs as materialized (
  select l.* from legs2 as l
  where l.deleted_at is null and l.shipment_id in (select id from visible_shipments)
  and (
    exists (select 1 from users_permissions as p where p.subject in ('d625886c-6ba5-4062-bea0-2370d39a142e', 'c03faff8-95e6-4a37-8647-ef61a75ab2da') and p.operation in ('*', 'LegGet') and (p.resource = '*'))
    or exists (select 1 from users_permissions as p where p.subject in ('d625886c-6ba5-4062-bea0-2370d39a142e', 'c03faff8-95e6-4a37-8647-ef61a75ab2da') and p.operation in ('*', 'LegGet') and (p.resource_is_owner and p.resource = l.owner_id::text))
    or exists (select 1 from users_permissions as p where p.subject in ('d625886c-6ba5-4062-bea0-2370d39a142e', 'c03faff8-95e6-4a37-8647-ef61a75ab2da') and p.operation in ('*', 'LegGet') and (not p.resource_is_owner and p.resource = l.id::text))
  )
),
last_leg_delivered as (
  select
    l.shipment_id,
    max(l.origin_expected_datetime) as last_leg_delivered_datetime
  from visible_legs as l
  where l.destination_actual_datetime is not null
  group by l.shipment_id
),
next_delayed_leg_after_delivery as (
  select distinct on (vl.shipment_id)
    vl.shipment_id,
    vl.delayed
  from visible_legs vl
  inner join last_leg_delivered lld ON vl.shipment_id = lld.shipment_id
  where vl.origin_expected_datetime > lld.last_leg_delivered_datetime
  order by vl.shipment_id, vl.origin_expected_datetime asc
),
legs_summary as (
  select
    vl.shipment_id,
    first_value(origin_address_name) over w_full as collection_address_name,
    first_value(origin_city) over w_full as collection_city,
    first_value(origin_country) over w_full as collection_country,
    first_value(origin_expected_datetime) over w_full as collection_datetime,
    first_value(origin_tz) over w_full as collection_tz,
    last_value(destination_address_name) over w_full as destination_address_name,
    last_value(destination_city) over w_full as delivery_city,
    last_value(destination_country) over w_full as delivery_country,
    last_value(destination_expected_datetime) over w_full as delivery_datetime,
    last_value(destination_actual_datetime) over w_full as actual_delivery_datetime,
    last_value(destination_tz) over w_full as delivery_tz,
    min(next_eta) over (partition by vl.shipment_id) as next_eta,
    bool_or(origin_actual_datetime is not null) over (partition by vl.shipment_id) as any_collected,
    bool_and(destination_actual_datetime is not null) over (partition by vl.shipment_id) as all_delivered,
    -- delayed value when the last leg was delivered - it also includes the case when all legs were delivered
    last_value(case when destination_actual_datetime is not null then vl.delayed else null end) over w_full as delayed_last_leg_was_delivered,
    -- delayed value from the next leg to be collected/delivered if some legs were delivered
    ndl.delayed as delayed_for_some_delivered,
    -- delayed fallback value from any delayed leg
    bool_or(vl.delayed) over (partition by vl.shipment_id) as delayed_for_no_delivered,
    bool_or(driver_id is null) over (partition by vl.shipment_id) as unassigned_flag,
    first_value(case when supplier_reference_type = 'shipment' then supplier_reference_id end) over w_full as supplier_reference_id,
    count(*) over w_full as legs_count,
    row_number() over (partition by vl.shipment_id order by destination_actual_datetime desc nulls last) as rn
  from visible_legs as vl
  left join next_delayed_leg_after_delivery ndl on (ndl.shipment_id = vl.shipment_id)
  window w_full as (partition by vl.shipment_id order by origin_expected_datetime asc rows between unbounded preceding and unbounded following)
),
final_shipments as (
  select
    s.*,
    case
      when s.state = 'cancelled' then 'cancelled'
      when s.state = 'draft' then 'draft'
      when ls.all_delivered then 'delivered'
      when ls.any_collected then 'transiting'
      else 'pending'
    end as status,
    coalesce(ls.legs_count, 0) as legs_count,
    coalesce(ls.delayed_last_leg_was_delivered, ls.delayed_for_some_delivered, ls.delayed_for_no_delivered, false) as delayed,
    coalesce(ls.unassigned_flag, false) as unassigned,
    ls.collection_city,
    ls.collection_country,
    ls.collection_datetime,
    ls.collection_tz,
    ls.delivery_city,
    ls.delivery_country,
    ls.delivery_datetime,
    ls.actual_delivery_datetime,
    ls.delivery_tz,
    ls.next_eta,
    ls.supplier_reference_id
  from visible_shipments as s
  left join legs_summary as ls on (ls.shipment_id = s.id and ls.rn = 1)
)
select * from final_shipments as s
order by s.created_at desc, id asc;
