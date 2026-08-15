import { useEffect, useRef, useState } from 'react';

export interface ProductInfo {
  name: string;
  image?: string;
}

export type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; product: ProductInfo }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

const DEBOUNCE_MS = 500;
const CACHE_PREFIX = 'off:';

/**
 * Шукає товар за штрихкодом в OpenFoodFacts.
 *
 * Що виправлено проти старого `useBarcode`:
 *  - debounce: раніше запит летів на кожне натискання клавіші в полі UPC;
 *  - `AbortController`: раніше повільна відповідь на старий штрихкод перезаписувала
 *    результат нового, а setState міг статися після розмонтування;
 *  - `.catch()`: раніше 404 чи офлайн давали unhandled rejection і вічний спінер;
 *  - `notFound` як окремий стан: OpenFoodFacts не знає нехарчових товарів, і це
 *    нормальна ситуація, а не помилка;
 *  - `fields=` у запиті: тягнемо два потрібні поля замість кількох сотень кілобайт JSON;
 *  - кеш у sessionStorage: повторне сканування того самого товару не йде в мережу.
 */
export function useProductLookup(barcode: string): LookupState {
  const [state, setState] = useState<LookupState>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const code = barcode.trim();
    abortRef.current?.abort();

    // Реальні штрихкоди EAN/UPC — 8-14 цифр. Коротший ввід означає, що користувач
    // ще друкує, і питати про нього API немає сенсу.
    if (!/^\d{8,14}$/.test(code)) {
      setState({ status: 'idle' });
      return;
    }

    const cached = readCache(code);
    if (cached) {
      setState(cached.name ? { status: 'found', product: cached } : { status: 'notFound' });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: 'loading' });

    const timer = setTimeout(() => {
      void lookup(code, controller.signal)
        .then((product) => {
          if (controller.signal.aborted) return;
          writeCache(code, product ?? { name: '' });
          setState(product ? { status: 'found', product } : { status: 'notFound' });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setState({
            status: 'error',
            message:
              error instanceof TypeError
                ? 'Немає зв’язку з базою товарів — заповніть дані вручну'
                : 'Не вдалося отримати дані про товар',
          });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [barcode]);

  return state;
}

async function lookup(code: string, signal: AbortSignal): Promise<ProductInfo | null> {
  const url =
    `https://world.openfoodfacts.org/api/v2/product/${code}.json` +
    `?fields=product_name,product_name_uk,brands,image_front_small_url`;

  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });

  // 404 — товару просто немає в базі. Це очікуваний результат, а не збій.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const body = (await response.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      product_name_uk?: string;
      brands?: string;
      image_front_small_url?: string;
    };
  };

  const product = body.product;
  const name = (product?.product_name_uk || product?.product_name || '').trim();
  if (!product || !name) return null;

  return {
    name: product.brands ? `${name} (${product.brands.split(',')[0]?.trim()})` : name,
    image: product.image_front_small_url,
  };
}

function readCache(code: string): ProductInfo | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + code);
    return raw ? (JSON.parse(raw) as ProductInfo) : null;
  } catch {
    return null; // приватний режим або переповнене сховище — просто йдемо в мережу
  }
}

function writeCache(code: string, product: ProductInfo): void {
  try {
    sessionStorage.setItem(CACHE_PREFIX + code, JSON.stringify(product));
  } catch {
    /* кеш необов'язковий */
  }
}
