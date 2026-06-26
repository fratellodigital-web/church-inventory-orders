// Cart + selected igreja persisted in localStorage.
import { useEffect, useState, useCallback } from "react";

export interface CartItem {
  produto_id: string;
  nome: string;
  unidade: string;
  preco: number;
  quantidade: number;
  estoque_disponivel: number;
}

const CART_KEY = "fb_cart";
const IGREJA_KEY = "fb_igreja";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

export interface IgrejaSelecionada {
  id: string;
  nome: string;
  cidade: string | null;
}

export function useIgrejaSelecionada() {
  const [igreja, setIgreja] = useState<IgrejaSelecionada | null>(() => read(IGREJA_KEY, null));
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === IGREJA_KEY) setIgreja(read(IGREJA_KEY, null));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  const select = useCallback((ig: IgrejaSelecionada | null) => {
    if (ig) write(IGREJA_KEY, ig);
    else if (typeof window !== "undefined") {
      localStorage.removeItem(IGREJA_KEY);
      window.dispatchEvent(new StorageEvent("storage", { key: IGREJA_KEY }));
    }
    setIgreja(ig);
  }, []);
  return { igreja, select };
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => read(CART_KEY, []));
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === CART_KEY) setItems(read(CART_KEY, []));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    write(CART_KEY, next);
    setItems(next);
  }, []);

  const add = useCallback(
    (item: Omit<CartItem, "quantidade">, qty = 1) => {
      const current = read<CartItem[]>(CART_KEY, []);
      const existing = current.find((c) => c.produto_id === item.produto_id);
      let next: CartItem[];
      if (existing) {
        const newQty = Math.min(existing.quantidade + qty, item.estoque_disponivel);
        next = current.map((c) =>
          c.produto_id === item.produto_id ? { ...c, quantidade: newQty, estoque_disponivel: item.estoque_disponivel } : c,
        );
      } else {
        next = [...current, { ...item, quantidade: Math.min(qty, item.estoque_disponivel) }];
      }
      persist(next);
    },
    [persist],
  );

  const setQty = useCallback(
    (produto_id: string, quantidade: number) => {
      const current = read<CartItem[]>(CART_KEY, []);
      const next = current
        .map((c) =>
          c.produto_id === produto_id
            ? { ...c, quantidade: Math.max(0, Math.min(quantidade, c.estoque_disponivel)) }
            : c,
        )
        .filter((c) => c.quantidade > 0);
      persist(next);
    },
    [persist],
  );

  const remove = useCallback(
    (produto_id: string) => {
      const current = read<CartItem[]>(CART_KEY, []);
      persist(current.filter((c) => c.produto_id !== produto_id));
    },
    [persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const totalItens = items.reduce((s, i) => s + i.quantidade, 0);
  const totalValor = items.reduce((s, i) => s + i.quantidade * (i.preco ?? 0), 0);

  return { items, add, setQty, remove, clear, totalItens, totalValor };
}
