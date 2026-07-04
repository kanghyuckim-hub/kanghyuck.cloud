-- 구글 OAuth 로그인 회원 기본정보 + 권한(role) 테이블

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,       -- Google ID 토큰의 sub (고유 식별자)
  email text not null unique,
  email_verified boolean not null default false,
  name text,
  given_name text,
  family_name text,
  picture text,
  locale text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_roles (
  user_id uuid primary key references users(id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  updated_at timestamptz not null default now()
);

-- updated_at 자동 갱신 트리거
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

drop trigger if exists trg_user_roles_updated_at on user_roles;
create trigger trg_user_roles_updated_at
  before update on user_roles
  for each row execute function set_updated_at();

-- 신규 유저 생성 시 기본 role('user') 자동 부여
create or replace function create_default_user_role()
returns trigger as $$
begin
  insert into user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_create_default_user_role on users;
create trigger trg_create_default_user_role
  after insert on users
  for each row execute function create_default_user_role();
