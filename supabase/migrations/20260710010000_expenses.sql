-- Shared expense tracking with per-member splits.
-- `expenses` is the ledger (who paid what); `expense_splits` records how each
-- expense is divided among trip members.

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  paid_by uuid not null references public.profiles (id),
  description text not null,
  amount numeric(10, 2) not null check (amount > 0),
  category text check (category in ('lodging', 'food', 'transport', 'activity', 'other')),
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- No denormalized trip_id here: splits are always fetched through their parent
-- expense, and access checks below resolve trip membership via the parent row.
create table public.expense_splits (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  amount numeric(10, 2) not null,
  primary key (expense_id, user_id)
);

alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;

-- expenses: any trip member can see and add; only the payer can change or remove
create policy "expenses_select" on public.expenses for select
  using (public.is_trip_member(trip_id));
create policy "expenses_insert" on public.expenses for insert
  with check (public.is_trip_member(trip_id) and paid_by = auth.uid());
create policy "expenses_update" on public.expenses for update
  using (paid_by = auth.uid());
create policy "expenses_delete" on public.expenses for delete
  using (paid_by = auth.uid());

-- expense_splits: access follows the parent expense
create policy "expense_splits_select" on public.expense_splits for select
  using (
    public.is_trip_member((select e.trip_id from public.expenses e where e.id = expense_id))
  );
create policy "expense_splits_insert" on public.expense_splits for insert
  with check (
    public.is_trip_member((select e.trip_id from public.expenses e where e.id = expense_id))
  );
create policy "expense_splits_delete" on public.expense_splits for delete
  using (
    auth.uid() = (select e.paid_by from public.expenses e where e.id = expense_id)
  );

alter publication supabase_realtime add table public.expenses, public.expense_splits;
