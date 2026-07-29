create table if not exists public.cards (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  template text not null check (template in ('bilibili-user', 'github-user', 'custom-json')),
  draft_config jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  current_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.card_versions (
  card_id text not null references public.cards(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  primary key (card_id, version)
);

alter table public.cards enable row level security;
alter table public.card_versions enable row level security;

create policy "owners can read cards"
  on public.cards for select
  using (owner_id = auth.uid());

create policy "owners can create cards"
  on public.cards for insert
  with check (owner_id = auth.uid());

create policy "owners can update cards"
  on public.cards for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners can delete cards"
  on public.cards for delete
  using (owner_id = auth.uid());

create policy "owners can read versions"
  on public.card_versions for select
  using (
    exists (
      select 1 from public.cards
      where cards.id = card_versions.card_id
        and cards.owner_id = auth.uid()
    )
  );

create policy "owners can publish versions"
  on public.card_versions for insert
  with check (
    exists (
      select 1 from public.cards
      where cards.id = card_versions.card_id
        and cards.owner_id = auth.uid()
    )
  );

create or replace function public.publish_card(target_card_id text)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_version integer;
  target_snapshot jsonb;
begin
  select draft_config
    into target_snapshot
    from public.cards
    where id = target_card_id and owner_id = auth.uid()
    for update;

  if target_snapshot is null then
    raise exception 'card not found or access denied';
  end if;

  select coalesce(max(version), 0) + 1
    into next_version
    from public.card_versions
    where card_id = target_card_id;

  insert into public.card_versions(card_id, version, snapshot)
  values (target_card_id, next_version, target_snapshot);

  update public.cards
    set status = 'published',
        current_version = next_version,
        updated_at = now()
    where id = target_card_id and owner_id = auth.uid();

  return next_version;
end;
$$;

create or replace function public.prevent_version_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'published card versions are immutable';
end;
$$;

drop trigger if exists card_versions_are_immutable on public.card_versions;
create trigger card_versions_are_immutable
before update on public.card_versions
for each row execute function public.prevent_version_mutation();
