(() => {
  'use strict';

  const cfg = window.IAIA_SUPABASE || {};
  const supabaseLib = window.supabase;

  const $ = id => document.getElementById(id);

  let sb = null;
  let categories = [];
  let items = [];

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function attr(value) {
    return esc(value);
  }

  function money(value) {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function slugify(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function normalizeWhatsapp(value) {
    let number = String(value || '').replace(/\D/g, '');

    if (!number) return '';

    if (!number.startsWith('55')) {
      number = '55' + number;
    }

    return number;
  }

  function formatWhatsapp(value) {
    const n = normalizeWhatsapp(value);

    if (n.length === 13) {
      return `55 (${n.slice(2, 4)}) ${n.slice(4, 9)}-${n.slice(9)}`;
    }

    return value || '';
  }

  function showError(message) {
    if ($('loginError')) {
      $('loginError').textContent = message || '';
    }
  }

  function openModal(html) {
    $('modalContent').innerHTML = html;
    $('modal').classList.remove('hidden');
  }

  function closeModal() {
    $('modal').classList.add('hidden');
    $('modalContent').innerHTML = '';
  }

  function go(section) {
    document.querySelectorAll('.page-section').forEach(el => {
      el.classList.remove('active-section');
    });

    const page = $(section);

    if (page) {
      page.classList.add('active-section');
    }

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle(
        'active',
        el.dataset.section === section
      );
    });

    const titles = {
      dashboard: 'Visão geral',
      cardapio: 'Cardápio',
      reservas: 'Reservas',
      avaliacoes: 'Avaliações',
      configuracoes: 'Configurações'
    };

    if ($('pageTitle')) {
      $('pageTitle').textContent = titles[section] || section;
    }

    if (section === 'cardapio') loadMenu();
    if (section === 'reservas') loadReservations();
    if (section === 'avaliacoes') loadReviews();
    if (section === 'configuracoes') loadRestaurant();
  }

  async function init() {
    if (
      !supabaseLib ||
      !cfg.url ||
      !cfg.anonKey ||
      String(cfg.anonKey).startsWith('COLE_')
    ) {
      showError(
        'Configure a chave pública do Supabase em /admin/config.js.'
      );
      return;
    }

    sb = supabaseLib.createClient(
      cfg.url,
      cfg.anonKey
    );

    const { data, error } = await sb.auth.getSession();

    if (error) {
      showError(error.message);
      return;
    }

    if (data.session) {
      await enter(data.session);
    } else {
      $('loginView').classList.remove('hidden');
    }

    sb.auth.onAuthStateChange((_event, session) => {
      if (session) {
        enter(session);
      }
    });
  }

  async function enter(session) {
    $('loginView').classList.add('hidden');
    $('appView').classList.remove('hidden');

    if ($('userEmail')) {
      $('userEmail').textContent =
        session.user.email || '';
    }

    await loadDashboard();
  }

  async function login(e) {
    e.preventDefault();

    showError('');

    const email = $('email').value.trim();
    const password = $('password').value;

    const { error } =
      await sb.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      showError(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha inválidos.'
          : error.message
      );
    }
  }

  async function logout() {
    await sb.auth.signOut();

    $('appView').classList.add('hidden');
    $('loginView').classList.remove('hidden');
  }

  async function loadDashboard() {
    const [
      menu,
      cats,
      reservations,
      reviews
    ] = await Promise.all([
      sb.from('menu_items')
        .select('id', {
          count: 'exact',
          head: true
        })
        .eq('active', true),

      sb.from('categories')
        .select('id', {
          count: 'exact',
          head: true
        })
        .eq('active', true),

      sb.from('reservations')
        .select('id', {
          count: 'exact',
          head: true
        })
        .eq('status', 'pending'),

      sb.from('reviews')
        .select('id', {
          count: 'exact',
          head: true
        })
        .eq('published', true)
    ]);

    if ($('statItems'))
      $('statItems').textContent = menu.count ?? 0;

    if ($('statCategories'))
      $('statCategories').textContent = cats.count ?? 0;

    if ($('statReservations'))
      $('statReservations').textContent =
        reservations.count ?? 0;

    if ($('statReviews'))
      $('statReviews').textContent =
        reviews.count ?? 0;
  }

  async function loadCategories() {
    const { data, error } =
      await sb.from('categories')
        .select('*')
        .order('sort_order', {
          ascending: true
        })
        .order('name', {
          ascending: true
        });

    if (error) {
      alert(error.message);
      return;
    }

    categories = data || [];

    const select = $('categoryFilter');

    if (!select) return;

    const current = select.value || '';

  
    if (
      categories.some(
        cat => String(cat.id) === String(current)
      )
    ) {
      select.value = current;
    } else {
      select.value = '';
    }
  }

  async function loadMenu() {
    await loadCategories();

    const { data, error } =
      await sb.from('menu_items')
        .select('*, categories(name)')
        .order('sort_order', {
          ascending: true
        })
        .order('name', {
          ascending: true
        });

    if (error) {
      $('menuList').innerHTML =
        `<p class="error">${esc(error.message)}</p>`;
      return;
    }

    items = data || [];

    renderMenu();
  }

  function renderMenu() {
    const list = $('menuList');

    if (!list) return;

    const selected =
      $('categoryFilter')?.value || '';

   const filtered = selected
  ? items.filter(item =>
      String(item.categories?.name || '').trim().toLowerCase() ===
      String(selected).trim().toLowerCase()
    )
  : items;

    if (!filtered.length) {
      list.innerHTML =
        '<div style="padding:30px">Nenhum prato encontrado.</div>';
      return;
    }

    list.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Prato</th>
            <th>Categoria</th>
            <th>Preço</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          ${filtered.map(item => `
            <tr>
              <td>
                <strong>${esc(item.name)}</strong><br>
                <small>${esc(item.description || '')}</small>
              </td>

              <td>
                ${esc(item.categories?.name || '—')}
              </td>

              <td>
                ${money(item.price)}
              </td>

              <td>
                <span class="status">
                  ${item.active ? 'Ativo' : 'Oculto'}
                </span>
              </td>

              <td>
                <div class="actions">

                  <button
                    type="button"
                    class="mini"
                    data-edit="${attr(item.id)}">
                    Editar
                  </button>

                  <button
                    type="button"
                    class="mini"
                    data-toggle="${attr(item.id)}">
                    ${item.active ? 'Ocultar' : 'Ativar'}
                  </button>

                  <button
                    type="button"
                    class="mini danger"
                    data-delete="${attr(item.id)}">
                    Excluir
                  </button>

                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    list.querySelectorAll('[data-edit]').forEach(button => {
      button.onclick = () =>
        editItem(button.dataset.edit);
    });

    list.querySelectorAll('[data-toggle]').forEach(button => {
      button.onclick = () =>
        toggleItem(button.dataset.toggle);
    });

    list.querySelectorAll('[data-delete]').forEach(button => {
      button.onclick = () =>
        deleteItem(button.dataset.delete);
    });
  }

  function newCategory() {
    openModal(`
      <h3>Nova categoria</h3>

      <form id="catForm" class="modal-form">

        <label>
          Nome
          <input id="catName" required>
        </label>

        <label>
          Descrição
          <textarea id="catDesc" rows="3"></textarea>
        </label>

        <div class="modal-actions">
          <button
            type="button"
            class="secondary"
            id="cancel">
            Cancelar
          </button>

          <button class="primary">
            Criar categoria
          </button>
        </div>

      </form>
    `);

    $('cancel').onclick = closeModal;

    $('catForm').onsubmit = async e => {
      e.preventDefault();

      const name = $('catName').value.trim();

      if (!name) return;

      const { error } =
        await sb.from('categories').insert({
          name,
          slug: slugify(name),
          description:
            $('catDesc').value.trim(),
          sort_order:
            categories.length + 1,
          active: true
        });

      if (error) {
        alert(error.message);
        return;
      }

      closeModal();

      await loadMenu();
      await loadDashboard();
    };
  }

  function editItem(id) {
    const existing =
      items.find(
        item => String(item.id) === String(id)
      );

    const item = existing || {
      name: '',
      description: '',
      price: '',
      category_id: categories[0]?.id || '',
      active: true,
      featured: false,
      sort_order: 0,
      image_url: ''
    };

    openModal(`
      <h3>
        ${id ? 'Editar prato' : 'Novo prato'}
      </h3>

      <form id="itemForm" class="modal-form">

        <label>
          Nome
          <input
            id="itemName"
            value="${attr(item.name)}"
            required>
        </label>

        <label>
          Descrição
          <textarea
            id="itemDesc"
            rows="4">${esc(item.description || '')}</textarea>
        </label>

        <div class="row">

          <label>
            Preço
            <input
              id="itemPrice"
              type="number"
              step="0.01"
              min="0"
              value="${attr(item.price ?? '')}">
          </label>

          <label>
            Categoria
            <select id="itemCat">
              ${categories.map(cat => `
                <option
                  value="${attr(cat.id)}"
                  ${String(cat.id) === String(item.category_id)
                    ? 'selected'
                    : ''}>
                  ${esc(cat.name)}
                </option>
              `).join('')}
            </select>
          </label>

        </div>

        <div class="row">

          <label>
            Ordem
            <input
              id="itemOrder"
              type="number"
              value="${Number(item.sort_order) || 0}">
          </label>

          <label>
            Imagem (URL)
            <input
              id="itemImage"
              value="${attr(item.image_url || '')}"
              placeholder="https://...">
          </label>

        </div>

        <div class="modal-actions">

          <button
            type="button"
            class="secondary"
            id="cancel">
            Cancelar
          </button>

          <button class="primary">
            ${id ? 'Salvar alterações' : 'Criar prato'}
          </button>

        </div>

      </form>
    `);

    $('cancel').onclick = closeModal;

    $('itemForm').onsubmit = async e => {
      e.preventDefault();

      const payload = {
        name:
          $('itemName').value.trim(),

        slug:
          slugify($('itemName').value),

        description:
          $('itemDesc').value.trim(),

        price:
          $('itemPrice').value
            ? Number($('itemPrice').value)
            : null,

        category_id:
          $('itemCat').value || null,

        sort_order:
          Number($('itemOrder').value) || 0,

        image_url:
          $('itemImage').value.trim() || null,

        active:
          item.active !== false,

        featured:
          item.featured === true
      };

      const result = id
        ? await sb.from('menu_items')
            .update(payload)
            .eq('id', id)
        : await sb.from('menu_items')
            .insert(payload);

      if (result.error) {
        alert(result.error.message);
        return;
      }

      closeModal();

      await loadMenu();
      await loadDashboard();
    };
  }

  async function toggleItem(id) {
    const item =
      items.find(
        x => String(x.id) === String(id)
      );

    if (!item) return;

    const { error } =
      await sb.from('menu_items')
        .update({
          active: !item.active
        })
        .eq('id', id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadMenu();
    await loadDashboard();
  }

  async function deleteItem(id) {
    if (!confirm(
      'Excluir este prato permanentemente?'
    )) return;

    const { error } =
      await sb.from('menu_items')
        .delete()
        .eq('id', id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadMenu();
    await loadDashboard();
  }

  async function loadReservations() {
    const { data, error } =
      await sb.from('reservations')
        .select('*')
        .order('reservation_date', {
          ascending: true
        })
        .order('reservation_time', {
          ascending: true
        });

    if (error) {
      $('reservationsList').innerHTML =
        `<p class="error">${esc(error.message)}</p>`;
      return;
    }

    if (!data?.length) {
      $('reservationsList').innerHTML =
        '<div style="padding:30px">Nenhuma reserva cadastrada.</div>';
      return;
    }

    $('reservationsList').innerHTML = `
      <table class="table">

        <thead>
          <tr>
            <th>Cliente</th>
            <th>Data</th>
            <th>Horário</th>
            <th>Pessoas</th>
            <th>Status</th>
            <th>Observações</th>
            <th>Ação</th>
          </tr>
        </thead>

        <tbody>

          ${data.map(r => `
            <tr>

              <td>
                <strong>${esc(r.customer_name)}</strong><br>
                ${esc(r.phone)}
              </td>

              <td>
                ${formatDate(r.reservation_date)}
              </td>

              <td>
                ${esc(
                  String(r.reservation_time || '')
                    .slice(0, 5)
                )}
              </td>

              <td>
                ${esc(r.guests)}
              </td>

              <td>

                <select
                  class="res-status"
                  data-id="${attr(r.id)}">

                  <option value="pending"
                    ${r.status === 'pending' ? 'selected' : ''}>
                    Pendente
                  </option>

                  <option value="confirmed"
                    ${r.status === 'confirmed' ? 'selected' : ''}>
                    Confirmada
                  </option>

                  <option value="cancelled"
                    ${r.status === 'cancelled' ? 'selected' : ''}>
                    Cancelada
                  </option>

                  <option value="completed"
                    ${r.status === 'completed' ? 'selected' : ''}>
                    Concluída
                  </option>

                </select>

              </td>

              <td>
                ${r.notes ? esc(r.notes) : '—'}
              </td>

              <td>

                <button
                  type="button"
                  class="mini danger"
                  data-res-delete="${attr(r.id)}">
                  Excluir
                </button>

              </td>

            </tr>
          `).join('')}

        </tbody>
      </table>
    `;

    document
      .querySelectorAll('.res-status')
      .forEach(select => {

        select.onchange = async () => {

          const { error } =
            await sb.from('reservations')
              .update({
                status: select.value
              })
              .eq(
                'id',
                select.dataset.id
              );

          if (error) {
            alert(
              'Não foi possível atualizar: ' +
              error.message
            );
            return;
          }

          await loadDashboard();
        };
      });

    document
      .querySelectorAll('[data-res-delete]')
      .forEach(button => {

        button.onclick = async () => {

          if (!confirm(
            'Excluir esta reserva permanentemente?'
          )) return;

          const id =
            button.dataset.resDelete;

          button.disabled = true;
          button.textContent = 'Excluindo...';

          const { error } =
            await sb.from('reservations')
              .delete()
              .eq('id', id);

          if (error) {
            alert(
              'Não foi possível excluir: ' +
              error.message
            );

            button.disabled = false;
            button.textContent = 'Excluir';
            return;
          }

          await loadReservations();
          await loadDashboard();
        };
      });
  }

  async function loadReviews() {
    const { data, error } =
      await sb.from('reviews')
        .select('*')
        .order('created_at', {
          ascending: false
        });

    if (error) {
      $('reviewsList').innerHTML =
        `<p class="error">${esc(error.message)}</p>`;
      return;
    }

    if (!data?.length) {
      $('reviewsList').innerHTML =
        '<div style="padding:30px">Nenhuma avaliação cadastrada.</div>';
      return;
    }

    $('reviewsList').innerHTML = `
      <table class="table">

        <thead>
          <tr>
            <th>Cliente</th>
            <th>Nota</th>
            <th>Comentário</th>
            <th>Visível</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          ${data.map(r => `
            <tr>

              <td>
                ${esc(r.customer_name)}
              </td>

              <td>
                ${'★'.repeat(Number(r.rating) || 0)}
                ${'☆'.repeat(
                  Math.max(
                    0,
                    5 - Number(r.rating || 0)
                  )
                )}
              </td>

              <td>
                ${esc(r.comment || '')}
              </td>

              <td>
                <span class="status">
                  ${r.published ? 'Publicada' : 'Oculta'}
                </span>
              </td>

              <td>

                <button
                  type="button"
                  class="mini"
                  data-review-toggle="${attr(r.id)}">
                  ${r.published ? 'Ocultar' : 'Publicar'}
                </button>

              </td>

            </tr>
          `).join('')}

        </tbody>
      </table>
    `;

    document
      .querySelectorAll('[data-review-toggle]')
      .forEach(button => {

        button.onclick = async () => {

          const review =
            data.find(
              x =>
                String(x.id) ===
                String(button.dataset.reviewToggle)
            );

          if (!review) return;

          const { error } =
            await sb.from('reviews')
              .update({
                published:
                  !review.published
              })
              .eq('id', review.id);

          if (error) {
            alert(error.message);
            return;
          }

          await loadReviews();
          await loadDashboard();
        };
      });
  }

  function newReview() {
    openModal(`
      <h3>Nova avaliação</h3>

      <form id="reviewForm" class="modal-form">

        <label>
          Nome do cliente
          <input id="rvName" required>
        </label>

        <label>
          Nota
          <select id="rvRating">
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
        </label>

        <label>
          Comentário
          <textarea id="rvComment" rows="4"></textarea>
        </label>

        <label>
          Link da avaliação original
          <input
            id="rvUrl"
            placeholder="https://www.google.com/...">
        </label>

        <div class="modal-actions">

          <button
            type="button"
            class="secondary"
            id="cancel">
            Cancelar
          </button>

          <button class="primary">
            Salvar
          </button>

        </div>

      </form>
    `);

    $('cancel').onclick = closeModal;

    $('reviewForm').onsubmit = async e => {
      e.preventDefault();

      const { error } =
        await sb.from('reviews').insert({
          customer_name:
            $('rvName').value.trim(),

          rating:
            Number($('rvRating').value),

          comment:
            $('rvComment').value.trim(),

          external_url:
            $('rvUrl').value.trim() || null,

          published: false,
          featured: false,
          source: 'google'
        });

      if (error) {
        alert(error.message);
        return;
      }

      closeModal();

      await loadReviews();
      await loadDashboard();
    };
  }

  async function loadRestaurant() {
    const { data, error } =
      await sb.from('restaurants')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (error) {
      $('settingsMessage').textContent =
        error.message;
      return;
    }

    if (!data) {
      $('settingsMessage').textContent =
        'Registro do restaurante não encontrado.';
      return;
    }

    $('rName').value =
      data.name || '';

    $('rWhatsapp').value =
      formatWhatsapp(
        data.whatsapp ||
        data.phone ||
        ''
      );

    $('rAddress').value =
      data.address || '';

    $('rMaps').value =
      data.google_maps_url || '';

    $('rInstagram').value =
      data.instagram_url || '';

    $('rDescription').value =
      data.description || '';

    $('settingsMessage').textContent = '';
  }

  async function saveRestaurant() {
    const { data, error } =
      await sb.from('restaurants')
        .select('id')
        .limit(1)
        .maybeSingle();

    if (error) {
      $('settingsMessage').textContent =
        error.message;
      return;
    }

    if (!data) {
      $('settingsMessage').textContent =
        'Registro do restaurante não encontrado.';
      return;
    }

    const whatsapp =
      normalizeWhatsapp(
        $('rWhatsapp').value
      );

    if (
      whatsapp.length !== 13 ||
      !whatsapp.startsWith('55')
    ) {
      $('settingsMessage').textContent =
        'Digite o WhatsApp no formato: 55 (17) 99702-5497';
      return;
    }

    const result =
      await sb.from('restaurants')
        .update({

          name:
            $('rName').value.trim(),

          whatsapp:
            whatsapp,

          phone:
            whatsapp,

          address:
            $('rAddress').value.trim(),

          google_maps_url:
            $('rMaps').value.trim(),

          instagram_url:
            $('rInstagram').value.trim(),

          description:
            $('rDescription').value.trim()

        })
        .eq('id', data.id);

    if (result.error) {
      $('settingsMessage').textContent =
        result.error.message;
      return;
    }

    $('rWhatsapp').value =
      formatWhatsapp(whatsapp);

    $('settingsMessage').textContent =
      'Alterações salvas com sucesso.';
  }

  function formatDate(value) {
    if (!value) return '—';

    return new Date(
      value + 'T00:00:00'
    ).toLocaleDateString('pt-BR');
  }

  /* LOGIN */
  if ($('loginForm')) {
    $('loginForm').addEventListener(
      'submit',
      login
    );
  }

  /* SAIR */
  if ($('logoutBtn')) {
    $('logoutBtn').addEventListener(
      'click',
      logout
    );
  }

  /* MODAL */
  if ($('closeModal')) {
    $('closeModal').addEventListener(
      'click',
      closeModal
    );
  }

  if ($('modal')) {
    $('modal').addEventListener(
      'click',
      e => {
        if (e.target === $('modal')) {
          closeModal();
        }
      }
    );
  }

  /* MENU */
  document
    .querySelectorAll('.nav-item')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => go(button.dataset.section)
      );
    });

  document
    .querySelectorAll('[data-go]')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => go(button.dataset.go)
      );
    });

  /* FILTRO */
  if ($('categoryFilter')) {
    $('categoryFilter').addEventListener(
      'change',
      renderMenu
    );
  }

  /* NOVA CATEGORIA */
  if ($('newCategoryBtn')) {
    $('newCategoryBtn').addEventListener(
      'click',
      newCategory
    );
  }

  /* NOVO PRATO */
  if ($('newItemBtn')) {
    $('newItemBtn').addEventListener(
      'click',
      () => editItem()
    );
  }

  /* RESERVAS */
  if ($('refreshReservations')) {
    $('refreshReservations').addEventListener(
      'click',
      loadReservations
    );
  }

  /* AVALIAÇÕES */
  if ($('newReviewBtn')) {
    $('newReviewBtn').addEventListener(
      'click',
      newReview
    );
  }

  /* CONFIGURAÇÕES */
  if ($('saveRestaurant')) {
    $('saveRestaurant').addEventListener(
      'click',
      saveRestaurant
    );
  }

  init();

})();
