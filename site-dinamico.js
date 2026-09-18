/* IAIÁ BISTRÔ — sincronização do site público com o ADM/Supabase */
(() => {
  "use strict";

  const CONFIG_URL = "/admin/config.js";
  let db;

  const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  }[c]));

  const money = (value) => Number(value || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL"
  });

  async function getConfig() {
    if (window.IAIA_SUPABASE?.url && window.IAIA_SUPABASE?.anonKey) {
      return window.IAIA_SUPABASE;
    }
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = CONFIG_URL;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.IAIA_SUPABASE;
  }

  function setWhatsApp(number) {
    if (!number) return;
    const clean = String(number).replace(/\D/g, "");
    document.querySelectorAll('a[href*="wa.me/"]').forEach((a) => {
      const current = a.href;
      const query = current.includes("?") ? current.slice(current.indexOf("?")) : "";
      a.href = `https://wa.me/${clean}${query}`;
    });
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((el) => {
      if (value !== null && value !== undefined && value !== "") el.textContent = value;
    });
  }

  function setLinks(selector, url) {
    if (!url) return;
    document.querySelectorAll(selector).forEach((a) => a.href = url);
  }

  function reservationSection() {
    if (document.getElementById("reservar-online")) return;

    const finalCta = document.querySelector(".final-cta");
    if (!finalCta) return;

    const section = document.createElement("section");
    section.id = "reservar-online";
    section.className = "section cream";
    section.innerHTML = `
      <div class="container" style="max-width:900px">
        <div style="text-align:center;margin-bottom:38px">
          <p class="eyebrow dark">RESERVAS</p>
          <h2 style="margin:0;font-size:clamp(2.8rem,6vw,5.5rem);line-height:.95;font-weight:500">Reserve sua <em>mesa.</em></h2>
          <p style="max-width:620px;margin:22px auto 0;line-height:1.7;color:#5f5a50">
            Envie sua solicitação. A equipe do IAIÁ BISTRÔ poderá confirmar o atendimento pelo telefone informado.
          </p>
        </div>
        <form id="publicReservationForm" style="display:grid;gap:16px;max-width:700px;margin:auto">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <label style="font:11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase">
              Nome
              <input id="resName" required maxlength="120" autocomplete="name"
                style="display:block;width:100%;margin-top:8px;padding:15px;border:1px solid rgba(17,16,15,.2);background:#faf9f4;border-radius:8px;font:15px Georgia,serif">
            </label>
            <label style="font:11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase">
              WhatsApp / telefone
              <input id="resPhone" required maxlength="30" autocomplete="tel"
                style="display:block;width:100%;margin-top:8px;padding:15px;border:1px solid rgba(17,16,15,.2);background:#faf9f4;border-radius:8px;font:15px Georgia,serif">
            </label>
          </div>
          <label style="font:11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase">
            E-mail (opcional)
            <input id="resEmail" type="email" maxlength="254" autocomplete="email"
              style="display:block;width:100%;margin-top:8px;padding:15px;border:1px solid rgba(17,16,15,.2);background:#faf9f4;border-radius:8px;font:15px Georgia,serif">
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <label style="font:11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase">
              Data
              <input id="resDate" type="date" required
                style="display:block;width:100%;margin-top:8px;padding:15px;border:1px solid rgba(17,16,15,.2);background:#faf9f4;border-radius:8px;font:15px Georgia,serif">
            </label>
            <label style="font:11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase">
              Horário
              <input id="resTime" type="time" required
                style="display:block;width:100%;margin-top:8px;padding:15px;border:1px solid rgba(17,16,15,.2);background:#faf9f4;border-radius:8px;font:15px Georgia,serif">
            </label>
          </div>
          <label style="font:11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase">
            Pessoas
            <input id="resGuests" type="number" min="1" max="30" value="2" required
              style="display:block;width:100%;margin-top:8px;padding:15px;border:1px solid rgba(17,16,15,.2);background:#faf9f4;border-radius:8px;font:15px Georgia,serif">
          </label>
          <label style="font:11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase">
            Observações
            <textarea id="resNotes" rows="4" maxlength="1000"
              style="display:block;width:100%;margin-top:8px;padding:15px;border:1px solid rgba(17,16,15,.2);background:#faf9f4;border-radius:8px;font:15px Georgia,serif"></textarea>
          </label>
          <button type="submit" class="button button-dark" style="border:0;cursor:pointer">Enviar solicitação de reserva</button>
          <p id="reservationMessage" role="status" style="margin:0;text-align:center;font:13px/1.6 Arial,sans-serif"></p>
        </form>
      </div>`;

    finalCta.parentNode.insertBefore(section, finalCta);

    const date = section.querySelector("#resDate");
    const today = new Date();
    date.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    section.querySelector("#publicReservationForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = section.querySelector("#reservationMessage");
      message.textContent = "Enviando...";
      const payload = {
        customer_name: section.querySelector("#resName").value.trim(),
        phone: section.querySelector("#resPhone").value.trim(),
        email: section.querySelector("#resEmail").value.trim() || null,
        reservation_date: date.value,
        reservation_time: section.querySelector("#resTime").value,
        guests: Number(section.querySelector("#resGuests").value),
        notes: section.querySelector("#resNotes").value.trim() || null,
        status: "pending"
      };

      const { error } = await db.from("reservations").insert(payload);
      if (error) {
        console.error(error);
        message.textContent = "Não foi possível enviar agora. Tente novamente ou fale conosco pelo WhatsApp.";
        return;
      }

      message.textContent = "Solicitação enviada! A equipe do IAIÁ BISTRÔ entrará em contato para confirmar.";
      event.target.reset();
      section.querySelector("#resGuests").value = 2;
    });
  }

  async function syncSite() {
    const cfg = await getConfig();
    if (!cfg?.url || !cfg?.anonKey || !window.supabase) return;

    db = window.supabase.createClient(cfg.url, cfg.anonKey);

    const [{ data: restaurant }, { data: settingRows }, { data: featured }, { data: reviews }] =
      await Promise.all([
        db.from("restaurants").select("*").limit(1).maybeSingle(),
        db.from("site_settings").select("key,value"),
        db.from("menu_items").select("id,name,description,price,sort_order,categories(name)").eq("active", true).eq("featured", true).order("sort_order").limit(4),
        db.from("reviews").select("customer_name,rating,comment,external_url").eq("published", true).order("created_at", { ascending: false }).limit(3)
      ]);

    if (restaurant) {
      setWhatsApp(restaurant.whatsapp || restaurant.phone);

      const address = restaurant.address;
      document.querySelectorAll("address").forEach((el) => {
        if (address) el.innerHTML = esc(address).replace(/ - /g, "<br>");
      });

      if (restaurant.description) {
        const candidates = document.querySelectorAll(".manifesto-inner > p:last-child, .section-copy p");
        if (candidates.length) candidates[candidates.length - 1].textContent = restaurant.description;
      }

      if (restaurant.google_maps_url) {
        setLinks('a[data-track="click_location"]', restaurant.google_maps_url);
      }

      if (restaurant.instagram_url) {
        document.querySelectorAll('a[href*="instagram.com"]').forEach((a) => a.href = restaurant.instagram_url);
      }

      if (restaurant.hero_video_url) {
        const video = document.querySelector(".hero-video");
        if (video) {
          video.querySelectorAll("source").forEach((s) => s.remove());
          const source = document.createElement("source");
          source.src = restaurant.hero_video_url;
          source.type = "video/mp4";
          video.appendChild(source);
          video.load();
        }
      }

      if (restaurant.hero_image_url) {
        document.querySelectorAll(".hero-video").forEach((v) => v.poster = restaurant.hero_image_url);
      }

      if (restaurant.name) {
        document.querySelectorAll(".brand-name").forEach((el) => el.textContent = restaurant.name);
      }
    }

    const settings = Object.fromEntries((settingRows || []).map((r) => [r.key, r.value]));
    if (settings.google_rating) {
      const rating = Number(settings.google_rating.rating || 0);
      const count = Number(settings.google_rating.reviews || 0);
      const ratingTitle = document.querySelector(".review-top h2");
      if (ratingTitle) ratingTitle.innerHTML = `${rating.toLocaleString("pt-BR")} <span>★★★★★</span>`;
      const ratingCount = document.querySelector(".review-top p:last-child");
      if (ratingCount) ratingCount.textContent = `${count} avaliações no Google`;
    }

    if (featured?.length) {
      const grid = document.querySelector(".dish-grid");
      if (grid) {
        grid.innerHTML = featured.map((item, index) => `
          <article class="dish-card reveal">
            <div class="dish-number">${String(index + 1).padStart(2, "0")}</div>
            <div><h3>${esc(item.name)}</h3><p>${esc(item.description || "")}</p></div>
            <strong>${money(item.price)}</strong>
          </article>`).join("");
      }
    }

    if (reviews?.length) {
      const grid = document.querySelector(".review-grid");
      if (grid) {
        grid.innerHTML = reviews.map((r) => `
          <blockquote class="review-card">
            <span>${"★".repeat(Math.max(0, Math.min(5, Number(r.rating) || 0)))}${"☆".repeat(5 - Math.max(0, Math.min(5, Number(r.rating) || 0)))}</span>
            <p>${esc(r.comment || "")}</p>
            <footer>— ${esc(r.customer_name)}</footer>
          </blockquote>`).join("");
      }
    }

    reservationSection();
  }

  document.addEventListener("DOMContentLoaded", () => {
    syncSite().catch((error) => console.error("IAIÁ sincronização:", error));
  });
})();
