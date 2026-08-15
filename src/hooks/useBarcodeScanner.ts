import { useCallback, useEffect, useRef, useState } from 'react';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

export type ScannerStatus = 'idle' | 'starting' | 'running' | 'denied' | 'unsupported' | 'error';

const FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
  'qr_code',
] as const;

interface DetectedBarcode {
  rawValue: string;
}
interface Detector {
  detect(source: CanvasImageSource | Blob): Promise<DetectedBarcode[]>;
}

/**
 * Сканування штрихкоду через нативний `BarcodeDetector`, з поліфілом на ZXing/WASM
 * для Safari та Firefox, які його не мають.
 *
 * Замінює `html5-qrcode`, який не оновлювався роками, сам малював свій DOM у div
 * із фіксованим id і робив другу камеру в діалозі неможливою.
 */
export function useBarcodeScanner(
  active: boolean,
  onDetect: (value: string) => void,
): {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: ScannerStatus;
  error: string | null;
  scanFile: (file: File) => Promise<void>;
} {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Тримаємо колбек у ref, щоб зміна пропа не перезапускала камеру.
  const onDetectRef = useRef(onDetect);
  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  const getDetector = useCallback(async (): Promise<Detector> => {
    if (detectorRef.current) return detectorRef.current;
    const Ctor = await loadDetector();
    detectorRef.current = new Ctor({ formats: [...FORMATS] }) as Detector;
    return detectorRef.current;
  }, []);

  useEffect(() => {
    if (!active) return;

    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;

    const stop = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    void (async () => {
      setStatus('starting');
      setError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setStatus('unsupported');
          setError('Браузер не дає доступу до камери. Введіть штрихкод вручну.');
          return;
        }

        const detector = await getDetector();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true'); // без цього iOS відкриває плеєр на весь екран
        await video.play();
        setStatus('running');

        const tick = async () => {
          if (stopped || !videoRef.current) return;
          if (videoRef.current.readyState >= 2) {
            try {
              const found = await detector.detect(videoRef.current);
              const value = found[0]?.rawValue?.trim();
              if (value) {
                onDetectRef.current(value);
                stop();
                return;
              }
            } catch {
              /* окремий невдалий кадр — не привід зупиняти сканування */
            }
          }
          frame = requestAnimationFrame(() => void tick());
        };
        frame = requestAnimationFrame(() => void tick());
      } catch (err) {
        if (stopped) return;
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setStatus('denied');
          setError('Доступ до камери заборонено. Дозвольте його в налаштуваннях сайту.');
        } else if (name === 'NotFoundError') {
          setStatus('error');
          setError('Камеру не знайдено. Введіть штрихкод вручну.');
        } else {
          setStatus('error');
          setError('Не вдалося запустити камеру. Введіть штрихкод вручну.');
        }
      }
    })();

    // Камера гаситься при закритті діалогу — інакше індикатор запису
    // залишався б увімкненим, поки відкрита вкладка.
    return stop;
  }, [active, getDetector]);

  /** Розпізнавання з фото у галереї — запасний варіант, якщо камера недоступна. */
  const scanFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const detector = await getDetector();
        const found = await detector.detect(file);
        const value = found[0]?.rawValue?.trim();
        if (value) onDetectRef.current(value);
        else setError('На зображенні не знайдено штрихкоду');
      } catch {
        setError('Не вдалося розпізнати зображення');
      }
    },
    [getDetector],
  );

  return { videoRef, status, error, scanFile };
}

type DetectorCtor = new (options: { formats: string[] }) => Detector;

/**
 * Нативний детектор там, де він є (Chrome/Android), інакше — WASM-поліфіл.
 *
 * Поліфіл важить близько мегабайта, тож вантажимо його динамічно і лише за потреби:
 * користувачі Chrome не платять за нього нічим.
 */
async function loadDetector(): Promise<DetectorCtor> {
  const native = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (native) {
    try {
      const supported = await (
        native as unknown as { getSupportedFormats?: () => Promise<string[]> }
      ).getSupportedFormats?.();
      if (!supported || supported.includes('ean_13')) return native;
    } catch {
      /* впав — беремо поліфіл */
    }
  }

  const { BarcodeDetector, setZXingModuleOverrides } = await import('barcode-detector/pure');

  // Без цього zxing тягне свій .wasm із CDN (fastly.jsdelivr.net) прямо в рантаймі —
  // а тоді сканер перестає працювати офлайн, тобто саме там, де він найпотрібніший.
  // `?url` змушує Vite покласти файл у dist і повернути шлях із урахуванням base.
  setZXingModuleOverrides({
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm') ? wasmUrl : prefix + path,
  });

  return BarcodeDetector as unknown as DetectorCtor;
}
