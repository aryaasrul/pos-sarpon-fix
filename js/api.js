const SUPABASE_URL = 'https://rnohilsczuqdcsquhpmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJub2hpbHNjenVxZGNzcXVocG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MTAzNjgsImV4cCI6MjA2NjQ4NjM2OH0.sQVWH1CBGptOL5xugnKAfLSZbD_10An4rTQVzbFVOvk';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const api = {
  sb,

  // ─── AUTH ────────────────────────────────────────────────────

  async signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await sb.auth.signOut();
  },

  async getSession() {
    const { data: { session } } = await sb.auth.getSession();
    return session;
  },

  // ─── MENU ITEMS ──────────────────────────────────────────────

  async getMenuItems() {
    const { data, error } = await sb
      .from('menu_items')
      .select('*, recipe_ingredients(id, quantity_grams, ingredient:ingredients(*))')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data;
  },

  async getAllMenuItems() {
    const { data, error } = await sb
      .from('menu_items')
      .select('*, recipe_ingredients(id, quantity_grams, ingredient:ingredients(*))')
      .order('name');
    if (error) throw error;
    return data;
  },

  async getMenuItem(id) {
    const { data, error } = await sb
      .from('menu_items')
      .select('*, recipe_ingredients(id, quantity_grams, ingredient:ingredients(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async createMenuItem(menuData) {
    const { recipe_ingredients, ...itemData } = menuData;
    const { data, error } = await sb.from('menu_items').insert(itemData).select().single();
    if (error) throw error;
    if (recipe_ingredients?.length) {
      await api.setRecipeIngredients(data.id, recipe_ingredients);
    }
    return data;
  },

  async updateMenuItem(id, menuData) {
    const { recipe_ingredients, ...itemData } = menuData;
    const { data, error } = await sb.from('menu_items').update(itemData).eq('id', id).select().single();
    if (error) throw error;
    if (recipe_ingredients !== undefined) {
      await api.setRecipeIngredients(id, recipe_ingredients);
    }
    return data;
  },

  async deleteMenuItem(id) {
    await sb.from('recipe_ingredients').delete().eq('menu_item_id', id);
    const { error } = await sb.from('menu_items').delete().eq('id', id);
    if (error) throw error;
  },

  async setRecipeIngredients(menuItemId, ingredients) {
    await sb.from('recipe_ingredients').delete().eq('menu_item_id', menuItemId);
    if (!ingredients.length) return;
    const rows = ingredients.map(i => ({
      menu_item_id: menuItemId,
      ingredient_id: i.ingredient_id,
      quantity_grams: i.quantity_grams,
    }));
    const { error } = await sb.from('recipe_ingredients').insert(rows);
    if (error) throw error;
  },

  // ─── INGREDIENTS ─────────────────────────────────────────────

  async getIngredients() {
    const { data, error } = await sb.from('ingredients').select('*').order('name');
    if (error) throw error;
    return data;
  },

  async getIngredient(id) {
    const { data, error } = await sb.from('ingredients').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async createIngredient(data) {
    const { data: result, error } = await sb.from('ingredients').insert(data).select().single();
    if (error) throw error;
    return result;
  },

  async updateIngredient(id, data) {
    const { data: result, error } = await sb.from('ingredients').update(data).eq('id', id).select().single();
    if (error) throw error;
    return result;
  },

  async deleteIngredient(id) {
    const { error } = await sb.from('ingredients').delete().eq('id', id);
    if (error) throw error;
  },

  async updateIngredientStock(ingredientId, grams) {
    const { error } = await sb.rpc('decrement_ingredient_stock', {
      p_ingredient_id: ingredientId,
      p_grams: grams,
    });
    if (error) throw error;
  },

  // ─── BOOKS ───────────────────────────────────────────────────

  async getBooks() {
    const { data, error } = await sb.from('books').select('*').order('title');
    if (error) throw error;
    return data;
  },

  async getBook(id) {
    const { data, error } = await sb.from('books').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async createBook(data) {
    const { data: result, error } = await sb.from('books').insert(data).select().single();
    if (error) throw error;
    return result;
  },

  async updateBook(id, data) {
    const { data: result, error } = await sb.from('books').update(data).eq('id', id).select().single();
    if (error) throw error;
    return result;
  },

  async deleteBook(id) {
    const { error } = await sb.from('books').delete().eq('id', id);
    if (error) throw error;
  },

  async decrementBookStock(bookId, qty) {
    const { error } = await sb.rpc('decrement_book_stock', {
      p_book_id: bookId,
      p_qty: qty,
    });
    if (error) throw error;
  },

  // ─── TRANSACTIONS ─────────────────────────────────────────────

  async getTransactions(startDate, endDate, page = 0, limit = 20) {
    const from = page * limit;
    const to   = from + limit - 1;
    const { data, error, count } = await sb
      .from('transactions')
      .select('*, transaction_items(*)', { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { data, count };
  },

  async createTransaction(txData, items) {
    const txCode = 'TRX-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Date.now();
    const { data: tx, error: txErr } = await sb
      .from('transactions')
      .insert({ ...txData, transaction_code: txCode })
      .select()
      .single();
    if (txErr) throw txErr;
    const rows = items.map(item => ({ ...item, transaction_id: tx.id }));
    const { error: itemsErr } = await sb.from('transaction_items').insert(rows);
    if (itemsErr) throw itemsErr;
    return tx;
  },

  // ─── EXPENSES ─────────────────────────────────────────────────

  async getExpenses(startDate, endDate, page = 0, limit = 20) {
    const from = page * limit;
    const to   = from + limit - 1;
    const { data, error, count } = await sb
      .from('expenses')
      .select('*', { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { data, count };
  },

  async createExpenses(items) {
    const { error } = await sb.from('expenses').insert(items);
    if (error) throw error;
  },

  // ─── SALDO ────────────────────────────────────────────────────

  async getBalance() {
    const [{ data: txItems }, { data: expenses }] = await Promise.all([
      sb.from('transaction_items').select('total_price'),
      sb.from('expenses').select('amount'),
    ]);
    const income  = (txItems  || []).reduce((s, i) => s + Number(i.total_price), 0);
    const expense = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);
    return income - expense;
  },

  // ─── KALKULASI HARGA (frontend) ───────────────────────────────

  calcMenuPrice(menuItem, ingredient = null, quantityGrams = 0) {
    const fixed   = Number(menuItem.fixed_cost)    || 0;
    const margin  = Number(menuItem.profit_margin) || 0;
    const rounding = Number(menuItem.rounding_up)  || 1000;

    let hpp = fixed;
    if (ingredient && quantityGrams > 0) {
      hpp += (Number(ingredient.purchase_price) * quantityGrams) / Number(ingredient.pack_size_grams);
    }

    const sell = Math.ceil(hpp * (1 + margin) / rounding) * rounding;
    return { hpp, sell };
  },
};
