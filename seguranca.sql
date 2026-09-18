-- IAIÁ BISTRÔ — reforço de segurança do ADM
-- Execute depois do SQL inicial.
-- Somente o e-mail do proprietário poderá alterar os dados pelo painel.

-- Remove as políticas administrativas amplas criadas no primeiro SQL.
drop policy if exists "Authenticated users manage restaurants" on public.restaurants;
drop policy if exists "Authenticated users manage categories" on public.categories;
drop policy if exists "Authenticated users manage menu items" on public.menu_items;
drop policy if exists "Authenticated users manage menu images" on public.menu_item_images;
drop policy if exists "Authenticated users manage reservations" on public.reservations;
drop policy if exists "Authenticated users manage reviews" on public.reviews;
drop policy if exists "Authenticated users manage settings" on public.site_settings;

create policy "Owner manages restaurants" on public.restaurants
for all to authenticated
using ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com')
with check ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com');

create policy "Owner manages categories" on public.categories
for all to authenticated
using ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com')
with check ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com');

create policy "Owner manages menu items" on public.menu_items
for all to authenticated
using ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com')
with check ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com');

create policy "Owner manages menu images" on public.menu_item_images
for all to authenticated
using ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com')
with check ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com');

create policy "Owner manages reservations" on public.reservations
for all to authenticated
using ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com')
with check ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com');

create policy "Owner manages reviews" on public.reviews
for all to authenticated
using ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com')
with check ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com');

create policy "Owner manages settings" on public.site_settings
for all to authenticated
using ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com')
with check ((auth.jwt() ->> 'email') = 'iaiabistro97@gmail.com');
