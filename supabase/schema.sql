create extension if not exists pgcrypto;

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  created_at timestamptz default now()
);

create table if not exists vouchers (
  code text primary key,
  used boolean default false,
  consumed_at timestamptz
);

create table if not exists ballots (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz default now()
);

create table if not exists ballot_votes (
  ballot_id uuid not null references ballots(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete restrict
);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean default false,
  created_at timestamptz default now()
);

alter table candidates enable row level security;
alter table vouchers enable row level security;
alter table ballots enable row level security;
alter table ballot_votes enable row level security;
alter table profiles enable row level security;

create policy "candidates readable" on candidates for select using (true);
create policy "candidates writable admin" on candidates for all using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.is_admin)
) with check (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.is_admin)
);

create policy "vouchers readable admin" on vouchers for select using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.is_admin)
);
create policy "vouchers insert admin" on vouchers for insert with check (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.is_admin)
);

create policy "ballots readable admin" on ballots for select using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.is_admin)
);
create policy "ballot_votes readable admin" on ballot_votes for select using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.is_admin)
);

create policy "profiles self read" on profiles for select using (user_id = auth.uid());
create policy "profiles admin update" on profiles for update using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.is_admin)
) with check (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.is_admin)
);

create or replace function validate_voucher(voucher_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v boolean;
begin
  select not used into v from vouchers where code = voucher_code;
  if v is null then
    return false;
  end if;
  return v;
end $$;

create or replace function submit_ballot(voucher_code text, candidate_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare already_used boolean;
declare n integer;
declare b uuid;
declare cid uuid;
begin
  select used into already_used from vouchers where code = voucher_code for update;
  if not found then
    raise exception 'Invalid voucher';
  end if;
  if already_used then
    raise exception 'Voucher already used';
  end if;
  n := array_length(candidate_ids, 1);
  if n != 9 then
    raise exception 'Must select exactly 9 candidates';
  end if;
  foreach cid in array candidate_ids loop
    if not exists (select 1 from candidates where id = cid) then
      raise exception 'Invalid candidate id %', cid;
    end if;
  end loop;
  update vouchers set used = true, consumed_at = now() where code = voucher_code;
  b := gen_random_uuid();
  insert into ballots(id, submitted_at) values (b, now());
  foreach cid in array candidate_ids loop
    insert into ballot_votes(ballot_id, candidate_id) values (b, cid);
  end loop;
  return b;
end $$;

create or replace function generate_vouchers(v_count int)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare out_codes text[] := '{}';
declare i int := 0;
declare code text;
begin
  if not exists (select 1 from profiles p where p.user_id = auth.uid() and p.is_admin) then
    raise exception 'Admin only';
  end if;
  while i < v_count loop
    code := upper(substr(encode(gen_random_bytes(10), 'hex'), 1, 10));
    if not exists (select 1 from vouchers where code = code) then
      insert into vouchers(code) values (code);
      out_codes := array_append(out_codes, code);
      i := i + 1;
    end if;
  end loop;
  return out_codes;
end $$;

revoke all on function validate_voucher(text) from public;
revoke all on function submit_ballot(text, uuid[]) from public;
revoke all on function generate_vouchers(int) from public;
grant execute on function validate_voucher(text) to anon, authenticated;
grant execute on function submit_ballot(text, uuid[]) to anon, authenticated;
grant execute on function generate_vouchers(int) to authenticated;
 
create or replace function bootstrap_admin(user_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid;
declare already boolean;
begin
  select exists(select 1 from profiles where is_admin) into already;
  if already then
    return false;
  end if;
  select id into uid from auth.users where email = user_email;
  if uid is null then
    raise exception 'User not found';
  end if;
  insert into profiles(user_id, is_admin) values (uid, true)
  on conflict (user_id) do update set is_admin = true;
  return true;
end $$;

revoke all on function bootstrap_admin(text) from public;
grant execute on function bootstrap_admin(text) to authenticated;
