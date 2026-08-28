-- AutoPilotLog / 智驾日记 v0.2 security hardening
-- Public views must respect the caller's RLS policies.

alter view public.public_trips set (security_invoker = true);
alter view public.public_release_stats set (security_invoker = true);
